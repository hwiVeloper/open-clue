# -*- mode: python ; coding: utf-8 -*-
import glob

scenario_datas = [(f, 'scenarios') for f in glob.glob('scenarios/*.dat')]

a = Analysis(
    ['clue\\main.py'],
    pathex=[],
    binaries=[],
    datas=scenario_datas,
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=['hooks/hook-encoding.py'],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='OpenClue',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='../assets/favicon_key.ico',
)
