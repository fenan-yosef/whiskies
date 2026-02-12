import io
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import pymysql
import requests
import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image
from transformers import CLIPModel, CLIPProcessor


DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "whisky_db")

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "openai/clip-vit-base-patch32")
EMBEDDING_DEVICE = os.getenv("EMBEDDING_DEVICE", "auto")
EMBEDDING_BATCH_SIZE = int(os.getenv("EMBEDDING_BATCH_SIZE", "4"))
EMBEDDING_INDEX_PATH = os.getenv("EMBEDDING_INDEX_PATH", "python/data/image_embeddings.npz")
IMAGE_FETCH_TIMEOUT = int(os.getenv("IMAGE_FETCH_TIMEOUT", "15"))


@dataclass
class IndexedImage:
    image_id: int
    product_id: int
    product_name: str
    brand: str | None
    source: str | None
    image_url: str | None


class EmbeddingIndex:
    def __init__(self) -> None:
        self.embeddings: np.ndarray | None = None
        self.meta: list[IndexedImage] = []
        self.model_name = EMBEDDING_MODEL
        self.device = self._resolve_device()
        self.model = CLIPModel.from_pretrained(self.model_name).to(self.device)
        self.processor = CLIPProcessor.from_pretrained(self.model_name)
        if self.device == "cpu":
            torch.set_num_threads(max(1, min(4, os.cpu_count() or 1)))
        self._load_index_if_exists()

    def _resolve_device(self) -> str:
        if EMBEDDING_DEVICE in ("cpu", "cuda"):
            if EMBEDDING_DEVICE == "cuda" and not torch.cuda.is_available():
                return "cpu"
            return EMBEDDING_DEVICE
        return "cuda" if torch.cuda.is_available() else "cpu"

    def _connect_db(self):
        return pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=True,
        )

    def _fetch_rows(self, limit: int | None = None) -> list[dict[str, Any]]:
        sql = """
            SELECT
                i.id AS image_id,
                i.product_id,
                i.url AS image_url,
                i.img_blob,
                p.name AS product_name,
                p.brand,
                p.source,
                p.image_url AS product_image_url
            FROM wine_product_images i
            LEFT JOIN wine_products p ON p.id = i.product_id
            ORDER BY i.id ASC
        """
        if limit and limit > 0:
            sql += f" LIMIT {int(limit)}"

        with self._connect_db() as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
                return list(cur.fetchall())

    def _image_from_row(self, row: dict[str, Any]) -> Image.Image | None:
        blob = row.get("img_blob")
        if blob:
            try:
                return Image.open(io.BytesIO(blob)).convert("RGB")
            except Exception:
                return None

        image_url = row.get("image_url") or row.get("product_image_url")
        if image_url:
            try:
                response = requests.get(image_url, timeout=IMAGE_FETCH_TIMEOUT)
                response.raise_for_status()
                return Image.open(io.BytesIO(response.content)).convert("RGB")
            except Exception:
                return None

        return None

    def _embed_batch(self, images: list[Image.Image]) -> np.ndarray:
        inputs = self.processor(images=images, return_tensors="pt", padding=True)
        inputs = {key: value.to(self.device) for key, value in inputs.items()}
        with torch.no_grad():
            vectors = self.model.get_image_features(**inputs)
        emb = vectors.detach().cpu().numpy().astype(np.float32)
        norms = np.linalg.norm(emb, axis=1, keepdims=True)
        emb = emb / np.clip(norms, 1e-12, None)
        return emb

    def rebuild(self, limit: int | None = None) -> dict[str, Any]:
        rows = self._fetch_rows(limit=limit)

        pending_images: list[Image.Image] = []
        pending_meta: list[IndexedImage] = []
        embeddings_parts: list[np.ndarray] = []

        for row in rows:
            image = self._image_from_row(row)
            if image is None:
                continue

            pending_images.append(image)
            pending_meta.append(
                IndexedImage(
                    image_id=int(row["image_id"]),
                    product_id=int(row["product_id"]),
                    product_name=(row.get("product_name") or "").strip(),
                    brand=row.get("brand"),
                    source=row.get("source"),
                    image_url=row.get("image_url") or row.get("product_image_url"),
                )
            )

            if len(pending_images) >= EMBEDDING_BATCH_SIZE:
                embeddings_parts.append(self._embed_batch(pending_images))
                pending_images = []

        if pending_images:
            embeddings_parts.append(self._embed_batch(pending_images))

        if embeddings_parts:
            self.embeddings = np.vstack(embeddings_parts)
            self.meta = pending_meta
        else:
            self.embeddings = np.zeros((0, 512), dtype=np.float32)
            self.meta = []

        self._persist_index()

        return {
            "indexed": len(self.meta),
            "total_rows": len(rows),
            "model": self.model_name,
            "device": self.device,
            "index_path": EMBEDDING_INDEX_PATH,
        }

    def _persist_index(self) -> None:
        path = Path(EMBEDDING_INDEX_PATH)
        path.parent.mkdir(parents=True, exist_ok=True)

        embeddings = self.embeddings if self.embeddings is not None else np.zeros((0, 512), dtype=np.float32)
        np.savez_compressed(
            path,
            embeddings=embeddings,
            image_ids=np.array([m.image_id for m in self.meta], dtype=np.int64),
            product_ids=np.array([m.product_id for m in self.meta], dtype=np.int64),
            product_names=np.array([m.product_name for m in self.meta], dtype=object),
            brands=np.array([(m.brand or "") for m in self.meta], dtype=object),
            sources=np.array([(m.source or "") for m in self.meta], dtype=object),
            image_urls=np.array([(m.image_url or "") for m in self.meta], dtype=object),
        )

    def _load_index_if_exists(self) -> None:
        path = Path(EMBEDDING_INDEX_PATH)
        if not path.exists():
            self.embeddings = np.zeros((0, 512), dtype=np.float32)
            self.meta = []
            return

        data = np.load(path, allow_pickle=True)
        self.embeddings = data["embeddings"].astype(np.float32)

        image_ids = data["image_ids"]
        product_ids = data["product_ids"]
        product_names = data["product_names"]
        brands = data["brands"]
        sources = data["sources"]
        image_urls = data["image_urls"]

        self.meta = [
            IndexedImage(
                image_id=int(image_ids[i]),
                product_id=int(product_ids[i]),
                product_name=str(product_names[i]),
                brand=str(brands[i]) if brands[i] else None,
                source=str(sources[i]) if sources[i] else None,
                image_url=str(image_urls[i]) if image_urls[i] else None,
            )
            for i in range(len(image_ids))
        ]

    def search(self, image: Image.Image, top_k: int = 10) -> list[dict[str, Any]]:
        if self.embeddings is None or self.embeddings.shape[0] == 0:
            return []

        query = self._embed_batch([image])[0]
        sims = self.embeddings @ query
        k = max(1, min(top_k, len(self.meta)))
        top_idx = np.argpartition(-sims, k - 1)[:k]
        top_idx = top_idx[np.argsort(-sims[top_idx])]

        results: list[dict[str, Any]] = []
        for idx in top_idx:
            m = self.meta[int(idx)]
            results.append(
                {
                    "image_id": m.image_id,
                    "product_id": m.product_id,
                    "product_name": m.product_name,
                    "brand": m.brand,
                    "source": m.source,
                    "image_url": m.image_url,
                    "score": float(sims[int(idx)]),
                }
            )

        return results


app = FastAPI(title="Wine Embedding Service", version="1.0.0")
index = EmbeddingIndex()


@app.get("/health")
def health():
    count = 0 if index.embeddings is None else int(index.embeddings.shape[0])
    return {
        "ok": True,
        "indexed": count,
        "model": index.model_name,
        "device": index.device,
        "index_path": EMBEDDING_INDEX_PATH,
    }


@app.post("/reindex")
def reindex(payload: dict[str, Any] | None = None):
    payload = payload or {}
    limit = payload.get("limit")
    if limit is not None:
        try:
            limit = int(limit)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="limit must be an integer") from exc
    result = index.rebuild(limit=limit)
    return {"ok": True, **result}


@app.post("/search")
async def search(image: UploadFile = File(...), top_k: int = 10):
    if image.content_type is None or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload a valid image file")

    content = await image.read()
    try:
        pil_img = Image.open(io.BytesIO(content)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Failed to parse image") from exc

    results = index.search(pil_img, top_k=top_k)
    return {"ok": True, "count": len(results), "results": results}
