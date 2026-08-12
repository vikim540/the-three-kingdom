@echo off
chcp 65001 >nul
title 三国修仙 Web MVP - 一键启动脚本

echo ==================================================
echo           三 国 修 仙  Web MVP 启 动 螺 旋
echo ==================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js 环境，请先安装 Node.js！
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo [提示] 未检测到 pnpm，正在自动安装 pnpm...
    call npm install -g pnpm
)

if not exist "node_modules" (
    echo [提示] 正在安装项目依赖包，请稍候...
    call pnpm install
)

echo.
echo ==================================================
echo  [成功] 开发服务器正在启动...
echo  浏览器请访问: http://localhost:3000
echo  按 Ctrl+C 可停止服务器
echo ==================================================
echo.

start http://localhost:3000
call pnpm dev