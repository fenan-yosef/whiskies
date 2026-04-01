import pandas as pd
import numpy as np
import os
from tqdm import tqdm
import torch
import clip
from PIL import Image
import pytesseract
import cv2
import requests
from io import BytesIO
import mysql.connector

# =========================
# CONFIG
# =========================
embeddings_path = "./embeddings.npy"
ids_path = "./image_ids.npy"
ocr_path = "./ocr_texts.npy"

# =========================
# DB CONNECTION
# =========================
conn = mysql.connector.connect(
    host="127.0.0.1",
    user="root",
    password="IefCFA0XEyiWqVTPitpGMrIz",
    database="whisky_db"
)

query = """
SELECT *
FROM whisky_product_images i
JOIN whisky_products p
ON i.product_id = p.id
"""

df_combined = pd.read_sql(query, conn)

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
def load_image(row):
    try:
        # Priority 1: BLOB
        if "img_blob" in row and row.img_blob is not None:
            return Image.open(BytesIO(row.img_blob)).convert("RGB")

        # Priority 2: URL fallback
        if "url" in row and row.url:
            response = requests.get(row.url, timeout=10)
            return Image.open(BytesIO(response.content)).convert("RGB")

    except:
        return None

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
# EMBEDDING LOOP
# =========================
for row in tqdm(df_combined.itertuples(), total=len(df_combined)):

    if row.id_x in processed_ids:
        continue

    try:
        # Load image (hybrid)
        image = load_image(row)
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
        image_ids.append(row.id_x)
        ocr_texts.append(text)

        # Checkpoint
        if len(embeddings) % 100 == 0:
            np.save(embeddings_path, np.array(embeddings, dtype=object))
            np.save(ids_path, np.array(image_ids, dtype=object))
            np.save(ocr_path, np.array(ocr_texts, dtype=object))

    except Exception:
        continue

# =========================
# FINAL SAVE
# =========================
final_embeddings = np.vstack([e for e in embeddings])

np.save("./final_embeddings.npy", final_embeddings)
np.save(ids_path, np.array(image_ids, dtype=object))
np.save(ocr_path, np.array(ocr_texts, dtype=object))

conn.close()