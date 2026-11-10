@echo off
setlocal enabledelayedexpansion
title OCEANICOS Ω∞v — Sovereign Desktop App Launcher

echo ===================================================================
echo     OCEANICOS ΩVØØS — WATER INTELLIGENCE SOVEREIGN DESKTOP APP
echo     Deus Ex Machina // Tri-Surface Engine (Ports 3000, 5000, 8088)
echo ===================================================================
echo.

cd /d "%~dp0"

echo [1/4] Checking Node.js and PNPM environment...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found on PATH. Please install Node 22+ from https://nodejs.org
    pause
    exit /b 1
)

set "PNPM_CMD=pnpm"
where pnpm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if exist "C:\Users\pc\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd" (
        set "PNPM_CMD=C:\Users\pc\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"
    )
)

echo [2/4] Verifying background API service (:5000)...
netstat -ano | findstr ":5000 " >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Starting Fastify API on port 5000...
    start "OceanicOS API :5000" /b cmd /c "set PORT=5000 && set OMEGA_SIGNING_KEY=omega-v-default-attestation-secret-key-2026 && !PNPM_CMD! --filter api run start"
    timeout /t 3 /nobreak >nul
) else (
    echo API on port 5000 is already active.
)

echo [3/4] Verifying Web Frontend service (:3000)...
netstat -ano | findstr ":3000 " >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Starting Vite Web Preview on port 3000...
    start "OceanicOS Web :3000" /b cmd /c "!PNPM_CMD! --filter web run preview"
    timeout /t 2 /nobreak >nul
) else (
    echo Web service on port 3000 is already active.
)

echo [4/4] Launching OceanicOS as a Native Desktop App Window...

:: Try Microsoft Edge in standalone app mode
set "EDGE_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not exist "!EDGE_PATH!" (
    set "EDGE_PATH=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)

:: Try Google Chrome in standalone app mode
set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "!CHROME_PATH!" (
    set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)
if not exist "!CHROME_PATH!" (
    set "CHROME_PATH=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
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
echo     URL: http://localhost:3000  ^| API: http://localhost:5000
echo ===================================================================
echo.
exit /b 0

