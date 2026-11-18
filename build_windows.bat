@echo off
title Xeptocore - Build Windows Installer
setlocal

set ROOT=%~dp0

echo ========================================================
echo   [1/4] Menyiapkan virtualenv build backend (Python 3.10)
echo ========================================================
cd /d "%ROOT%backend"
if not exist .venv-build (
    py -3.10 -m venv .venv-build
    if errorlevel 1 (
        echo [ERROR] Gagal membuat virtualenv. Pastikan Python 3.10 terpasang ^(perintah: py -3.10^).
        exit /b 1
    )
)
call .venv-build\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt pyinstaller
if errorlevel 1 (
    echo [ERROR] Gagal memasang dependensi backend.
    exit /b 1
)

echo.
echo ========================================================
echo   [2/4] Membangun backend.exe dengan PyInstaller (onedir)
echo ========================================================
pyinstaller backend.spec --noconfirm --clean
if errorlevel 1 (
    echo [ERROR] PyInstaller gagal.
    exit /b 1
)
if not exist dist\backend\backend.exe (
    echo [ERROR] dist\backend\backend.exe tidak ditemukan setelah build.
    exit /b 1
)

echo.
echo ========================================================
echo   [3/4] Memasang dependensi frontend
echo ========================================================
cd /d "%ROOT%frontend"
call npm install
if errorlevel 1 (
    echo [ERROR] npm install gagal.
    exit /b 1
)

echo.
echo ========================================================
echo   [4/4] Membangun installer (electron-builder, NSIS)
echo ========================================================
call npm run dist
if errorlevel 1 (
    echo [ERROR] Build installer gagal.
    exit /b 1
)

echo.
echo ========================================================
echo   Selesai. Installer ada di: frontend\release
echo ========================================================
endlocal
pause
