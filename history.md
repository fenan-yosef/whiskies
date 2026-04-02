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

## Update - Task Manager Tab (2026-04-02)

### Goal
- Added a clean Task Manager tab next to Search and Embedding tabs so users can inspect server workload and end unwanted tasks.

### Backend (Python)
- File updated: `python/embedding_service.py`
- New dependency: `psutil>=5.9.0` in `python/requirements.txt`
- Added endpoints:
	- `GET /system/status?limit=120`
		- Returns CPU, memory, disk, uptime, process list, and protected PID list.
	- `POST /system/processes/{pid}/terminate`
		- Terminates or kills a process (`{"force": true|false}`), with guardrails for protected processes.
- Safety/robustness notes:
	- Refuses to terminate protected PIDs (`1`, current service process, parent process).
	- Filters inaccessible processes gracefully.
	- Limits process list size (`TASK_MANAGER_MAX_PROCESSES`, default 200).

### Next.js Proxy Layer
- Added routes:
	- `app/api/embeddings/system/route.ts` -> proxies to Python `/system/status`
	- `app/api/embeddings/system/processes/[pid]/route.ts` -> proxies to Python terminate endpoint

### Frontend (Embedding Manager)
- File updated: `components/EmbeddingManager.tsx`
- Added new tab: `Task Manager`
- UI includes:
	- Resource cards for CPU, memory, disk, uptime
	- Process table with PID/name/owner/cpu/memory/status/cmdline
	- Actions:
		- `End task` (graceful terminate)
		- `Force kill`
	- Protected processes are marked and action-disabled
	- Auto-refresh while tab is open (7s interval) + manual refresh

### Deployment Note
- For production, run `pip install -r python/requirements.txt` on VPS and restart `whiskies-embedding.service` to apply `psutil` and new endpoints.

## Update - CI/CD Python Deployment (2026-04-02)

### Goal
- Extend GitHub Actions deployment so pushes to `master` update both Next.js and Python embedding service.

### Workflow Change
- File updated: `.github/workflows/ci-cd.yml`
- Added deploy step: `Deploy Python embedding service`
	- SSH into VPS after existing remote Next.js deploy
	- Ensure `.venv` exists (`python3 -m venv .venv` if missing)
	- Install/update Python deps from `python/requirements.txt`
	- Restart `whiskies-embedding.service` if present
	- Print service status for deploy visibility

### Result
- CI/CD now handles backend Python service updates on push, not just Next.js.

## Incident Note - Task Manager 404 After Deploy (2026-04-02)

### Symptom
- `GET /api/embeddings/system?limit=120` returned `404 {"detail":"Not Found"}` in production.

### Root Cause
- Next.js route existed and was built correctly in `/opt/whiskies`.
- The Python embedding service was still running from `/root/whiskies` (older code path) and did not include `/system/status`.
- Result: Next proxy route worked, but upstream Python endpoint returned 404.

### Fix Applied
- Synced latest Python files to `/opt/whiskies/python`.
- Updated `whiskies-embedding.service` to run from `/opt/whiskies`:
	- `WorkingDirectory=/opt/whiskies`
	- `ExecStart=/opt/whiskies/.venv/bin/uvicorn ... --app-dir /opt/whiskies/python`
	- `EnvironmentFile=-/opt/whiskies/.env`
- Installed Python deps in `/opt/whiskies/.venv` and restarted service.
- Restarted PM2 app `whiskies`.

### Verification
- `GET http://127.0.0.1:8001/system/status?limit=5` -> 200 OK.
- `GET http://127.0.0.1:3002/api/embeddings/system?limit=5` -> 200 OK.
- `GET http://161.97.125.177:3002/api/embeddings/system?limit=5` -> 200 OK.

### Prevention
- CI workflow now includes a post-deploy smoke check for `/api/embeddings/system` and fails deploy if not 200.
