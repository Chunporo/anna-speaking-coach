@echo off
setlocal enabledelayedexpansion

echo Starting IELTS Speaking Practice Platform...
echo.

REM Check if ports are in use (Windows)
netstat -ano | findstr :8000 >nul
if %errorlevel% == 0 (
    echo Port 8000 is already in use! Please stop the existing service.
    exit /b 1
)

netstat -ano | findstr :3000 >nul
if %errorlevel% == 0 (
    echo Port 3000 is already in use! Please stop the existing service.
    exit /b 1
)

REM Start Backend
echo Starting backend server...
cd backend

REM Check if virtual environment exists
if not exist "venv\" (
    echo Virtual environment not found!
    echo Please run setup.sh first or create a virtual environment.
    exit /b 1
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Check if .env exists
if not exist ".env" (
    echo Warning: .env file not found in backend directory.
    echo The backend may not work correctly without proper configuration.
)

REM Start backend in background
start "Backend Server" /min cmd /c "uvicorn app.main:app --reload --port 8000 > ..\backend.log 2>&1"

if %errorlevel% == 0 (
    echo Backend started
    echo Backend logs: backend.log
) else (
    echo Failed to start backend!
    exit /b 1
)

cd ..

REM Wait a bit for backend to start
timeout /t 2 /nobreak >nul

REM Start Frontend
echo Starting frontend server...
cd frontend

REM Check if node_modules exists
if not exist "node_modules\" (
    echo node_modules not found. Installing dependencies...
    call npm install
)

REM Check if .env.local exists
if not exist ".env.local" (
    echo Warning: .env.local file not found in frontend directory.
    echo Creating default .env.local...
    echo NEXT_PUBLIC_API_URL=http://localhost:8000 > .env.local
)

REM Start frontend in background
start "Frontend Server" /min cmd /c "npm run dev > ..\frontend.log 2>&1"

if %errorlevel% == 0 (
    echo Frontend started
    echo Frontend logs: frontend.log
) else (
    echo Failed to start frontend!
    exit /b 1
)

cd ..

echo.
echo ========================================
echo All services are running!
echo ========================================
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo Frontend: http://localhost:3000
echo.
echo Press any key to stop all services...
pause >nul

REM Kill background processes
taskkill /FI "WINDOWTITLE eq Backend Server*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Frontend Server*" /T /F >nul 2>&1

echo.
echo Services stopped.

