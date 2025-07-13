@echo off
echo Starting WizHBT App Setup...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please restart your computer after installing Node.js
    pause
    exit /b 1
)

echo Node.js found. Installing dependencies...

REM Install backend dependencies
echo.
echo Installing backend dependencies...
cd /d "%~dp0src\backend"
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install backend dependencies
    pause
    exit /b 1
)

REM Install frontend dependencies
echo.
echo Installing frontend dependencies...
cd /d "%~dp0src"
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install frontend dependencies
    pause
    exit /b 1
)

echo.
echo All dependencies installed successfully!
echo.
echo Starting servers...
echo.

REM Start backend server
echo Starting backend server on http://localhost:3000
start "Backend Server" cmd /k "cd /d \"%~dp0src\backend\" && npm run dev"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend server
echo Starting frontend server on http://localhost:8080
start "Frontend Server" cmd /k "cd /d \"%~dp0src\" && npm run dev"

echo.
echo Both servers are starting...
echo Backend: http://localhost:3000
echo Frontend: http://localhost:8080
echo.
echo Press any key to open the app in your browser...
pause >nul

REM Open the app in default browser
start http://localhost:8080

echo.
echo App is now running! Keep these terminal windows open.
echo To stop the servers, close the terminal windows.
pause 