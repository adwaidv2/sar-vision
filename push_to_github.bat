@echo off
setlocal enabledelayedexpansion
title Push to GitHub: adwaidv2/sar-vision
color 0B

echo =======================================================================
echo    SAR-Vision AI: One-Click Push to GitHub
echo    Target Repository: https://github.com/adwaidv2/sar-vision.git
echo =======================================================================
echo.

set GIT_EXE="C:\Users\adwai\AppData\Local\github-copilot-git-2.53.0-4\cmd\git.exe"
cd /d "C:\Users\adwai\.gemini\antigravity\scratch\sar-translation-terrain-analysis"

echo [1/3] Ensuring remote origin is set...
%GIT_EXE% remote remove origin 2>nul
%GIT_EXE% remote add origin https://github.com/adwaidv2/sar-vision.git
%GIT_EXE% branch -M main

echo.
echo Choose authentication method:
echo   [1] Standard Push (Browser Sign-in / Git Credential Manager)
echo   [2] Push with GitHub Personal Access Token (PAT)
echo.
set /p AUTH_CHOICE="Enter choice [1 or 2, default is 1]: "

if "%AUTH_CHOICE%"=="2" (
    echo.
    echo To create a PAT: GitHub -> Settings -> Developer Settings -> Personal access tokens (classic) -> tick 'repo'
    set /p GITHUB_TOKEN="Paste your GitHub Personal Access Token: "
    if not "!GITHUB_TOKEN!"=="" (
        echo.
        echo [2/3] Pushing with Token...
        %GIT_EXE% push https://adwaidv2:!GITHUB_TOKEN!@github.com/adwaidv2/sar-vision.git main -u
        goto PUSH_CHECK
    )
)

echo.
echo [2/3] Initiating push... (A browser window or sign-in popup will appear)
%GIT_EXE% push -u origin main

:PUSH_CHECK
echo.
if %ERRORLEVEL% EQU 0 (
    echo =======================================================================
    echo   SUCCESS! All project files are now live on GitHub:
    echo   https://github.com/adwaidv2/sar-vision
    echo =======================================================================
) else (
    echo =======================================================================
    echo   Push could not complete.
    echo   If browser sign-in did not pop up, re-run this script and choose
    echo   Option [2] using a Personal Access Token (PAT).
    echo =======================================================================
)

echo.
pause
