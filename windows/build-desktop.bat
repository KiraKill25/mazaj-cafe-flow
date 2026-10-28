@echo off
rem ==== Builds the offline MAZAJ app into windows\stage for Inno Setup ====
rem Needs (on the build PC only): Node.js LTS, and windows\node.exe
rem (download the Windows x64 "node.exe" from https://nodejs.org/dist/latest-v22.x/win-x64/node.exe).
setlocal
cd /d "%~dp0.."

if not exist "windows\node.exe" (
  echo [!] Missing windows\node.exe - download it from:
  echo     https://nodejs.org/dist/latest-v22.x/win-x64/node.exe
  pause
  exit /b 1
)

echo Installing packages...
call npm install || goto :fail

echo Building offline desktop version...
set MAZAJ_DESKTOP=1
call npx vite build || goto :fail
if not exist ".output\server\index.mjs" (
  echo [!] Build did not produce .output\server\index.mjs
  goto :fail
)

echo Preparing installer files...
if exist "windows\stage" rmdir /s /q "windows\stage"
mkdir "windows\stage"
xcopy /e /i /q /y ".output" "windows\stage\app" >nul || goto :fail
copy /y "windows\node.exe" "windows\stage\node.exe" >nul
copy /y "windows\MAZAJ.vbs" "windows\stage\MAZAJ.vbs" >nul
copy /y "windows\Stop-MAZAJ.bat" "windows\stage\Stop-MAZAJ.bat" >nul
copy /y "windows\mazaj.ico" "windows\stage\mazaj.ico" >nul

echo.
echo Done! Now right-click windows\Mazaj-Setup.iss and choose "Compile".
echo The installer will appear in windows\Output\
pause
exit /b 0

:fail
echo.
echo [!] Build failed - see the messages above.
pause
exit /b 1
