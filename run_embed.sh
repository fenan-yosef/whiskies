#!/usr/bin/env bash
LIMIT=${1:-50}
if [ ! -f .env ]; then
  echo ".env not found. Copy .env.example -> .env and fill DB_PASSWORD or set env vars."
fi

echo "Running: python python/create_embedding_sql.py --limit $LIMIT"
python3 python/create_embedding_sql.py --limit "$LIMIT"
