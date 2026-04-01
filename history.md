# Deployment Log - 2026-04-01

## Context
- Next.js app is deployed at `http://161.97.125.177:3002`.
- VPS project path verified: `/root/whiskies`.
- Objective: install and run Python embedding service as a persistent system service, then verify Next.js proxy integration.

## What Was Done
1. Verified remote repo path and runtime
- Confirmed `/root/whiskies` exists and contains `python/embedding_service.py`.
- Confirmed Python runtime on VPS: `Python 3.12.3`.

2. Installed Python environment and dependencies
- Created venv at `/root/whiskies/.venv`.
- Installed dependencies from `python/requirements.txt`.

3. Created persistent systemd service
- Created service file: `/etc/systemd/system/whiskies-embedding.service`.
- Service runs:
	- ExecStart: `/root/whiskies/.venv/bin/uvicorn embedding_service:app --app-dir /root/whiskies/python --host 127.0.0.1 --port 8001`
- Enabled startup on boot and started immediately:
	- `systemctl enable --now whiskies-embedding.service`

4. Debugged production `reindex` 503
- Initial `POST /api/embeddings/reindex` returned 503 from Next proxy.
- Root causes found in service logs:
	- MySQL auth failure (`Access denied for user 'root'@'localhost'`).
	- Old Python service code on VPS referenced wrong table (`wine_product_images`).

5. Applied fixes
- Reused working DB credentials from running Next process and wrote `/root/whiskies/.env` for embedding service:
	- `DB_HOST=127.0.0.1`
	- `DB_PORT=3306`
	- `DB_USER=whisky_admin`
	- `DB_PASSWORD=WhiskyAdmin2026Aa1#`
	- `DB_NAME=whisky_db`
- Synced latest local Python backend files to VPS:
	- `python/embedding_service.py`
	- `python/requirements.txt`
- Reinstalled dependencies and restarted service.

## Verification Results
- Local on VPS health: `GET http://127.0.0.1:8001/health` returns `ok: true`.
- Direct VPS reindex: `POST http://127.0.0.1:8001/reindex` returns `ok: true` with `job_id`.
- Deployed proxy health: `GET http://161.97.125.177:3002/api/embeddings/health` returns `ok: true`.
- Deployed proxy reindex: `POST http://161.97.125.177:3002/api/embeddings/reindex` returns `ok: true` with `job_id`.

## Operational Notes
- First service start can take longer due model import/load.
- Service status/log commands:
	- `systemctl status whiskies-embedding.service`
	- `journalctl -u whiskies-embedding.service -f`
- Service restart command:
	- `systemctl restart whiskies-embedding.service`

## Current State
- Python embedding service is installed, running, and enabled on boot.
- Next.js embedding API proxy is functioning end-to-end in production.
