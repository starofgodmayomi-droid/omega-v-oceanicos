#!/usr/bin/env bash
# AVRØ HOUSE x Ω∞v OCEANICOS - Full-Stack Launcher (Bash)

set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=== AVRØ HOUSE x Ω∞v OCEANICOS ==="
echo "[1/4] Building packages..."
pnpm build

echo "[2/4] Starting Python Companion on port 8088..."
(cd companion/python && python main.py) &
PID_COMPANION=$!

echo "[3/4] Starting Fastify Spine API on port 5000..."
(PORT=5000 OMEGA_AUTH_MODE=local OMEGA_LLM_PROVIDER=ollama OMEGA_LLM_BASE_URL=http://127.0.0.1:11434/v1 node apps/api/dist/index.js) &
PID_API=$!

echo "[4/4] Starting Vite Web UI on port 3000..."
(cd apps/web && npx vite --port 3000 --host 0.0.0.0) &
PID_WEB=$!

echo ""
echo "=== ALL SERVICES RUNNING ==="
echo "Web UI:    http://localhost:3000"
echo "API Spine: http://localhost:5000/health"
echo "Companion: http://localhost:8088/voice"
echo "Ollama:    http://localhost:11434"
echo ""

wait $PID_WEB $PID_API $PID_COMPANION
