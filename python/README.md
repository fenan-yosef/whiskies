# Embedding Service

This folder adds image-embedding indexing and search for the existing MySQL `wine_product_images` blobs.

## Why this model

Default model is `openai/clip-vit-base-patch32`.

- Free and open-source
- Good quality for visual similarity search
- Fits CPU-only servers better than larger CLIP variants

Given your server (4 vCPU, ~8GB RAM, no GPU), this is a balanced default. If RAM is tight, lower `EMBEDDING_BATCH_SIZE` to `2`.

## Setup

```bash
python -m venv .venv
. .venv/Scripts/Activate.ps1
pip install -r python/requirements.txt
```

## Run service

```bash
uvicorn python.embedding_service:app --host 0.0.0.0 --port 8001
```

## Environment variables

- `DB_HOST` default `127.0.0.1`
- `DB_USER` default `root`
- `DB_PASSWORD` default empty
- `DB_NAME` default `whisky_db`
- `EMBEDDING_MODEL` default `openai/clip-vit-base-patch32`
- `EMBEDDING_DEVICE` default `auto` (`cuda` if available else `cpu`)
- `EMBEDDING_BATCH_SIZE` default `4`
- `EMBEDDING_INDEX_PATH` default `python/data/image_embeddings.npz`
- `IMAGE_FETCH_TIMEOUT` default `15`

## Endpoints

- `GET /health`
- `POST /reindex`
- `POST /search` (multipart form with `image` and optional `top_k`)
