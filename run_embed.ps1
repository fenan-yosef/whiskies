param(
    [int]$Limit = 50
)

# Short helper: loads .env if present and runs the embedding script
if (-Not (Test-Path -Path '.env')) {
    Write-Host ".env not found. Copy .env.example -> .env and fill DB_PASSWORD or set env vars." -ForegroundColor Yellow
}

Write-Host "Running create_embedding_sql.py --limit $Limit"
python .\python\create_embedding_sql.py --limit $Limit
