#!/bin/sh
set -e

# Always run from the code directory so alembic.ini and migrations/ are resolvable
cd /code

echo "[startup] Python: $(python --version)"
echo "[startup] Working dir: $(pwd)"
echo "[startup] DB path: ${WORKOBS_DB_PATH:-<default>}"

# Create data directory explicitly before anything else
if [ -n "$WORKOBS_DB_PATH" ]; then
  DB_DIR=$(dirname "$WORKOBS_DB_PATH")
  mkdir -p "$DB_DIR"
  echo "[startup] Data directory: $DB_DIR"
fi

echo "[startup] Running migrations..."
python /code/migrate.py
echo "[startup] Migrations complete."

echo "[startup] Starting API server on port 8000..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
