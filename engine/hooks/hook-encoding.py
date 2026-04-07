"""PyInstaller runtime hook: force UTF-8 encoding on stdout/stderr."""
import sys
import os

os.environ.setdefault("PYTHONIOENCODING", "utf-8")

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")
