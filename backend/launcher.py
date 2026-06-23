#!/usr/bin/env python3
"""
CombFind 启动器 - 一键启动前后端服务
"""
import subprocess
import sys
import os
import time
import webbrowser
import signal
from pathlib import Path

# 配置
FRONTEND_PORT = 5173
BACKEND_PORT = 8000
FRONTEND_URL = f"http://localhost:{FRONTEND_PORT}"
BACKEND_URL = f"http://localhost:{BACKEND_PORT}"

class Launcher:
    def __init__(self):
        self.frontend_process = None
        self.backend_process = None
        self.base_dir = Path(__file__).parent.parent

    def print_banner(self):
        print("=" * 60)
        print("      CombFind - 组合数学公式检索系统")
        print("=" * 60)
        print()

    def start_backend(self):
        """启动后端服务"""
        print("📦 正在启动后端服务...")
        backend_dir = self.base_dir / "backend"
        
        try:
            # 尝试用 Python 模块方式启动
            self.backend_process = subprocess.Popen(
                [sys.executable, "-m", "uvicorn", "app.main:app", 
                 "--host", "0.0.0.0", "--port", str(BACKEND_PORT), 
                 "--reload" if os.environ.get("DEV") else ""],
                cwd=backend_dir,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
            )
            
            # 等待后端启动
            for _ in range(30):  # 最多等待 15 秒
                time.sleep(0.5)
                if self.backend_process.poll() is not None:
                    print("❌ 后端启动失败")
                    return False
                # 简单检查端口是否被占用
                try:
                    import socket
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    result = sock.connect_ex(('127.0.0.1', BACKEND_PORT))
                    sock.close()
                    if result == 0:
                        print(f"✅ 后端服务已启动: {BACKEND_URL}")
                        return True
                except:
                    pass
            
            print(f"✅ 后端服务已启动: {BACKEND_URL}")
            return True
            
        except Exception as e:
            print(f"❌ 后端启动失败: {e}")
            return False

    def start_frontend(self):
        """启动前端服务"""
        print("🎨 正在启动前端服务...")
        frontend_dir = self.base_dir / "frontend"
        
        # 检查是否已构建
        dist_dir = frontend_dir / "dist"
        if dist_dir.exists():
            # 使用 serve 提供静态文件
            print("   检测到构建文件，使用静态文件服务")
            try:
                self.frontend_process = subprocess.Popen(
                    [sys.executable, "-m", "http.server", str(FRONTEND_PORT)],
                    cwd=dist_dir,
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                )
            except:
                # 回退到开发模式
                print("   使用开发模式启动")
                self.start_frontend_dev(frontend_dir)
        else:
            print("   使用开发模式启动")
            self.start_frontend_dev(frontend_dir)
        
        # 等待前端启动
        for _ in range(20):
            time.sleep(0.5)
            if self.frontend_process and self.frontend_process.poll() is not None:
                print("❌ 前端启动失败")
                return False
            try:
                import socket
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                result = sock.connect_ex(('127.0.0.1', FRONTEND_PORT))
                sock.close()
                if result == 0:
                    print(f"✅ 前端服务已启动: {FRONTEND_URL}")
                    return True
            except:
                pass
        
        print(f"✅ 前端服务已启动: {FRONTEND_URL}")
        return True

    def start_frontend_dev(self, frontend_dir):
        """开发模式启动前端"""
        try:
            # 尝试使用 npx serve
            self.frontend_process = subprocess.Popen(
                ["npx", "serve", "-s", "dist", "-l", str(FRONTEND_PORT)],
                cwd=frontend_dir,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                shell=True,
            )
        except:
            print("   警告：未能启动前端静态服务，请手动运行 npm run dev")

    def open_browser(self):
        """打开浏览器"""
        print(f"🌐 正在打开浏览器...")
        time.sleep(2)
        webbrowser.open(FRONTEND_URL)

    def stop(self, signum=None, frame=None):
        """停止所有服务"""
        print("\n🛑 正在停止服务...")
        
        if self.frontend_process:
            if sys.platform == "win32":
                self.frontend_process.send_signal(signal.CTRL_BREAK_EVENT)
            else:
                self.frontend_process.terminate()
            self.frontend_process.wait()
            print("   前端服务已停止")
        
        if self.backend_process:
            if sys.platform == "win32":
                self.backend_process.send_signal(signal.CTRL_BREAK_EVENT)
            else:
                self.backend_process.terminate()
            self.backend_process.wait()
            print("   后端服务已停止")
        
        print("👋 再见！")
        sys.exit(0)

    def run(self):
        """运行启动器"""
        self.print_banner()
        
        # 注册信号处理
        signal.signal(signal.SIGINT, self.stop)
        if sys.platform == "win32":
            signal.signal(signal.SIGTERM, self.stop)
        
        # 启动服务
        backend_ok = self.start_backend()
        if not backend_ok:
            print("\n❌ 启动失败，请检查日志")
            input("按回车键退出...")
            return
        
        frontend_ok = self.start_frontend()
        
        # 打开浏览器
        self.open_browser()
        
        print()
        print("=" * 60)
        print(f"  系统已就绪！")
        print(f"  前端地址: {FRONTEND_URL}")
        print(f"  后端地址: {BACKEND_URL}")
        print()
        print("  按 Ctrl+C 停止服务")
        print("=" * 60)
        print()
        
        # 保持运行
        try:
            if self.backend_process:
                for line in self.backend_process.stdout:
                    print(f"[后端] {line}", end='')
        except KeyboardInterrupt:
            self.stop()

if __name__ == "__main__":
    launcher = Launcher()
    launcher.run()
