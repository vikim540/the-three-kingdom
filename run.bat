@echo off
chcp 65001 >nul
title 三國修仙 Web MVP - 快捷啟動腳本

echo ==================================================
echo           三 國 修 仙  Web MVP 啟 動 中
echo ==================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [錯誤] 未檢測到 Node.js 環境，請先安裝 Node.js！
    echo 下載地址: https://nodejs.org/
    pause
    exit /b 1
)

where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo [提示] 未檢測到 pnpm，將自動安裝 pnpm...
    call npm install -g pnpm
)

if not exist "node_modules" (
    echo [提示] 正在安裝項目依賴，請稍候...
    call pnpm install
)

echo [清理] 正在清理舊的 3000 埠占用與快取...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    taskkill /f /pid %%a >nul 2>&1
)

if exist ".next" (
    rd /s /q ".next" >nul 2>&1
)

echo.
echo ==================================================
echo  [成功] 服務器正在啟動中...
echo  訪問地址: http://localhost:3000
echo  按 Ctrl+C 可停止服務器
echo ==================================================
echo.

start http://localhost:3000
call pnpm dev