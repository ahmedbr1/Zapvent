@echo off
echo ========================================
echo   Zapvent - Starting Development Server
echo ========================================
echo.

REM Check if node is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if MongoDB is running
echo Checking MongoDB...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo WARNING: MongoDB does not appear to be running
    echo Please start MongoDB with: mongod
    echo.
    pause
)

REM Check if node_modules exists
if not exist "node_modules\" (
    echo.
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Check if .env exists
if not exist ".env" (
    echo.
    echo WARNING: .env file not found
    echo Creating sample .env file...
    echo MONGODB_URI=mongodb://localhost:27017/zapvent > .env
    echo JWT_SECRET=your-super-secret-jwt-key-change-this >> .env
    echo PORT=4000 >> .env
    echo.
    echo Please edit .env file with your actual configuration
    pause
)

REM Start the development server
echo.
echo Starting development server...
echo Frontend will be available at: http://localhost:3000
echo Backend API will be available at: http://localhost:4000/api
echo.
echo Press Ctrl+C to stop the server
echo.

call npm run dev
