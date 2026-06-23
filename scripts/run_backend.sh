#!/bin/bash
# Run from repository root or scripts folder

# Resolve the directory of the script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Starting Backend (FastAPI)..."
cd "$PROJECT_ROOT/process-dash-core-api"

# Check if venv exists, create it if not
if [ ! -d "venv" ]; then
    echo "📦 No venv found — creating one..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt -q
else
    source venv/bin/activate
fi

# Run uvicorn via the venv python to avoid PATH issues
python -m uvicorn app.main:app --reload --port 8000
