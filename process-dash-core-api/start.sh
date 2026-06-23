#!/bin/sh
# Run Alembic migrations then start the API server.
# Safe to run on every container start — Alembic skips already-applied migrations.
set -e

echo "[startup] Running database migrations..."
python -m alembic upgrade head

echo "[startup] Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
