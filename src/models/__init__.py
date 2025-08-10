from pydantic import BaseModel
from typing import Optional


class StudentProfile(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    goals: Optional[str] = None
    constraints: Optional[str] = None
    preferences: Optional[str] = None


class ProgramMatch(BaseModel):
    program_name: str
    rationale: str


class ProgramRequirements(BaseModel):
    program_id: str
    prerequisites: list[str]
    deadlines: dict[str, str]
    materials: list[str]
