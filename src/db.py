from pathlib import Path
from typing import Iterator

from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.engine import Connection


DB_URL = "sqlite:///./data/app.db"

# Ensure data directory exists
Path("data").mkdir(parents=True, exist_ok=True)

engine = create_engine(DB_URL, connect_args={"check_same_thread": False})


def SessionLocal() -> Session:
    return Session(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session


def ensure_column(conn: Connection, table: str, column: str, type_sql: str) -> None:
    """Ensure a column exists on an SQLite table; add it if missing.

    Uses PRAGMA table_info to check existing columns.
    """
    res = conn.exec_driver_sql(f"PRAGMA table_info({table})")
    existing = {row[1] for row in res.fetchall()}  # row[1] is column name
    if column not in existing:
        conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {column} {type_sql}")


def append_audit(line: str) -> None:
    """Append a single line to the audit log under data/audit.log."""
    Path("data").mkdir(parents=True, exist_ok=True)
    with open("data/audit.log", "a", encoding="utf-8") as f:
        f.write(line.rstrip() + "\n")
