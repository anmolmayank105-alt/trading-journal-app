@echo off
title Trading Journal App Launcher
color 0A

echo.
echo  ========================================
echo    TRADING JOURNAL APP LAUNCHER
echo  ========================================
echo.
echo  Choose an option:
echo.
echo  [1] Start Full App (Frontend + Backend)
echo  [2] Start Frontend Only (Port 3002)
echo  [3] Start Trade Service Only (Port 3003)
echo  [4] Start Auth Service Only (Port 3001)
echo  [5] Open in VS Code
echo  [6] Exit
echo.

set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" goto fullapp
if "%choice%"=="2" goto frontend
if "%choice%"=="3" goto trade
if "%choice%"=="4" goto auth
if "%choice%"=="5" goto vscode
if "%choice%"=="6" exit

:fullapp
echo.
echo  Starting Full Application...
echo  ========================================
echo.

echo  [1/3] Starting Trade Service (MongoDB)...
cd backend\trade-service
start "Trade Service - Port 3003" cmd /k "npm run dev"
timeout /t 3 /nobreak > nul

echo  [2/3] Starting Auth Service...
cd ..\auth-service
start "Auth Service - Port 3001" cmd /k "npm run dev"
timeout /t 2 /nobreak > nul

echo  [3/3] Starting Frontend...
cd ..\..\frontend
start "Frontend - Port 3002" cmd /k "npm run dev"

goto end

:frontend
echo Starting Frontend...
cd frontend
start "Frontend - Port 3002" cmd /k "npm run dev"
goto end

:trade
echo Starting Trade Service...
cd backend\trade-service
start "Trade Service - Port 3003" cmd /k "npm run dev"
goto end

:auth
echo Starting Auth Service...
cd backend\auth-service
start "Auth Service - Port 3001" cmd /k "npm run dev"
goto end

:vscode
code .
goto end

:end
echo.
echo  ========================================
echo   App is starting! Check the terminal windows.
echo  ========================================
echo.
echo   Frontend:      http://localhost:3002
echo   Trade API:     http://localhost:3003
echo   Auth API:      http://localhost:3001
echo.
echo   NOTE: Backend must be running for trades to save!
echo.
pause
