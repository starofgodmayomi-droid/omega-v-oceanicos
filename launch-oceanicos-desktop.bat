@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title ΔVRØ HOUSE × Ω∞v OCEANICOS — Sovereign Desktop Application

echo ===================================================================
echo     ΔVRØ HOUSE × Ω∞v OCEANICOS — SOVEREIGN DESKTOP APPLICATION
echo     One Root · One Current · Ports 3000, 5000, 8088, 11434
echo ===================================================================
echo.

if exist "%~dp0apps\api\dist\index.js" (
    cd /d "%~dp0"
) else if exist "C:\Users\pc\OMEGA V\omega-v-oceanicos\apps\api\dist\index.js" (
    cd /d "C:\Users\pc\OMEGA V\omega-v-oceanicos"
) else (
    cd /d "%~dp0"
)

echo [1/4] Verifying Ollama Compute Brain (:11434)...
netstat -ano | findstr ":11434 " | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Starting Ollama inference engine on port 11434...
    start "OceanicOS Brain :11434" /b cmd /c "ollama serve"
    timeout /t 2 /nobreak >nul
) else (
    echo Ollama Compute Brain on port 11434 is active.
)

echo [2/4] Verifying Fastify Spine API (:5000)...
netstat -ano | findstr ":5000 " | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Starting Fastify API on port 5000...
    start "OceanicOS API :5000" /b cmd /c "set PORT=5000 && set OMEGA_AUTH_MODE=local && set OMEGA_LLM_PROVIDER=ollama && set OMEGA_LLM_BASE_URL=http://127.0.0.1:11434/v1 && node apps/api/dist/index.js"
    timeout /t 2 /nobreak >nul
) else (
    echo Fastify Spine API on port 5000 is active.
)

echo [3/4] Verifying Python Companion Muscle (:8088)...
netstat -ano | findstr ":8088 " | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Starting Python Companion on port 8088...
    start "OceanicOS Companion :8088" /b cmd /c "python companion/python/main.py"
    timeout /t 2 /nobreak >nul
) else (
    echo Python Companion on port 8088 is active.
)

echo [4/4] Verifying Web Frontend Surface (:3000)...
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Starting Vite Web Preview on port 3000...
    start "OceanicOS Web :3000" /b cmd /c "cd apps/web && npx vite --port 3000 --host"
    timeout /t 2 /nobreak >nul
) else (
    echo Web Frontend Surface on port 3000 is active.
)

echo Launching OceanicOS as a Native Desktop App Window...

set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "!CHROME_PATH!" (
    set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)
if not exist "!CHROME_PATH!" (
    set "CHROME_PATH=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
)

set "EDGE_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not exist "!EDGE_PATH!" (
    set "EDGE_PATH=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)

if exist "!CHROME_PATH!" (
    echo Launching with Google Chrome App Mode...
    start "" "!CHROME_PATH!" --app=http://localhost:3000 --window-size=1440,940
) else if exist "!EDGE_PATH!" (
    echo Launching with Microsoft Edge App Mode...
    start "" "!EDGE_PATH!" --app=http://localhost:3000 --window-size=1440,940
) else (
    echo Opening in default browser...
    start http://localhost:3000
)

echo.
echo ===================================================================
echo     OCEANICOS Ω∞v IS RUNNING AS A DESKTOP APPLICATION!
echo     Web: :3000  ^| API: :5000  ^| Muscle: :8088  ^| Brain: :11434
echo ===================================================================
echo.
exit /b 0
