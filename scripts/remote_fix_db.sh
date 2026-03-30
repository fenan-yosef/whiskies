#!/usr/bin/env bash
set -euo pipefail
LOG=/tmp/remote_fix_db.log
exec > >(tee -a "$LOG") 2>&1
echo "==== remote_fix_db.sh started at $(date -u) ===="

# Variables - change if needed
REMOTE_APP_DIR=/opt/whiskies
ENV_FILE="$REMOTE_APP_DIR/.env.production"
BACKUP="$ENV_FILE.bak.$(date +%s)"
DB_USER=whisky_admin
DB_PASS='WhiskyAdmin2026Aa1#'
DB_NAME=whisky_db
DB_HOST=127.0.0.1
DB_PORT=3306
PM2_NAME=whiskies

# Create DB user and grant SELECT
echo "Creating DB user $DB_USER (GRANT SELECT)..."
mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'${DB_HOST}' IDENTIFIED BY '${DB_PASS}'; GRANT SELECT ON ${DB_NAME}.* TO '${DB_USER}'@'${DB_HOST}'; FLUSH PRIVILEGES;"

# Verify user can connect (simple test)
echo "Testing DB connection (as ${DB_USER})..."
mysql -u"${DB_USER}" -p"${DB_PASS}" -h"${DB_HOST}" -P"${DB_PORT}" -e "SELECT COUNT(*) AS cnt FROM ${DB_NAME}.whisky_products LIMIT 1;" || true

# Backup and write .env.production
if [ -f "${ENV_FILE}" ]; then
  echo "Backing up existing ${ENV_FILE} -> ${BACKUP}"
  cp "${ENV_FILE}" "${BACKUP}"
fi

echo "Writing new ${ENV_FILE}"
cat > "${ENV_FILE}" <<'ENVEOF'
NODE_ENV=production
PORT=3002
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=whisky_admin
DB_PASSWORD=WhiskyAdmin2026Aa1#
DB_NAME=whisky_db
ENVEOF

# Ensure ownership/permissions
chmod 600 "${ENV_FILE}" || true

# Restart PM2 process with updated env
echo "Restarting PM2 process ${PM2_NAME} (update env)..."
if pm2 pid ${PM2_NAME} >/dev/null 2>&1; then
  pm2 restart ${PM2_NAME} --update-env
else
  echo "PM2 process ${PM2_NAME} not found, attempting start from ${REMOTE_APP_DIR}"
  cd "${REMOTE_APP_DIR}"
  pm2 start npm --name "${PM2_NAME}" -- start --update-env
fi

sleep 3

# Verify API
echo "--- /api/whiskies response ---"
curl -sS -f http://127.0.0.1:3002/api/whiskies || true

echo "--- tail of whiskies-error.log ---"
tail -n 80 /root/.pm2/logs/whiskies-error.log || true

echo "==== remote_fix_db.sh finished at $(date -u) ===="
