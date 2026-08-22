@echo off
echo ========================================
echo  NeuralFlow V3 - Quick Start Script
echo ========================================
echo.
echo Starting Backend Server...
cd backend
start cmd /k "npm start"
timeout /t 3 /nobreak > nul
echo.
echo Starting Frontend Server...
cd ..\frontend
start cmd /k "npm run dev"
timeout /t 3 /nobreak > nul
echo.
echo ========================================
echo  Servers Starting...
echo ========================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Wait 5 seconds, then open your browser!
echo.
timeout /t 5 /nobreak
start http://localhost:5173
echo.
echo Project launched successfully!
echo Close this window anytime.
pause
