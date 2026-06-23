#!/usr/bin/env python3
"""
CombFind 一站式启动器
同时启动后端 API 和前端服务
"""
import subprocess
import sys
import time
import webbrowser
import signal
import os
from pathlib import Path
import threading

def print_banner():
    print("=" * 60)
    print("         CombFind - 组合数学公式检索系统")
    print("=" * 60)
    print()

def check_dependencies():
    """检查必要的依赖"""
    try:
        import fastapi
        import uvicorn
    except ImportError:
        print("❌ 缺少后端依赖，正在安装...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ 依赖安装完成\n")

def start_backend():
    """启动 FastAPI 后端"""
    print("📦 启动后端服务...")
    backend_dir = Path(__file__).parent
    
    # 使用 uvicorn 启动
    process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", 
         "--host", "127.0.0.1", "--port", "8001"],
        cwd=str(backend_dir),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
    )
    return process

def start_frontend():
    """启动前端服务"""
    print("🎨 启动前端服务...")
    base_dir = Path(__file__).parent.parent
    frontend_dir = base_dir / "frontend"
    dist_dir = frontend_dir / "dist"
    
    if dist_dir.exists() and (dist_dir / "index.html").exists():
        # 使用 Python 的 http.server 提供静态文件
        print("   使用构建后的静态文件")
        process = subprocess.Popen(
            [sys.executable, "-m", "http.server", "5173"],
            cwd=str(dist_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
        )
    else:
        print("   使用 Vite 开发服务器")
        # 检查 npm 是否可用
        try:
            process = subprocess.Popen(
                ["npm", "run", "dev"],
                cwd=str(frontend_dir),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                shell=True,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
            )
        except Exception as e:
            print(f"   ⚠️ 前端启动失败: {e}")
            print("   请确保已安装 Node.js 并运行过 npm install")
            return None
    
    return process

def wait_for_service(url, timeout=30):
    """等待服务启动"""
    import urllib.request
    import urllib.error
    
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            urllib.request.urlopen(url, timeout=1)
            return True
        except urllib.error.URLError:
            time.sleep(0.5)
        except Exception:
            time.sleep(0.5)
    return False

def log_output(process, name):
    """输出进程日志"""
    if process and process.stdout:
        for line in iter(process.stdout.readline, ''):
            if line:
                print(f"[{name}] {line}", end='')

class Launcher:
    def __init__(self):
        self.backend_process = None
        self.frontend_process = None
        self.running = True
    
    def stop(self, signum=None, frame=None):
        """停止所有服务"""
        print("\n🛑 正在停止服务...")
        self.running = False
        
        if self.backend_process:
            self.backend_process.terminate()
            try:
                self.backend_process.wait(timeout=5)
            except:
                self.backend_process.kill()
            print("   后端服务已停止")
        
        if self.frontend_process:
            self.frontend_process.terminate()
            try:
                self.frontend_process.wait(timeout=5)
            except:
                self.frontend_process.kill()
            print("   前端服务已停止")
        
        print("\n👋 再见！")
        sys.exit(0)
    
    def run(self):
        print_banner()
        
        # 检查依赖
        check_dependencies()
        
        # 注册信号处理
        signal.signal(signal.SIGINT, self.stop)
        if hasattr(signal, 'SIGTERM'):
            signal.signal(signal.SIGTERM, self.stop)
        
        # 启动后端
        self.backend_process = start_backend()
        
        # 等待后端启动
        print("   等待后端就绪...", end="", flush=True)
        if wait_for_service("http://127.0.0.1:8001", timeout=30):
            print(" ✅")
            print("   API: http://127.0.0.1:8001")
            print("   Docs: http://127.0.0.1:8001/docs\n")
        else:
            print(" ⚠️")
            print("   后端可能未正常启动，请检查日志\n")
        
        # 启动前端
        self.frontend_process = start_frontend()
        
        # 等待前端启动
        if self.frontend_process:
            print("   等待前端就绪...", end="", flush=True)
            if wait_for_service("http://127.0.0.1:5173", timeout=30):
                print(" ✅")
                print("   前端: http://127.0.0.1:5173\n")
            else:
                print(" ⚠️")
                print("   前端可能未正常启动\n")
        
        # 打开浏览器
        print("🌐 正在打开浏览器...")
        time.sleep(1)
        webbrowser.open("http://127.0.0.1:5173")
        
        # 显示信息
        print()
        print("=" * 60)
        print("  🎉 CombFind 已就绪！")
        print()
        print("  📝 前端界面: http://127.0.0.1:5173")
        print("  🔧 API 接口: http://127.0.0.1:8001")
        print("  📚 API 文档: http://127.0.0.1:8001/docs")
        print()
        print("  ⚠️ 按 Ctrl+C 停止所有服务")
        print("=" * 60)
        print()
        
        # 启动日志线程
        if self.backend_process:
            backend_log = threading.Thread(target=log_output, args=(self.backend_process, "后端"))
            backend_log.daemon = True
            backend_log.start()
        
        # 保持运行
        try:
            while self.running:
                time.sleep(1)
                # 检查进程是否存活
                if self.backend_process and self.backend_process.poll() is not None:
                    print("\n⚠️ 后端服务已退出")
                    break
                if self.frontend_process and self.frontend_process.poll() is not None:
                    print("\n⚠️ 前端服务已退出")
                    break
        except KeyboardInterrupt:
            pass
        finally:
            self.stop()

if __name__ == "__main__":
    launcher = Launcher()
    launcher.run()
