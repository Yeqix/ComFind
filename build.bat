@echo off
chcp 65001 >nul
echo ==========================================
echo     CombFind 构建脚本
echo ==========================================
echo.

REM 检查 Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Python，请确保已安装并添加到 PATH
    pause
    exit /b 1
)

REM 检查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Node.js，请确保已安装并添加到 PATH
    pause
    exit /b 1
)

echo [1/5] 安装后端依赖...
cd backend
pip install -r requirements-build.txt -q
if errorlevel 1 (
    echo [错误] 后端依赖安装失败
    pause
    exit /b 1
)

echo [2/5] 安装前端依赖...
cd ..\frontend
call npm install --silent
if errorlevel 1 (
    echo [错误] 前端依赖安装失败
    pause
    exit /b 1
)

echo [3/5] 构建前端...
call npm run build 2>nul
if errorlevel 1 (
    echo [警告] 前端构建失败，将使用开发模式
)

echo [4/5] 打包启动器...
cd ..\backend
pyinstaller --onefile --name CombFind --icon=none --console launcher.py
if errorlevel 1 (
    echo [错误] PyInstaller 打包失败
    pause
    exit /b 1
)

echo [5/5] 创建快捷方式...
if not exist ..\dist mkdir ..\dist
xcopy /E /I /Y ..\frontend\dist ..\dist\frontend >nul 2>&1
copy dist\CombFind.exe ..\dist\CombFind.exe >nul

echo.
echo ==========================================
echo     构建完成！
echo ==========================================
echo.
echo 可执行文件位于: dist\CombFind.exe
echo.
pause
