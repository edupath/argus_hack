from pydantic import BaseModel, Field
from typing import List, Optional


class StudentProfile(BaseModel):
    name: str
    email: str
    goals: List[str] = Field(default_factory=list)
    constraints: List[str] = Field(default_factory=list)
    preferences: List[str] = Field(default_factory=list)


class ProgramMatch(BaseModel):
    program_id: str
    program_name: str
    provider: Optional[str] = None
    score: float
    rationale: Optional[str] = None

