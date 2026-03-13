#!/usr/bin/env bash
set -euo pipefail

REMOTE_DIR="${REMOTE_DIR:-/opt/whiskies}"
POST_DEPLOY_COMMANDS="${POST_DEPLOY_COMMANDS:-}"
APP_PORT="${APP_PORT:-3002}"

echo "Deploying repository to ${REMOTE_DIR}"

if [ ! -d "$REMOTE_DIR/.git" ]; then
  echo "Cloning repository into ${REMOTE_DIR}"
  git clone https://github.com/fenan-yosef/whiskies.git "$REMOTE_DIR"
fi

cd "$REMOTE_DIR"
git fetch --all --tags
git reset --hard origin/master

if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile
  pnpm build
elif command -v npm >/dev/null 2>&1; then
  npm ci
  npm run build
fi

# If pm2 is available, restart or start the app
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart whiskies --update-env || pm2 start npm --name "whiskies" -- start -- -H 0.0.0.0 -p "$APP_PORT"
  pm2 save
fi

if [ -n "$POST_DEPLOY_COMMANDS" ]; then
  echo "Running post-deploy commands"
  eval "$POST_DEPLOY_COMMANDS"
fi

echo "Deployment finished."
