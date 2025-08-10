from pathlib import Path
import os
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
    """Append a single line to the audit log under data/audit.log.

    Performs a simple rotation if the current log exceeds 5MB by renaming
    audit.log to audit.1.log before writing the new line.
    """
    Path("data").mkdir(parents=True, exist_ok=True)

    log_path = Path("data/audit.log")
    backup_path = Path("data/audit.1.log")

    # Simple rotation: if log > 5MB, move to audit.1.log
    try:
        if log_path.exists() and log_path.stat().st_size > 5 * 1024 * 1024:
            # Remove previous backup if present to allow rename
            try:
                backup_path.unlink()
            except FileNotFoundError:
                pass
            log_path.rename(backup_path)
    except OSError:
        # If rotation fails, continue best-effort appending
        pass

    with open(log_path, "a", encoding="utf-8") as f:
        f.write(line.rstrip() + "\n")
