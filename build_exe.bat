@echo off

echo =========================================
echo    Build CombFind EXE
echo =========================================

cd /d "%~dp0backend"

echo [1/3] Installing pyinstaller...
pip install pyinstaller -q

echo [2/3] Building frontend...
cd ..\frontend
call npm install
call npm run build

echo [3/3] Packaging...
cd ..\backend
pyinstaller --onefile --name CombFind --console app_launcher.py

echo.
echo Done! Output: backend\dist\CombFind.exe
pause
