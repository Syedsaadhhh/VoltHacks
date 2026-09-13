#!/usr/bin/env bash
set -e

echo "=================================================="
echo "  CutHush - Two-Device Physical Loop Dev Runner   "
echo "=================================================="

# Trap exit to kill background jobs
trap 'kill $(jobs -p) 2>/dev/null' EXIT

# Start Backend
echo "[1/2] Starting CutHush FastAPI Backend on http://localhost:8000..."
(
    cd "$(dirname "$0")/.."
    python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
) &

sleep 2

# Start Frontend
echo "[2/2] Starting CutHush Vite Frontend on http://localhost:5173..."
cd "$(dirname "$0")/../frontend"
npm run dev