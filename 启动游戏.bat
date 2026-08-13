@echo off
title Three Kingdoms Xianxia Game Launcher
cd /d "%~dp0"

echo ==================================================
echo        Three Kingdoms Game Launcher
echo ==================================================
echo.

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

echo [1/2] Cleaning background processes and cache...
taskkill /F /IM node.exe /T >nul 2>&1
if exist ".next" rd /s /q ".next" >nul 2>&1

echo [2/2] Starting game server on http://localhost:3000 ...
echo.

start http://localhost:3000
call npx next dev -p 3000

if %errorlevel% neq 0 (
    echo.
    echo Server stopped.
    pause
)