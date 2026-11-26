@echo off
title AVRØ HOUSE x Ω∞v OCEANICOS - Full-Stack Platform Launcher
color 0B
echo =========================================================================
echo       AVRO HOUSE x OMEGA-V OCEANICOS - SOVEREIGN CONTINUUM
echo =========================================================================
echo.

cd /d "%~dp0"

echo [1/4] Checking and building packages...
call pnpm build

echo.
echo [2/4] Starting Python Companion on port 8088...
start "Python Companion :8088" cmd /k "cd companion/python && python main.py"

echo.
echo [3/4] Starting Fastify Spine API on port 5000...
start "Fastify Spine API :5000" cmd /k "set PORT=5000&& set OMEGA_AUTH_MODE=local&& set OMEGA_LLM_PROVIDER=ollama&& set OMEGA_LLM_BASE_URL=http://127.0.0.1:11434/v1&& node apps/api/dist/index.js"

echo.
echo [4/4] Starting Vite Web UI on port 3000...
start "Vite Web UI :3000" cmd /k "cd apps/web && npx vite --port 3000 --host 0.0.0.0"

echo.
echo =========================================================================
echo All services launched!
echo - Web UI:    http://localhost:3000
echo - API Spine: http://localhost:5000/health
echo - Companion: http://localhost:8088/voice
echo - Ollama:    http://localhost:11434
echo =========================================================================
echo.
pause
