#!/bin/sh
echo "[startup] Python: $(python --version)"
echo "[startup] DB path: ${WORKOBS_DB_PATH:-<default>}"

echo "[startup] Running migrations..."
python /code/migrate.py
MIGRATE_EXIT=$?
if [ $MIGRATE_EXIT -ne 0 ]; then
  echo "[startup] ERROR: migration failed (exit $MIGRATE_EXIT)"
  exit $MIGRATE_EXIT
fi

echo "[startup] Starting API server on port 8000..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
