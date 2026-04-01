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

# =========================
# CONFIG
# =========================
base_path = "./"
image_folder = base_path + "whisky_images/"

embeddings_path = base_path + "embeddings.npy"
ids_path = base_path + "image_ids.npy"
ocr_path = base_path + "ocr_texts.npy"

os.makedirs(image_folder, exist_ok=True)

# =========================
# LOAD DATA
# =========================
df_products = pd.read_csv(os.path.join(base_path, "wine_products.csv"), encoding="latin1")
df_images = pd.read_csv(os.path.join(base_path, "wine_product_images.csv"), encoding="latin1")

df_combined = df_images.merge(
    df_products,
    left_on="product_id",
    right_on="id",
    how="inner"
)

# Drop unnecessary columns
df_combined = df_combined.drop(
    columns=["image_url", "all_images", "source", "scraped_at"],
    errors="ignore"
)

df_combined = df_combined.drop(
    columns=["url_x", "img_blob", "file_path"],
    errors="ignore"
)

# =========================
# IMAGE DOWNLOAD FUNCTION
# =========================
def download_images(df):
    for i, row in tqdm(df.iterrows(), total=len(df)):
        try:
            url = row["url"]

            if pd.isna(url):
                continue

            filename = f"{row['id_x']}.jpg"
            filepath = os.path.join(image_folder, filename)

            # Skip if already exists
            if os.path.exists(filepath):
                continue

            response = requests.get(url, timeout=10)

            if response.status_code == 200:
                with open(filepath, "wb") as f:
                    f.write(response.content)

        except Exception:
            continue

# =========================
# DOWNLOAD MISSING IMAGES
# =========================
download_images(df_combined)

# =========================
# CREATE IMAGE PATHS
# =========================
df_combined["image_path"] = df_combined["id_x"].apply(
    lambda x: os.path.join(image_folder, f"{x}.jpg")
)

df_combined = df_combined[df_combined["image_path"].apply(os.path.exists)]

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
# OCR FUNCTION
# =========================
def extract_text(image_path):
    try:
        img = cv2.imread(image_path)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        gray = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)[1]

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
        image = preprocess(Image.open(row.image_path)).unsqueeze(0).to(device)

        with torch.no_grad():
            emb = model.encode_image(image)
            emb = emb / emb.norm(dim=-1, keepdim=True)

        text = extract_text(row.image_path)

        embeddings.append(emb.cpu().numpy())
        image_ids.append(row.id_x)
        ocr_texts.append(text)

        # Checkpoint save
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

np.save(base_path + "final_embeddings.npy", final_embeddings)
np.save(ids_path, np.array(image_ids, dtype=object))
np.save(ocr_path, np.array(ocr_texts, dtype=object))