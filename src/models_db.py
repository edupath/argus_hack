from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import SQLModel, Field, Relationship


class UserState(SQLModel, table=True):
    id: str = Field(primary_key=True)
    goals: Optional[str] = None
    constraints: Optional[str] = None
    preferences: Optional[str] = None

    messages: list[Message] = Relationship(back_populates="user")


class Message(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="userstate.id")
    text: str
    ts: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    user: Optional[UserState] = Relationship(back_populates="messages")

