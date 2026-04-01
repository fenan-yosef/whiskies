import asyncio
import io
import json
import os
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Dict, Generator, List, Literal, Optional, Tuple

import clip
import mysql.connector
import numpy as np
import requests
import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse, StreamingResponse
from PIL import Image
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

EMBEDDINGS_PATH = Path(os.getenv("EMBEDDINGS_PATH", str(DATA_DIR / "embeddings.npy")))
IMAGE_IDS_PATH = Path(os.getenv("IMAGE_IDS_PATH", str(DATA_DIR / "image_ids.npy")))

MODEL_NAME = os.getenv("EMBEDDING_MODEL", "ViT-B/32")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
MAX_TOP_K = int(os.getenv("EMBEDDING_MAX_TOP_K", "50"))
FINAL_JOB_STATUSES = {"completed", "failed", "cancelled"}
ACTIVE_JOB_STATUSES = {"queued", "running", "paused"}
JobControlAction = Literal["pause", "resume", "cancel"]


def _load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


_load_dotenv(BASE_DIR.parent / ".env.local")
_load_dotenv(BASE_DIR.parent / ".env")

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "whisky_db")

app = FastAPI(title="Whiskies Embedding Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_model = None
_preprocess = None
_model_lock = threading.Lock()

_index_embeddings: Optional[np.ndarray] = None
_index_image_ids: Optional[np.ndarray] = None
_index_lock = threading.Lock()

_jobs: Dict[str, Dict[str, Any]] = {}
_jobs_lock = threading.Lock()


class ReindexRequest(BaseModel):
    limit: Optional[int] = None


def get_db_connection():
    return mysql.connector.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        connection_timeout=10,
    )


def ensure_model() -> Tuple[Any, Any]:
    global _model, _preprocess
    if _model is not None and _preprocess is not None:
        return _model, _preprocess

    with _model_lock:
        if _model is None or _preprocess is None:
            _model, _preprocess = clip.load(MODEL_NAME, device=DEVICE)
    return _model, _preprocess


def _build_job(job_id: str, limit: Optional[int]) -> Dict[str, Any]:
    now = time.time()
    return {
        "ok": True,
        "job_id": job_id,
        "type": "reindex",
        "status": "queued",
        "message": "Queued",
        "limit": limit,
        "total": 0,
        "processed": 0,
        "embedded": 0,
        "failed": 0,
        "skipped": 0,
        "progress": 0.0,
        "pause_requested": False,
        "cancel_requested": False,
        "started_at": None,
        "finished_at": None,
        "created_at": now,
        "updated_at": now,
        "version": 1,
        "output": {
            "embeddings_path": str(EMBEDDINGS_PATH),
            "image_ids_path": str(IMAGE_IDS_PATH),
        },
    }


def _update_job(job_id: str, **fields: Any) -> Dict[str, Any]:
    with _jobs_lock:
        job = _jobs.get(job_id)
        if not job:
            raise KeyError(f"Unknown job_id {job_id}")
        job.update(fields)
        job["updated_at"] = time.time()
        job["version"] = int(job.get("version", 0)) + 1
        _jobs[job_id] = job
        return dict(job)


def _get_job(job_id: str) -> Optional[Dict[str, Any]]:
    with _jobs_lock:
        job = _jobs.get(job_id)
        return dict(job) if job else None


def _apply_job_control(job_id: str, action: JobControlAction) -> Dict[str, Any]:
    now = time.time()
    with _jobs_lock:
        job = _jobs.get(job_id)
        if not job:
            raise KeyError(f"Unknown job_id {job_id}")

        status = str(job.get("status", ""))
        if status in FINAL_JOB_STATUSES:
            return dict(job)

        if action == "pause":
            if status in {"queued", "running"}:
                job["pause_requested"] = True
                job["message"] = "Pause requested by user"
                if status == "queued":
                    job["status"] = "paused"
        elif action == "resume":
            job["pause_requested"] = False
            if status == "paused":
                job["status"] = "running"
            job["message"] = "Resume requested by user"
        elif action == "cancel":
            job["cancel_requested"] = True
            if status in {"queued", "paused"}:
                job["status"] = "cancelled"
                job["message"] = "Stopped by user"
                job["finished_at"] = now
            else:
                job["message"] = "Stop requested by user"
        else:
            raise ValueError(f"Unsupported action: {action}")

        job["updated_at"] = now
        job["version"] = int(job.get("version", 0)) + 1
        _jobs[job_id] = job
        return dict(job)


def _count_rows(limit: Optional[int]) -> int:
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM whisky_product_images")
        count = int(cur.fetchone()[0])
        if limit is not None and limit > 0:
            return min(limit, count)
        return count
    finally:
        conn.close()


