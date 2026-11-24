@echo off
if exist "%APPDATA%\npm\pnpm.cmd" (
  "%APPDATA%\npm\pnpm.cmd" %*
  exit /b %ERRORLEVEL%
)
if exist "%LOCALAPPDATA%\pnpm\pnpm.cmd" (
  "%LOCALAPPDATA%\pnpm\pnpm.cmd" %*
  exit /b %ERRORLEVEL%
)
if exist "%ProgramFiles%\nodejs\pnpm.cmd" (
  "%ProgramFiles%\nodejs\pnpm.cmd" %*
  exit /b %ERRORLEVEL%
)
for /f "tokens=*" %%i in ('where.exe pnpm.cmd 2^>nul') do (
  if /i not "%%i"=="%~f0" (
    "%%i" %*
    exit /b %ERRORLEVEL%
  )
)
pnpm %*
