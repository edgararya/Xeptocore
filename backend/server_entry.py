"""Entry point for the packaged (PyInstaller) backend.

Picks a free local port, exposes it through the PORT env var (read by the
lifespan hook in app/main.py, which prints the readiness line that Electron's
pythonBridge.js waits for), and runs uvicorn without reload.

Dev usage is unchanged: run.py / Docker still work as before.
"""

import multiprocessing
import os
import socket
import sys


def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def main() -> None:
    # Some frozen builds have no console streams; uvicorn/print must not crash.
    if sys.stdout is None:
        sys.stdout = open(os.devnull, "w")
    if sys.stderr is None:
        sys.stderr = open(os.devnull, "w")

    os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
    os.environ.setdefault("PYTHONUNBUFFERED", "1")

    port = _find_free_port()
    os.environ["PORT"] = str(port)

    # Imported here so PyInstaller's analysis sees it and so the env is ready first.
    import uvicorn
    from app.main import app

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        reload=False,
        log_config=None,  # default log config breaks in frozen builds
    )


if __name__ == "__main__":
    multiprocessing.freeze_support()
    main()
