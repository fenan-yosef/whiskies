import pandas as pd
import numpy as np
import os
import sys
from tqdm import tqdm
import torch
import clip
from PIL import Image
import pytesseract
import cv2
import requests
from io import BytesIO
import mysql.connector
import argparse
import traceback

# =========================
# CONFIG
# =========================
embeddings_path = "./embeddings.npy"
ids_path = "./image_ids.npy"
ocr_path = "./ocr_texts.npy"

# =========================
# Load .env (simple, no external dependency)
# =========================
def _load_dotenv(path=".env"):
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as fh:
        for ln in fh:
            ln = ln.strip()
            if not ln or ln.startswith("#"):
                continue
            if "=" not in ln:
                continue
            k, v = ln.split("=", 1)
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v


# =========================
# DB CONNECTION (from env to match Next.js `lib/db.ts`)
# .env is supported; prefer env vars in production
# =========================
_load_dotenv()

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "whisky_db")

if os.getenv("PYTHON_ENV") == "production" and not DB_PASSWORD:
    print("[db] DB_PASSWORD is empty in production. Set it via server env.")

try:
    conn = mysql.connector.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        connection_timeout=10,
    )
except mysql.connector.errors.ProgrammingError as ex:
    print(f"[error] DB connection failed - access denied or bad credentials: {ex}")
    sys.exit(2)
except mysql.connector.errors.InterfaceError as ex:
    print(f"[error] DB connection failed - cannot reach {DB_HOST}:{DB_PORT}: {ex}")
    sys.exit(3)
except Exception as ex:
    print(f"[error] DB connection failed: {ex}")
    sys.exit(4)

query = """
SELECT *
FROM whisky_product_images i
JOIN whisky_products p
ON i.product_id = p.id
"""

df_combined = pd.read_sql(query, conn)

# -------------------------
# Limit handling (CLI arg or env var)
# -------------------------
parser = argparse.ArgumentParser(add_help=False)
parser.add_argument("--limit", type=int, default=None, help="Limit number of rows to process")
args, _ = parser.parse_known_args()
EMBEDDING_LIMIT = args.limit or (int(os.getenv("EMBEDDING_LIMIT")) if os.getenv("EMBEDDING_LIMIT") else None)
if EMBEDDING_LIMIT is not None:
    df_combined = df_combined.head(EMBEDDING_LIMIT)
    print(f"[info] Processing first {EMBEDDING_LIMIT} rows only")

# =========================
# DROP UNNECESSARY COLUMNS
# =========================
df_combined = df_combined.drop(
    columns=["image_url", "all_images", "source", "scraped_at"],
    errors="ignore"
)

df_combined = df_combined.drop(
    columns=["url_x","file_path"],
    errors="ignore"
)

# =========================
# LOAD MODEL
# =========================
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

# =========================
# LOAD PREVIOUS PROGRESS
# =========================
if os.path.exists(embeddings_path) and os.path.exists(ids_path):
    embeddings = list(np.load(embeddings_path, allow_pickle=True))
    image_ids = list(np.load(ids_path, allow_pickle=True))
    ocr_texts = list(np.load(ocr_path, allow_pickle=True)) if os.path.exists(ocr_path) else []
    processed_ids = set(image_ids)
else:
    embeddings = []
    image_ids = []
    ocr_texts = []
    processed_ids = set()

# =========================
# IMAGE LOADER (HYBRID)
# =========================
def _choose_column(columns, candidates):
    for c in candidates:
        if c in columns:
            return c
    return None


def load_image_from_row(row, img_blob_col, url_col):
    try:
        # Priority 1: BLOB
        if img_blob_col and img_blob_col in row and not pd.isna(row[img_blob_col]):
            blob = row[img_blob_col]
            if blob is not None:
                return Image.open(BytesIO(blob)).convert("RGB")

        # Priority 2: URL fallback
        if url_col and url_col in row and not pd.isna(row[url_col]):
            url_val = row[url_col]
            if isinstance(url_val, str) and url_val.strip():
                response = requests.get(url_val, timeout=10)
                response.raise_for_status()
                return Image.open(BytesIO(response.content)).convert("RGB")

    except Exception:
        return None


