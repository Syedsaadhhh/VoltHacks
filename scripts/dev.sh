#!/usr/bin/env bash
set -e

echo "CutHush - browser hardware-in-the-loop test cell"
LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
if [ -n "$LAN_IP" ]; then
  echo "Phone pairing origin: http://${LAN_IP}:5173"
else
  echo "Phone pairing origin: enter this laptop's LAN IPv4 address in the app"
fi

trap 'kill $(jobs -p) 2>/dev/null' EXIT
(
  cd "$(dirname "$0")/.."
  python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
) &
sleep 2
cd "$(dirname "$0")/../frontend"
npm run dev
