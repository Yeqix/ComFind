# CombFind 打包指南

## 方法一：快速启动（推荐开发使用）

直接双击运行 `start.bat`，会自动启动前后端服务。

## 方法二：构建独立 EXE

### 步骤 1：构建前端

```powershell
cd frontend
npm install
npm run build
```

### 步骤 2：安装打包依赖

```powershell
cd backend
pip install pyinstaller
```

### 步骤 3：创建启动器

创建 `backend/app_launcher.py`：

```python
#!/usr/bin/env python3
import subprocess
import sys
import time
import webbrowser
import signal
import os
from pathlib import Path

def start_services():
    base_dir = Path(__file__).parent.parent
    
    # 启动后端
    print("🚀 启动后端服务...")
    backend = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--port", "8000"],
        cwd=base_dir / "backend"
    )
    
    # 启动前端（静态文件）
    print("🎨 启动前端服务...")
    frontend_dir = base_dir / "frontend" / "dist"
    if frontend_dir.exists():
        frontend = subprocess.Popen(
            [sys.executable, "-m", "http.server", "5173"],
            cwd=frontend_dir
        )
    else:
        print("⚠️ 前端未构建，请先运行 npm run build")
        return
    
    # 等待服务启动
    time.sleep(3)
    
    # 打开浏览器
    print("🌐 正在打开浏览器...")
    webbrowser.open("http://localhost:5173")
    
    print("\n✅ 系统已就绪！")
    print("📍 前端: http://localhost:5173")
    print("🔧 后端: http://localhost:8000")
    print("\n按 Ctrl+C 停止服务\n")
    
    try:
        backend.wait()
    except KeyboardInterrupt:
        print("\n🛑 停止服务...")
        backend.terminate()
        frontend.terminate()

if __name__ == "__main__":
    start_services()
```

### 步骤 4：打包

```powershell
cd backend
pyinstaller --onefile --name CombFind --icon=NONE app_launcher.py
```

打包完成后，exe 文件位于 `backend/dist/CombFind.exe`。

### 步骤 5：分发

将以下文件/文件夹打包：

```
CombFind.exe          # 启动器
frontend/dist/        # 前端静态文件
```

## 方法三：使用 Docker（推荐生产环境）

创建 `docker-compose.yml`：

```yaml
version: '3'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
  frontend:
    build: ./frontend
    ports:
      - "5173:80"
```

## 常见问题

### 1. 端口被占用

修改 `start.bat` 中的端口：
- 后端：修改 `--port 8000` 为其他端口
- 前端：修改 `5173` 为其他端口

### 2. 前端构建失败

确保已安装 Node.js：
```powershell
node --version  # 应显示 v18+ 或 v20+
```

### 3. PyInstaller 打包失败

安装 Microsoft Visual C++ Redistributable：
https://aka.ms/vs/17/release/vc_redist.x64.exe

## 简化版一键脚本

最简单的方式是直接使用批处理文件 `start.bat`，无需打包成 exe：

1. 双击 `start.bat`
2. 等待几秒
3. 浏览器自动打开 http://localhost:5173

关闭命令窗口即可停止服务。
