#!/bin/bash
# Run from repository root or scripts folder

# Resolve the directory of the script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Starting Backend (FastAPI)..."
cd "$PROJECT_ROOT/api"

# Check if venv exists
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "⚠️  venv not found in api/venv. Attempting to start without activation..."
fi

# Run uvicorn
# Using reload for dev experience
uvicorn app.main:app --reload --port 8000
