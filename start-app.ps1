# WizHBT App Startup Script
Write-Host "Starting WizHBT App Setup..." -ForegroundColor Green
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please restart your computer after installing Node.js" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Installing dependencies..." -ForegroundColor Yellow

# Install backend dependencies
Write-Host ""
Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
Set-Location ".\src\backend"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install backend dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Install frontend dependencies
Write-Host ""
Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location ".."
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install frontend dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "All dependencies installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Starting servers..." -ForegroundColor Yellow

# Start backend server
Write-Host "Starting backend server on http://localhost:3000" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PWD\src\backend'; npm run dev" -WindowStyle Normal

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend server
Write-Host "Starting frontend server on http://localhost:8080" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PWD\src'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "Both servers are starting..." -ForegroundColor Green
Write-Host "Backend: http://localhost:3000" -ForegroundColor White
Write-Host "Frontend: http://localhost:8080" -ForegroundColor White
Write-Host ""

$openBrowser = Read-Host "Press Enter to open the app in your browser (or 'n' to skip)"
if ($openBrowser -ne 'n') {
    Start-Process "http://localhost:8080"
}

Write-Host ""
Write-Host "App is now running! Keep the terminal windows open." -ForegroundColor Green
Write-Host "To stop the servers, close the terminal windows." -ForegroundColor Yellow
Read-Host "Press Enter to exit" 