def _iter_image_rows(limit: Optional[int]) -> Generator[Dict[str, Any], None, None]:
    conn = get_db_connection()
    try:
        cur = conn.cursor(dictionary=True)
        sql = (
            "SELECT i.id AS image_id, i.product_id, i.url AS image_url, i.img_blob "
            "FROM whisky_product_images i "
            "ORDER BY i.id ASC"
        )
        params: Tuple[Any, ...] = ()
        if limit is not None and limit > 0:
            sql += " LIMIT %s"
            params = (limit,)
        cur.execute(sql, params)
        for row in cur:
            yield row
    finally:
        conn.close()


def _open_image_from_db_row(row: Dict[str, Any]) -> Optional[Image.Image]:
    blob = row.get("img_blob")
    if blob:
        try:
            return Image.open(io.BytesIO(blob)).convert("RGB")
        except Exception:
            pass

    image_url = row.get("image_url")
    if image_url:
        try:
            response = requests.get(image_url, timeout=12)
            response.raise_for_status()
            return Image.open(io.BytesIO(response.content)).convert("RGB")
        except Exception:
            return None
    return None


def _encode_pil_image(image: Image.Image) -> np.ndarray:
    model, preprocess = ensure_model()
    tensor = preprocess(image).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        embedding = model.encode_image(tensor)
        embedding = embedding / embedding.norm(dim=-1, keepdim=True)
    return embedding.cpu().numpy().astype(np.float32)


def _write_index(embeddings: np.ndarray, image_ids: np.ndarray) -> None:
    np.save(EMBEDDINGS_PATH, embeddings)
    np.save(IMAGE_IDS_PATH, image_ids)


def _load_index_from_disk() -> int:
    global _index_embeddings, _index_image_ids
    if not EMBEDDINGS_PATH.exists() or not IMAGE_IDS_PATH.exists():
        return 0

    embeddings = np.load(EMBEDDINGS_PATH, allow_pickle=False)
    image_ids = np.load(IMAGE_IDS_PATH, allow_pickle=False)

    if embeddings.ndim != 2:
        raise ValueError("embeddings.npy must be 2D")
    if image_ids.ndim != 1:
        raise ValueError("image_ids.npy must be 1D")
    if embeddings.shape[0] != image_ids.shape[0]:
        raise ValueError("embeddings and image_ids row count mismatch")

    with _index_lock:
        _index_embeddings = embeddings.astype(np.float32, copy=False)
        _index_image_ids = image_ids.astype(np.int64, copy=False)
    return int(image_ids.shape[0])


def _checkpoint_job_control(
    job_id: str,
    *,
    processed: int,
    embedded: int,
    failed: int,
    skipped: int,
    total: int,
) -> bool:
    display_total = total if total > 0 else 0

    while True:
        job = _get_job(job_id)
        if not job:
            return False

        cancel_requested = bool(job.get("cancel_requested"))
        pause_requested = bool(job.get("pause_requested"))
        status = str(job.get("status", ""))

        if cancel_requested:
            progress = round((processed / total) * 100.0, 2) if total > 0 else 0.0
            _update_job(
                job_id,
                status="cancelled",
                processed=processed,
                embedded=embedded,
                failed=failed,
                skipped=skipped,
                progress=progress,
                message=f"Stopped by user at {processed}/{display_total}",
                finished_at=time.time(),
            )
            return False

        if pause_requested:
            if status != "paused":
                progress = round((processed / total) * 100.0, 2) if total > 0 else 0.0
                _update_job(
                    job_id,
                    status="paused",
                    processed=processed,
                    embedded=embedded,
                    failed=failed,
                    skipped=skipped,
                    progress=progress,
                    message=f"Paused at {processed}/{display_total}",
                )
            time.sleep(0.4)
            continue

        if status == "paused":
            _update_job(
                job_id,
                status="running",
                message=f"Resumed at {processed}/{display_total}",
            )
        return True


