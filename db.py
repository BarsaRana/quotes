import os
from typing import Generator, Optional, Dict, Any
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

# Load .env BEFORE reading env vars
try:
    from dotenv import load_dotenv  # pip install python-dotenv
    load_dotenv()
except Exception:
    pass

def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default

def _build_connect_args() -> Dict[str, Any]:
    args: Dict[str, Any] = {}
    args["connect_timeout"] = _env_int("DB_CONNECT_TIMEOUT", 5)
    sslmode = os.getenv("DB_SSLMODE")
    if sslmode:
        args["sslmode"] = sslmode
    stmt_timeout_ms = os.getenv("DB_STATEMENT_TIMEOUT_MS")
    if stmt_timeout_ms and stmt_timeout_ms.isdigit():
        args["options"] = f"-c statement_timeout={stmt_timeout_ms}"
    return args

def _compose_url_from_split_envs() -> Optional[str]:
    user = os.getenv("PGUSER","postgres")
    pwd = os.getenv("PGPASSWORD","2580")
    host = os.getenv("PGHOST", "localhost")
    port = os.getenv("PGPORT", "5433")
    db   = os.getenv("PGDATABASE","postgres")
    if not (user and pwd and db):
        return None
    return f"postgresql+psycopg2://{user}:{pwd}@{host}:{port}/{db}"

def _effective_database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if url:
        return url
    split = _compose_url_from_split_envs()
    if split:
        return split
    return "postgresql+psycopg2://postgres:postgres@localhost:5432/postgres?connect_timeout=5"

def _build_engine() -> Engine:
    database_url = _effective_database_url()
    pool_size = _env_int("DB_POOL_SIZE", 5)
    max_overflow = _env_int("DB_MAX_OVERFLOW", 10)
    pool_timeout = _env_int("DB_POOL_TIMEOUT", 30)
    pool_recycle = _env_int("DB_POOL_RECYCLE", 1800)
    engine = create_engine(
        database_url,
        pool_pre_ping=True,
        pool_size=pool_size,
        max_overflow=max_overflow,
        pool_timeout=pool_timeout,
        pool_recycle=pool_recycle,
        connect_args=_build_connect_args(),
        future=True,
    )
    return engine

# Global engine & Session factory
engine: Engine = _build_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, class_=Session, future=True)

def get_db() -> Generator[Session, None, None]:
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_connection(raise_on_error: bool = False) -> Optional[str]:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return None
    except Exception as e:
        if raise_on_error:
            raise
        return str(e)
