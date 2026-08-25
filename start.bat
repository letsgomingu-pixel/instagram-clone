@echo off
chcp 65001 >nul
title Instagram Clone

echo.
echo  ========================================
echo    Instagram Clone
echo  ========================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js가 설치되어 있지 않습니다.
    echo         https://nodejs.org
    pause
    exit /b 1
)

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python이 설치되어 있지 않습니다.
    echo         https://python.org
    pause
    exit /b 1
)

cd /d "%~dp0"
npm run dev

if %errorlevel% neq 0 pause
