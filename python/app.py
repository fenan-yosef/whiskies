import os
import numpy as np
import pandas as pd
import torch
import clip
from PIL import Image, ImageTk
from sklearn.metrics.pairwise import cosine_similarity
import tkinter as tk
from tkinter import filedialog

# -------------------------------
# PATHS
# -------------------------------
BASE_PATH = "./"
IMAGE_FOLDER = os.path.join(BASE_PATH, "whisky_images")

EMBEDDINGS_PATH = os.path.join(BASE_PATH, "final_embeddings.npy")
IDS_PATH = os.path.join(BASE_PATH, "image_ids.npy")

# -------------------------------
# LOAD DATA
# -------------------------------
df_products = pd.read_csv(os.path.join(BASE_PATH, "wine_products.csv"), encoding="latin1")
df_images = pd.read_csv(os.path.join(BASE_PATH, "wine_product_images.csv"), encoding="latin1")

df_combined = df_images.merge(
    df_products,
    left_on="product_id",
    right_on="id",
    how="inner"
)

df_combined = df_combined.drop(
    columns=["image_url", "all_images", "source", "scraped_at"],
    errors="ignore"
)

df_combined = df_combined.drop(
    columns=["url_x", "img_blob", "file_path"],
    errors="ignore"
)

df_combined["image_path"] = df_combined["id_x"].apply(
    lambda x: os.path.join(IMAGE_FOLDER, f"{x}.jpg")
)

df_combined = df_combined[df_combined["image_path"].apply(os.path.exists)]

# -------------------------------
# LOAD MODEL
# -------------------------------
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

# -------------------------------
# LOAD EMBEDDINGS
# -------------------------------
embeddings = np.load(EMBEDDINGS_PATH, allow_pickle=True)
image_ids = np.load(IDS_PATH, allow_pickle=True)

# -------------------------------
# FUNCTIONS
# -------------------------------
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

        # Avoid duplicate products
        if prod_id in seen_products:
            continue

        seen_products.add(prod_id)

        results.append({
            "name": product["name"],
            "abv": product["abv"],
            "volume": product["volume"],
            "image_path": product["image_path"],
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

    # Availability check
    best_score = results[0]["score"]

    if best_score > 0.85:
        status_label.config(text="✅ Product Found", fg="green")
    elif best_score > 0.75:
        status_label.config(text="⚠️ Possible Match", fg="orange")
    else:
        status_label.config(text="❌ Not Found", fg="red")

    # Show results
    for i, res in enumerate(results):
        img = Image.open(res["image_path"]).resize((120, 120))
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
root.title("Whisky Image Matcher")

upload_btn = tk.Button(root, text="Upload Image", command=upload_and_search)
upload_btn.pack(pady=10)

query_label = tk.Label(root)
query_label.pack()

status_label = tk.Label(root, text="", font=("Arial", 14))
status_label.pack(pady=10)

result_frame = tk.Frame(root)
result_frame.pack()

root.mainloop()