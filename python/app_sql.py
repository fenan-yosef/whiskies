import os
import numpy as np
import pandas as pd
import torch
import clip
from PIL import Image, ImageTk
from sklearn.metrics.pairwise import cosine_similarity
import tkinter as tk
from tkinter import filedialog
import mysql.connector
import io

# -------------------------------
# DB CONFIG
# -------------------------------
DB_CONFIG = {
    "host": "127.0.0.1",
    "user": "root",
    "password": "YOUR_PASSWORD",
    "database": "whisky_db"
}

# -------------------------------
# CONNECT TO DB
# -------------------------------
conn = mysql.connector.connect(**DB_CONFIG)
cursor = conn.cursor(dictionary=True)

# -------------------------------
# LOAD DATA (USING SELECT *)
# -------------------------------
query = """
SELECT *
FROM whisky_product_images i
INNER JOIN whisky_products p
ON i.product_id = p.id
"""

cursor.execute(query)
rows = cursor.fetchall()

df_combined = pd.DataFrame(rows)

# -------------------------------
# DROP ONLY UNWANTED COLUMNS
# -------------------------------
df_combined = df_combined.drop(
    columns=["image_url", "all_images", "source", "scraped_at"],
    errors="ignore"
)

df_combined = df_combined.drop(
    columns=["url_x", "file_path"],
    errors="ignore"
)

# IMPORTANT: KEEP img_blob (do NOT drop)

# -------------------------------
# LOAD MODEL
# -------------------------------
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

# -------------------------------
# LOAD EMBEDDINGS
# -------------------------------
embeddings = np.load("./final_embeddings.npy", allow_pickle=True)
image_ids = np.load("./image_ids.npy", allow_pickle=True)

# -------------------------------
# HELPERS
# -------------------------------
def blob_to_image(blob):
    return Image.open(io.BytesIO(blob))


def get_image_embedding(image_path):
    image = preprocess(Image.open(image_path)).unsqueeze(0).to(device)
    with torch.no_grad():
        emb = model.encode_image(image)
        emb = emb / emb.norm(dim=-1, keepdim=True)
    return emb.cpu().numpy()


def find_most_similar(query_emb, top_k=5):
    sims = cosine_similarity(query_emb, embeddings)[0]
    top_idx = sims.argsort()[::-1][:top_k]
    return [(image_ids[i], sims[i]) for i in top_idx]


def get_product_results(matches):
    results = []
    seen_products = set()

    for pid, score in matches:
        product = df_combined[df_combined['id_x'] == pid].iloc[0]

        prod_id = product["product_id"]

        if prod_id in seen_products:
            continue

        seen_products.add(prod_id)

        results.append({
            "name": product["name"],
            "abv": product["abv"],
            "volume": product["volume"],
            "img_blob": product["img_blob"],   # ✅ using DB blob
            "score": score
        })

        if len(results) == 5:
            break

    return results

# -------------------------------
# UI FUNCTION
# -------------------------------
def upload_and_search():
    file_path = filedialog.askopenfilename(title="Select Whisky Image")

    if not file_path:
        return

    query_emb = get_image_embedding(file_path)
    matches = find_most_similar(query_emb)
    results = get_product_results(matches)

    # Clear previous results
    for widget in result_frame.winfo_children():
        widget.destroy()

    # Show query image
    img = Image.open(file_path).resize((200, 200))
    img_tk = ImageTk.PhotoImage(img)
    query_label.config(image=img_tk)
    query_label.image = img_tk

    # Status
    best_score = results[0]["score"]

    if best_score > 0.85:
        status_label.config(text="✅ Product Found", fg="green")
    elif best_score > 0.75:
        status_label.config(text="⚠️ Possible Match", fg="orange")
    else:
        status_label.config(text="❌ Not Found", fg="red")

    # Show results from DB blob
    for i, res in enumerate(results):
        img = blob_to_image(res["img_blob"]).resize((120, 120))
        img_tk = ImageTk.PhotoImage(img)

        panel = tk.Label(result_frame, image=img_tk)
        panel.image = img_tk
        panel.grid(row=0, column=i)

        text = f"{res['name'][:20]}\nABV: {res['abv']}\nVol: {res['volume']}\nSim: {res['score']:.2f}"
        lbl = tk.Label(result_frame, text=text)
        lbl.grid(row=1, column=i)

# -------------------------------
# UI SETUP
# -------------------------------
root = tk.Tk()
root.title("Whisky Image Matcher (DB Powered)")

upload_btn = tk.Button(root, text="Upload Image", command=upload_and_search)
upload_btn.pack(pady=10)

query_label = tk.Label(root)
query_label.pack()

status_label = tk.Label(root, text="", font=("Arial", 14))
status_label.pack(pady=10)

result_frame = tk.Frame(root)
result_frame.pack()

root.mainloop()