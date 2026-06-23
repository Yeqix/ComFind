#!/usr/bin/env python3
"""
CombFind one-click launcher.

Starts the FastAPI backend and the Vite frontend together.
Usage:
    python start.py
"""

from __future__ import annotations

import os
import signal
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
DATA_DIR = BACKEND_DIR / "app" / "data"
BACKEND_URL = "http://127.0.0.1:8001"
FRONTEND_URL = "http://localhost:5173"


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(errors="replace")


def print_banner() -> None:
    print("=" * 60)
    print("         CombFind - formula search system")
    print("=" * 60)
    print()


def command_exists(command: str) -> bool:
    try:
        subprocess.run(
            [command, "--version"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
        return True
    except OSError:
        return False


def npm_command() -> str:
    return "npm.cmd" if os.name == "nt" else "npm"


def check_python_deps() -> bool:
    req_file = BACKEND_DIR / "requirements.txt"
    if not req_file.exists():
        print("[WARN] backend/requirements.txt not found; skipping Python dependency check.")
        return True

    try:
        import fastapi  # noqa: F401
        import uvicorn  # noqa: F401

        print("[OK] Python dependencies are installed.")
        return True
    except ImportError:
        print("[INFO] Installing Python dependencies...")

    try:
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "-r", str(req_file)],
            cwd=str(BACKEND_DIR),
        )
        print("[OK] Python dependencies installed.")
        return True
    except subprocess.CalledProcessError as exc:
        print(f"[ERROR] Failed to install Python dependencies: {exc}")
        print(f"[HINT] Run manually: {sys.executable} -m pip install -r {req_file}")
        return False


def check_node_deps() -> bool:
    package_json = FRONTEND_DIR / "package.json"
    node_modules = FRONTEND_DIR / "node_modules"

    if not package_json.exists():
        print("[ERROR] frontend/package.json not found.")
        return False

    npm = npm_command()
    if not command_exists(npm):
        print("[ERROR] npm was not found. Please install Node.js 16+.")
        return False

    if node_modules.exists():
        print("[OK] Frontend dependencies are installed.")
        return True

    print("[INFO] Installing frontend dependencies with npm install...")
    try:
        subprocess.check_call([npm, "install"], cwd=str(FRONTEND_DIR))
        print("[OK] Frontend dependencies installed.")
        return True
    except subprocess.CalledProcessError as exc:
        print(f"[ERROR] Failed to install frontend dependencies: {exc}")
        print(f"[HINT] Run manually: {npm} install")
        return False


def init_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    print(f"[OK] Data directory: {DATA_DIR}")
    print()


def start_backend() -> subprocess.Popen[str]:
    print("[INFO] Starting backend service...")
    return subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8001",
            "--reload",
        ],
        cwd=str(BACKEND_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
    )


def start_frontend() -> subprocess.Popen[str] | None:
    print("[INFO] Starting frontend service...")
    try:
        return subprocess.Popen(
            [npm_command(), "run", "dev"],
            cwd=str(FRONTEND_DIR),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
        )
    except OSError as exc:
        print(f"[ERROR] Failed to start frontend service: {exc}")
        return None


def wait_for_service(url: str, timeout: int = 30) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=1):
                return True
        except urllib.error.URLError:
            time.sleep(0.5)
        except Exception:
            time.sleep(0.5)
    return False


def log_output(process: subprocess.Popen[str] | None, name: str) -> None:
    if not process or not process.stdout:
        return

    for line in iter(process.stdout.readline, ""):
        if line:
            print(f"[{name}] {line}", end="")


class Launcher:
    def __init__(self) -> None:
        self.backend_process: subprocess.Popen[str] | None = None
        self.frontend_process: subprocess.Popen[str] | None = None
        self.running = True

    def stop(self, signum=None, frame=None) -> None:
        print("\n[INFO] Stopping services...")
        self.running = False

        self._stop_process(self.backend_process, "Backend")
        self._stop_process(self.frontend_process, "Frontend")

        print("[OK] All services stopped.")
        raise SystemExit(0)

    @staticmethod
    def _stop_process(process: subprocess.Popen[str] | None, name: str) -> None:
        if not process or process.poll() is not None:
            return

        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
        print(f"[OK] {name} service stopped.")

    def run(self) -> None:
        print_banner()
        init_data_dir()

        if not check_python_deps():
            raise SystemExit(1)
        print()

        if not check_node_deps():
            raise SystemExit(1)
        print()

        signal.signal(signal.SIGINT, self.stop)
        if hasattr(signal, "SIGTERM"):
            signal.signal(signal.SIGTERM, self.stop)

        self.backend_process = start_backend()
        print("[INFO] Waiting for backend...", end="", flush=True)
        if wait_for_service(BACKEND_URL, timeout=30):
            print(" ready")
            print(f"[INFO] API: {BACKEND_URL}")
            print(f"[INFO] Docs: {BACKEND_URL}/docs")
        else:
            print(" timeout")
            print("[WARN] Backend may not have started correctly. Check logs below.")
        print()

        self.frontend_process = start_frontend()
        if self.frontend_process:
            print("[INFO] Waiting for frontend...", end="", flush=True)
            if wait_for_service(FRONTEND_URL, timeout=30):
                print(" ready")
                print(f"[INFO] Frontend: {FRONTEND_URL}")
            else:
                print(" timeout")
                print("[WARN] Frontend may not have started correctly. Check logs below.")
        print()

        if os.environ.get("COMBFIND_NO_BROWSER") != "1" and wait_for_service(FRONTEND_URL, timeout=1):
            print("[INFO] Opening browser...")
            webbrowser.open(FRONTEND_URL)

        print()
        print("=" * 60)
        print("  CombFind is running")
        print(f"  Frontend: {FRONTEND_URL}")
        print(f"  API:      {BACKEND_URL}")
        print(f"  Docs:     {BACKEND_URL}/docs")
        print("  Press Ctrl+C to stop all services.")
        print("=" * 60)
        print()

        self._start_log_threads()
        self._watch_processes()

    def _start_log_threads(self) -> None:
        if self.backend_process:
            backend_log = threading.Thread(
                target=log_output,
                args=(self.backend_process, "backend"),
                daemon=True,
            )
            backend_log.start()

        if self.frontend_process:
            frontend_log = threading.Thread(
                target=log_output,
                args=(self.frontend_process, "frontend"),
                daemon=True,
            )
            frontend_log.start()

    def _watch_processes(self) -> None:
        try:
            while self.running:
                time.sleep(1)
                if self.backend_process and self.backend_process.poll() is not None:
                    print("\n[WARN] Backend service exited.")
                    break
                if self.frontend_process and self.frontend_process.poll() is not None:
                    print("\n[WARN] Frontend service exited.")
                    break
        except KeyboardInterrupt:
            pass
        finally:
            self.stop()


if __name__ == "__main__":
    Launcher().run()
