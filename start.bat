@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 LTS or later is required.
  pause
  exit /b 1
)
node -e "if (Number(process.versions.node.split('.')[0]) < 22) process.exit(1)"
if errorlevel 1 (
  echo Node.js 22 LTS or later is required.
  pause
  exit /b 1
)
echo Local website: http://127.0.0.1:8787
echo Local mode only. Press Ctrl+C to stop.
node scripts\start-local.mjs
exit /b %errorlevel%
