#!/usr/bin/env bash
set -euo pipefail
LOG=/tmp/setup_https.log
exec > >(tee -a "$LOG") 2>&1

echo "=== setup_https.sh started at $(date -u) ==="

IP=161.97.125.177
CERT_KEY=/etc/ssl/private/whiskies_self.key
CERT_CRT=/etc/ssl/certs/whiskies_self.crt
OPENSSL_CONF=/tmp/openssl_san.cnf
NGINX_SITE=/etc/nginx/sites-available/whiskies-ssl
NGINX_ENABLED=/etc/nginx/sites-enabled/whiskies-ssl
APP_DIR=/opt/whiskies
NEW_PORT=3003
PM2_NAME=whiskies

# Create OpenSSL config with IP SAN
cat > "$OPENSSL_CONF" <<EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = $IP

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
IP.1 = $IP
EOF

# Generate self-signed certificate
mkdir -p /etc/ssl/private /etc/ssl/certs
chmod 700 /etc/ssl/private || true

if [ -f "$CERT_KEY" ] && [ -f "$CERT_CRT" ]; then
  echo "Certificate already exists, backing up"
  cp "$CERT_KEY" "${CERT_KEY}.bak.$(date +%s)"
  cp "$CERT_CRT" "${CERT_CRT}.bak.$(date +%s)"
fi

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$CERT_KEY" -out "$CERT_CRT" \
  -config "$OPENSSL_CONF" -extensions v3_req

chmod 600 "$CERT_KEY"
chmod 644 "$CERT_CRT"

# Update app port in .env.production
ENV_FILE="$APP_DIR/.env.production"
if [ -f "$ENV_FILE" ]; then
  echo "Backing up $ENV_FILE"
  cp "$ENV_FILE" "${ENV_FILE}.bak.$(date +%s)"
  sed -i "s/^PORT=.*/PORT=${NEW_PORT}/" "$ENV_FILE" || echo "PORT=${NEW_PORT}" >> "$ENV_FILE"
else
  echo "Creating $ENV_FILE"
  cat > "$ENV_FILE" <<ENV
NODE_ENV=production
PORT=${NEW_PORT}
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=whisky_admin
DB_PASSWORD=WhiskyAdmin2026Aa1#
DB_NAME=whisky_db
ENV
fi

# Restart app using PM2 with updated env
echo "Restarting PM2 app to pick up new port"
# Kill existing app
pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true
# Start app from app dir with env loaded from .env.production
cd "$APP_DIR"
# Load env from file
set -a
source "$ENV_FILE"
set +a
pm2 start npm --name "$PM2_NAME" -- start -- -H 0.0.0.0 -p $NEW_PORT
sleep 2
pm2 save

# Create Nginx site config to serve HTTPS on port 3002 and proxy to app
cat > "$NGINX_SITE" <<'NGINX'
server {
  listen 3002 ssl;
  server_name ${IP};

  ssl_certificate __CERT_CRT__;
  ssl_certificate_key __CERT_KEY__;
  ssl_protocols TLSv1.2 TLSv1.3;

  location / {
    proxy_pass http://127.0.0.1/__NEW_PORT__;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
NGINX

ln -sf "$NGINX_SITE" "$NGINX_ENABLED"

# Test nginx config and reload
# Replace placeholder with actual port and reload nginx
sed -i "s/__NEW_PORT__/${NEW_PORT}/g" "$NGINX_SITE"
sed -i "s|__CERT_CRT__|${CERT_CRT}|g" "$NGINX_SITE"
sed -i "s|__CERT_KEY__|${CERT_KEY}|g" "$NGINX_SITE"
sed -i "s|__SERVER_NAME__|${IP}|g" "$NGINX_SITE"
nginx -t
systemctl reload nginx

# Verify HTTPS locally (ignore cert)
echo "--- curl result (https://127.0.0.1:3002/api/whiskies) ---"
curl -k -sS https://127.0.0.1:3002/api/whiskies || true

echo "=== setup_https.sh finished at $(date -u) ==="
