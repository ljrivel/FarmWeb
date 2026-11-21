@echo off
rem Doble clic para probar FarmWeb en tu PC y en tu celular (misma red Wi-Fi).
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Necesitas Node.js para esto: https://nodejs.org
  pause
  exit /b 1
)
node tools\serve.mjs %1
pause