def _run_reindex_job(job_id: str, limit: Optional[int]) -> None:
    try:
        _update_job(job_id, status="running", message="Loading image rows", started_at=time.time())

        if not _checkpoint_job_control(
            job_id,
            processed=0,
            embedded=0,
            failed=0,
            skipped=0,
            total=0,
        ):
            return

        total = _count_rows(limit)
        _update_job(job_id, total=total, message="Embedding images")

        if total == 0:
            _update_job(
                job_id,
                status="completed",
                message="No image rows found",
                progress=100.0,
                finished_at=time.time(),
            )
            return

        vectors: List[np.ndarray] = []
        image_ids: List[int] = []
        processed = 0
        embedded = 0
        failed = 0
        skipped = 0

        for row in _iter_image_rows(limit):
            if not _checkpoint_job_control(
                job_id,
                processed=processed,
                embedded=embedded,
                failed=failed,
                skipped=skipped,
                total=total,
            ):
                return

            processed += 1
            image_id = int(row["image_id"])
            image = _open_image_from_db_row(row)
            if image is None:
                skipped += 1
            else:
                try:
                    vec = _encode_pil_image(image)
                    vectors.append(vec[0])
                    image_ids.append(image_id)
                    embedded += 1
                except Exception:
                    failed += 1

            if processed % 10 == 0 or processed == total:
                progress = round((processed / total) * 100.0, 2)
                _update_job(
                    job_id,
                    processed=processed,
                    embedded=embedded,
                    failed=failed,
                    skipped=skipped,
                    progress=progress,
                    message=f"Processed {processed}/{total}",
                )

        if embedded == 0:
            _update_job(
                job_id,
                status="failed",
                message="No embeddings were created. Check image blobs/URLs.",
                finished_at=time.time(),
            )
            return

        embeddings_arr = np.asarray(vectors, dtype=np.float32)
        ids_arr = np.asarray(image_ids, dtype=np.int64)
        _write_index(embeddings_arr, ids_arr)

        with _index_lock:
            global _index_embeddings, _index_image_ids
            _index_embeddings = embeddings_arr
            _index_image_ids = ids_arr

        _update_job(
            job_id,
            status="completed",
            processed=processed,
            embedded=embedded,
            failed=failed,
            skipped=skipped,
            progress=100.0,
            message=f"Completed. Embedded {embedded} images",
            finished_at=time.time(),
            indexed=embedded,
        )
    except Exception as exc:
        _update_job(
            job_id,
            status="failed",
            message=f"Reindex failed: {exc}",
            finished_at=time.time(),
        )


def _start_reindex_job(limit: Optional[int]) -> Dict[str, Any]:
    normalized_limit = None
    if limit is not None and limit > 0:
        normalized_limit = int(limit)

    job_id = uuid.uuid4().hex
    job = _build_job(job_id, normalized_limit)
    with _jobs_lock:
        _jobs[job_id] = job

    thread = threading.Thread(target=_run_reindex_job, args=(job_id, normalized_limit), daemon=True)
    thread.start()
    return dict(job)


def _top_k_matches(query_vec: np.ndarray, top_k: int) -> List[Tuple[int, float]]:
    with _index_lock:
        embeddings = _index_embeddings
        image_ids = _index_image_ids
        if embeddings is None or image_ids is None or embeddings.shape[0] == 0:
            raise ValueError("Index is empty. Run reindex first.")
        matrix = embeddings
        ids = image_ids

    scores = np.dot(matrix, query_vec.reshape(-1))
    k = max(1, min(int(top_k), MAX_TOP_K, int(scores.shape[0])))
    top_idx = np.argpartition(scores, -k)[-k:]
    top_idx = top_idx[np.argsort(scores[top_idx])[::-1]]

    matches: List[Tuple[int, float]] = []
    for idx in top_idx:
        matches.append((int(ids[idx]), float(scores[idx])))
    return matches


def _fetch_result_metadata(image_ids: List[int]) -> Dict[int, Dict[str, Any]]:
    if not image_ids:
        return {}

    conn = get_db_connection()
    try:
        placeholders = ",".join(["%s"] * len(image_ids))
        sql = (
            "SELECT i.id AS image_id, i.product_id, i.url AS image_url, "
            "p.name AS product_name, p.brand, p.source, p.url AS product_url, "
            "p.price, p.currency, p.abv, p.volume, p.category, p.distillery, p.region, p.country, p.style "
            "FROM whisky_product_images i "
            "JOIN whisky_products p ON p.id = i.product_id "
            f"WHERE i.id IN ({placeholders})"
        )
        cur = conn.cursor(dictionary=True)
        cur.execute(sql, tuple(image_ids))
        rows = cur.fetchall()
        return {int(row["image_id"]): row for row in rows}
    finally:
        conn.close()


def _get_mime(blob: bytes) -> str:
    if blob.startswith(b"\x89PNG"):
        return "image/png"
    if blob.startswith(b"\xff\xd8"):
        return "image/jpeg"
    if blob.startswith(b"GIF87a") or blob.startswith(b"GIF89a"):
        return "image/gif"
    if blob.startswith(b"RIFF") and b"WEBP" in blob[:16]:
        return "image/webp"
    return "application/octet-stream"


