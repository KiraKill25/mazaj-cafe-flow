@echo off
title MAZAJ Coffee Shop
cd /d "%~dp0"

echo Starting MAZAJ server...
start "MAZAJ Server" /min cmd /c "npm run dev"

echo Waiting for server...
timeout /t 8 /nobreak >nul

set URL=http://localhost:8080
set PROFILE=%LOCALAPPDATA%\MazajPOS

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --kiosk-printing --app=%URL% --user-data-dir="%PROFILE%"
  goto :eof
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --kiosk-printing --app=%URL% --user-data-dir="%PROFILE%"
  goto :eof
)
start "" msedge --kiosk-printing --app=%URL% --user-data-dir="%PROFILE%"
