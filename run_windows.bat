@echo off
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required for local launch.
  pause
  exit /b 1
)
start "" http://127.0.0.1:8766
node server.mjs