@app.on_event("startup")
def on_startup() -> None:
    try:
        count = _load_index_from_disk()
        print(f"[embedding_service] loaded index with {count} vectors")
    except Exception as exc:
        print(f"[embedding_service] index load skipped: {exc}")


@app.get("/health")
def health() -> Dict[str, Any]:
    indexed = 0
    with _index_lock:
        if _index_embeddings is not None:
            indexed = int(_index_embeddings.shape[0])

    running_jobs = 0
    with _jobs_lock:
        for job in _jobs.values():
            if job.get("status") in ACTIVE_JOB_STATUSES:
                running_jobs += 1

    return {
        "ok": True,
        "indexed": indexed,
        "model": MODEL_NAME,
        "device": DEVICE,
        "index_path": str(EMBEDDINGS_PATH),
        "running_jobs": running_jobs,
    }


@app.post("/reindex")
def reindex(req: ReindexRequest) -> Dict[str, Any]:
    job = _start_reindex_job(req.limit)
    return {
        "ok": True,
        "job_id": job["job_id"],
        "status": job["status"],
        "message": "Reindex started in background",
        "status_url": f"/jobs/{job['job_id']}",
        "stream_url": f"/jobs/stream/{job['job_id']}",
    }


@app.get("/jobs/{job_id}")
def get_job(job_id: str) -> Dict[str, Any]:
    job = _get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"ok": True, **job}


@app.post("/jobs/{job_id}/pause")
def pause_job(job_id: str) -> Dict[str, Any]:
    try:
        job = _apply_job_control(job_id, "pause")
        return {"ok": True, **job}
    except KeyError:
        raise HTTPException(status_code=404, detail="Job not found")


@app.post("/jobs/{job_id}/resume")
def resume_job(job_id: str) -> Dict[str, Any]:
    try:
        job = _apply_job_control(job_id, "resume")
        return {"ok": True, **job}
    except KeyError:
        raise HTTPException(status_code=404, detail="Job not found")


@app.post("/jobs/{job_id}/cancel")
def cancel_job(job_id: str) -> Dict[str, Any]:
    try:
        job = _apply_job_control(job_id, "cancel")
        return {"ok": True, **job}
    except KeyError:
        raise HTTPException(status_code=404, detail="Job not found")


@app.get("/jobs/stream/{job_id}")
async def stream_job(job_id: str):
    async def event_generator():
        last_version = -1
        while True:
            job = _get_job(job_id)
            if not job:
                payload = {"ok": False, "error": "Job not found", "job_id": job_id}
                yield f"data: {json.dumps(payload)}\n\n"
                break

            version = int(job.get("version", 0))
            if version != last_version:
                yield f"data: {json.dumps({'ok': True, **job})}\n\n"
                last_version = version

            if job.get("status") in FINAL_JOB_STATUSES:
                break
            await asyncio.sleep(1)

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(event_generator(), media_type="text/event-stream", headers=headers)


@app.get("/image/{image_id}")
def get_image(image_id: int):
    conn = get_db_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT img_blob, url FROM whisky_product_images WHERE id = %s", (image_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Image not found")

        blob = row.get("img_blob")
        if blob:
            return StreamingResponse(io.BytesIO(blob), media_type=_get_mime(blob))

        url = row.get("url")
        if url:
            return RedirectResponse(url=url)

        raise HTTPException(status_code=404, detail="Image content missing")
    finally:
        conn.close()


@app.post("/search")
async def search(image: UploadFile = File(...), top_k: int = Form(8)):
    file_bytes = await image.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty image upload")

    try:
        pil = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    try:
        query_vec = _encode_pil_image(pil)[0]
        matches = _top_k_matches(query_vec, top_k)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    ids_in_order = [m[0] for m in matches]
    metadata = _fetch_result_metadata(ids_in_order)

    results = []
    for image_id, score in matches:
        item = metadata.get(image_id, {})
        results.append(
            {
                "image_id": image_id,
                "product_id": item.get("product_id"),
                "product_name": item.get("product_name") or f"Product {item.get('product_id')}",
                "brand": item.get("brand"),
                "source": item.get("source"),
                "image_url": item.get("image_url"),
                "product_url": item.get("product_url"),
                "price": item.get("price"),
                "currency": item.get("currency"),
                "abv": item.get("abv"),
                "volume": item.get("volume"),
                "category": item.get("category"),
                "distillery": item.get("distillery"),
                "region": item.get("region"),
                "country": item.get("country"),
                "style": item.get("style"),
                "score": round(score, 6),
            }
        )

    return {
        "ok": True,
        "count": len(results),
        "top_k": max(1, min(int(top_k), MAX_TOP_K)),
        "results": results,
    }