def _unwrap_scalar(v):
    # If value is a pandas Series or sequence, return its first element
    try:
        if isinstance(v, pd.Series):
            return v.iloc[0]
        # protect bytes/str from being treated as iterable
        if isinstance(v, (bytes, str)):
            return v
        # for numpy arrays or lists
        if hasattr(v, '__iter__') and not isinstance(v, (bytes, str)):
            try:
                return next(iter(v))
            except Exception:
                return v
    except Exception:
        return v
    return v

# =========================
# OCR FUNCTION
# =========================
def extract_text(pil_image):
    try:
        img = np.array(pil_image)
        img = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)

        gray = cv2.threshold(img, 150, 255, cv2.THRESH_BINARY)[1]

        text = pytesseract.image_to_string(gray)
        return text.strip()
    except:
        return ""

# =========================
# EMBEDDING LOOP (robust column access)
# =========================

cols = list(df_combined.columns)
image_id_col = _choose_column(cols, ['id_x', 'id_y', 'id', 'image_id', 'img_id', 'image_id_x', 'image_id_y', 'product_id'])
img_blob_col = _choose_column(cols, ['img_blob', 'img_blob_x', 'img_blob_y', 'blob', 'image_blob'])
url_col = _choose_column(cols, ['url', 'url_x', 'url_y', 'image_url'])

print(f"[info] using image id column: {image_id_col}, blob column: {img_blob_col}, url column: {url_col}")

for _, row in tqdm(df_combined.iterrows(), total=len(df_combined)):
    try:
        # determine image id
        image_id = None
        for cand in [image_id_col, 'id_x', 'id', 'product_id']:
            if cand and cand in row:
                val = _unwrap_scalar(row[cand])
                if pd.isna(val):
                    continue
                try:
                    image_id = int(val)
                except Exception:
                    image_id = val
                break

        if image_id is None:
            # can't determine id for this row, skip
            continue

        if image_id in processed_ids:
            continue

        # Load image (hybrid)
        # unwrap potential Series/array cells for blob/url
        if img_blob_col and img_blob_col in row:
            row_val_blob = _unwrap_scalar(row[img_blob_col])
            row_val_url = _unwrap_scalar(row[url_col]) if url_col and url_col in row else None
            # create a small mapping-like object for loader
            temp_row = {img_blob_col: row_val_blob, url_col: row_val_url}
            image = load_image_from_row(temp_row, img_blob_col, url_col)
        else:
            image = load_image_from_row(row, img_blob_col, url_col)
        if image is None:
            continue

        # Preprocess for CLIP
        image_input = preprocess(image).unsqueeze(0).to(device)

        with torch.no_grad():
            emb = model.encode_image(image_input)
            emb = emb / emb.norm(dim=-1, keepdim=True)

        # OCR
        text = extract_text(image)

        embeddings.append(emb.cpu().numpy())
        image_ids.append(image_id)
        ocr_texts.append(text)

        # Checkpoint
        if len(embeddings) % 100 == 0:
            np.save(embeddings_path, np.array(embeddings, dtype=object))
            np.save(ids_path, np.array(image_ids, dtype=object))
            np.save(ocr_path, np.array(ocr_texts, dtype=object))

    except Exception as e:
        # log full traceback and a small row sample for debugging
        print(f"[warn] embedding row error: {e}")
        print(traceback.format_exc())
        try:
            # show first few columns and their types/values
            sample = {k: (type(row[k]).__name__, str(row[k])[:200]) for k in list(row.index)[:10]}
            print(f"[debug] row sample: {sample}")
        except Exception:
            pass
        continue

# =========================
# FINAL SAVE
# =========================
if len(embeddings) > 0:
    final_embeddings = np.vstack([e for e in embeddings])

    np.save("./final_embeddings.npy", final_embeddings)
    np.save(ids_path, np.array(image_ids, dtype=object))
    np.save(ocr_path, np.array(ocr_texts, dtype=object))

    print(f"[done] saved python/final_embeddings.npy (shape={final_embeddings.shape}) and {ids_path} (count={len(image_ids)})")
else:
    print("[warn] No embeddings were computed; no final_embeddings.npy was written")

conn.close()