import os
import sys

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

os.environ.setdefault("YARO_FORCE_HTTP", "1")
os.environ.setdefault("DATA_DIR", "/tmp/maquette-yaro")
os.environ.setdefault("ADMIN_SECRET_PATH", "espace-prive-maquette-yaro-2026")
os.environ.setdefault(
    "YARO_ORIGINS",
    "https://maquette-romi-oyo.vercel.app,http://localhost:8080,http://127.0.0.1:8080",
)
os.makedirs(os.environ["DATA_DIR"], exist_ok=True)

import server as yaro_server


class handler(yaro_server.YaroHandler):
    pass
