from pathlib import Path
from typing import Iterator

from sqlmodel import SQLModel, Session, create_engine


DB_URL = "sqlite:///./data/app.db"

# Ensure data directory exists
Path("data").mkdir(parents=True, exist_ok=True)

engine = create_engine(DB_URL, connect_args={"check_same_thread": False})


def SessionLocal() -> Session:
    return Session(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session

