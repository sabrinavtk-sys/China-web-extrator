import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

def normalizar_database_url(url):
    if not url:
        return None
    url = str(url).strip()
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://"):]
    return url

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "nc-pro-dev-local")
    DATABASE_URL = normalizar_database_url(os.getenv("DATABASE_URL"))

    # Online: use DATABASE_URL.
    # Local: se DATABASE_URL não existir, usa SQLite automaticamente.
    SQLALCHEMY_DATABASE_URI = (
        DATABASE_URL
        if DATABASE_URL
        else "sqlite:///" + str(BASE_DIR / "banco_local.db")
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
    }
    SEND_FILE_MAX_AGE_DEFAULT = 0
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.getenv("HTTPS", "1" if (os.getenv("VERCEL") or os.getenv("RENDER")) else "0") == "1"
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
