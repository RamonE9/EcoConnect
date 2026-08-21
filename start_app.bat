@echo off
echo ===================================================
echo   Starting EcoConnect System...
echo ===================================================
echo.

echo [CHECK] Environment ready for SQLite...
echo.

:: 2. Setup Backend if needed
echo [BACKEND] Checking environment...
cd django_backend
if not exist venv (
    echo [INFO] Virtual environment not found. Creating...
    python -m venv venv
    call venv\Scripts\activate
    echo [INFO] Installing requirements...
    pip install -r requirements.txt
)
cd ..

:: 3. Setup Frontend & Build
echo [FRONTEND] Preparing assets...
cd frontend
if not exist node_modules (
    echo [INFO] Node modules not found. Installing...
    call npm install
)
echo [INFO] Building React app...
call npm run build
cd ..

:: 4. Launch Consolidated Server
echo [LAUNCH] Starting EcoConnect System on port 8000...
echo.
echo ===================================================
echo  EcoConnect is launching!
echo  URL: http://localhost:8000
echo ===================================================
echo.

cd django_backend
call run.bat
pause
