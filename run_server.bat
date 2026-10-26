@echo off
title AI-Based SAR Image Translation and Terrain Analysis Server
echo =======================================================================
echo   AI-Based SAR Image Translation and Terrain Analysis
echo   Starting Academic Demonstration Server...
echo =======================================================================
echo.
echo Launching Python server on http://localhost:8000
echo.

start "" "http://localhost:8000"
python backend\server.py 8000
pause
