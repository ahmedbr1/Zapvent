@echo off
echo ========================================
echo   Fixing Tailwind CSS Native Binding
echo ========================================
echo.

cd /d "%~dp0"

echo Step 1: Reinstalling dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Starting Development Server
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo Backend: http://localhost:4000/api
echo.
echo Press Ctrl+C to stop
echo.

call npm run dev
