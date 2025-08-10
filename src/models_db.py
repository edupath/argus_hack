from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import SQLModel, Field


class UserState(SQLModel, table=True):
    id: str = Field(primary_key=True)
    goals: Optional[str] = None
    constraints: Optional[str] = None
    preferences: Optional[str] = None


class Message(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="userstate.id")
    text: str
    ts: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reasoning: Optional[str] = None


class PartnerJob(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str
    program_name: str
    payload: str  # JSON string
    status: str = Field(default="queued")  # queued | sent | error
    last_error: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
class AssessmentResult(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="userstate.id")
    assessment: str  # e.g., "logic-5q"
    score: int
    max_score: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
