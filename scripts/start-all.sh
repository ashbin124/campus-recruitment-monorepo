#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/Campus-back"
FRONTEND_DIR="$ROOT_DIR/Campusrec.io"

BACKEND_PID=""
FRONTEND_PID=""

detect_lan_ip() {
  local iface
  for iface in en0 en1 en3 en4; do
    ipconfig getifaddr "$iface" 2>/dev/null || true
  done | awk 'NF{print; exit}'
}

require_free_port() {
  local port="$1"
  local pid
  pid="$(lsof -ti "tcp:${port}" || true)"
  if [[ -n "$pid" ]]; then
    echo "Port ${port} is already in use by PID ${pid}. Stop it first, then run npm run start:all again."
    exit 1
  fi
}

cleanup() {
  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

require_free_port 3005
require_free_port 5173

echo "Starting Campus backend..."
(
  cd "$BACKEND_DIR"

  if [[ ! -d node_modules ]]; then
    npm install
  fi

  npx prisma generate
  npx prisma migrate deploy
  npm run dev
) &
BACKEND_PID=$!

echo "Starting Campus frontend..."
(
  cd "$FRONTEND_DIR"

  if [[ ! -d node_modules ]]; then
    npm install
  fi

  npm run dev -- --host 0.0.0.0
) &
FRONTEND_PID=$!

echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:3005"
LAN_IP="$(detect_lan_ip || true)"
if [[ -n "${LAN_IP}" ]]; then
  echo "Network Frontend: http://${LAN_IP}:5173"
  echo "Network Backend:  http://${LAN_IP}:3005"
  echo "Backend Health:   http://${LAN_IP}:3005/health"
fi
echo "Press Ctrl+C to stop both services."

wait "$BACKEND_PID" "$FRONTEND_PID"
