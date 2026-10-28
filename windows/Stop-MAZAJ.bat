@echo off
rem Stops the MAZAJ local server (waiter phones will disconnect).
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":8080 .*LISTENING"') do taskkill /PID %%p /F >nul 2>&1
echo MAZAJ server stopped.
timeout /t 2 >nul
