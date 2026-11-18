# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for the Xeptocore backend (onedir build).
#
# Build from the backend/ folder:
#   pyinstaller backend.spec --noconfirm --clean
#
# Output: backend/dist/backend/backend.exe (+ _internal/)

from PyInstaller.utils.hooks import collect_all, collect_data_files, collect_submodules

datas = [('weights', 'weights')]
binaries = []
hiddenimports = []

# OpenCV (YuNet via cv2.FaceDetectorYN, Haar cascade data fallback)
datas += collect_data_files('cv2')

# TensorFlow / Keras ship many lazily-imported modules and data files.
for pkg in ('tensorflow', 'keras'):
    try:
        d, b, h = collect_all(pkg)
        datas += d
        binaries += b
        hiddenimports += h
    except Exception as exc:
        print(f'[spec] collect_all({pkg}) skipped: {exc}')

# uvicorn[standard] loads these dynamically (protocols, loops, lifespan).
hiddenimports += collect_submodules('uvicorn')
hiddenimports += [
    'multipart',
    'python_multipart',
    'websockets',
    'h11',
]
hiddenimports += collect_submodules('app')

a = Analysis(
    ['server_entry.py'],
    pathex=['.'],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['pytest', 'tkinter', 'matplotlib', 'IPython', 'notebook'],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    # console=True is required: Electron reads the readiness line from stdout.
    # The console window is hidden by spawn(..., { windowsHide: true }).
    console=True,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    name='backend',
)
