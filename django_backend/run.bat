@echo off
setlocal
title EcoConnect Backend Server

echo ==========================================
echo    ECOCONNECT SYSTEM BOOT SEQUENCE
echo ==========================================

if not exist venv (
    echo [ERROR] Virtual environment not found.
    echo Creating virtual environment...
    python -m venv venv
)

if not exist .env (
    echo [WARNING] .env file missing. 
    echo Creating template .env...
    echo GEMINI_API_KEY=your_actual_api_key_here > .env
)

echo [1/2] Syncing Database...
call venv\Scripts\python manage.py migrate --noinput

echo [2/2] Launching Intelligence Core...
echo ------------------------------------------
echo Server active at http://localhost:8000
echo Press Ctrl+C to stop the mission.
echo ------------------------------------------

call venv\Scripts\python manage.py runserver 0.0.0.0:8000

pause
