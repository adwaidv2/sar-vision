@echo off
title Push to GitHub - SAR Image Translation and Terrain Analysis
echo =======================================================================
echo   Push Project to GitHub
echo =======================================================================
echo.
set /p REPO_URL="Enter your GitHub Repository URL (e.g., https://github.com/username/repo.git): "

if "%REPO_URL%"=="" (
    echo Error: No repository URL provided.
    pause
    exit /b
)

set GIT_EXE="C:\Users\adwai\AppData\Local\github-copilot-git-2.53.0-4\cmd\git.exe"

echo.
echo Setting remote origin to: %REPO_URL%
%GIT_EXE% remote remove origin 2>nul
%GIT_EXE% remote add origin %REPO_URL%

echo Renaming branch to main...
%GIT_EXE% branch -M main

echo Pushing code to GitHub...
%GIT_EXE% push -u origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo =======================================================================
    echo   SUCCESSFULLY PUSHED TO GITHUB!
    echo =======================================================================
) else (
    echo Push encountered an issue. Please ensure your repository is created
    echo and your GitHub credentials or Personal Access Token are active.
)
echo.
pause
