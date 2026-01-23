#!/bin/bash
# Run from repository root or scripts folder

# Resolve the directory of the script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Starting Frontend (Vite)..."
cd "$PROJECT_ROOT/frontend/beta"

npm run dev
