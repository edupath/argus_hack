from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict, List, Optional

from .models import StudentProfile, ProgramMatch

app = FastAPI(title="Agentic Educational Advisor")

# In-memory conversational state
STATE: Dict[str, Dict[str, object]] = {}


@app.get("/")
def root():
    return {"status": "ok"}


class ChatRequest(BaseModel):
    user_id: str
    message: str


def _ensure_user(user_id: str) -> Dict[str, object]:
    entry = STATE.get(user_id)
    if not entry:
        entry = {"profile": StudentProfile(), "history": []}
        STATE[user_id] = entry
    return entry


def _missing_fields(profile: StudentProfile) -> List[str]:
    missing: List[str] = []
    if not profile.goals:
        missing.append("goals")
    if not profile.constraints:
        missing.append("constraints")
    if not profile.preferences:
        missing.append("preferences")
    return missing


def _question_for(field: str) -> str:
    if field == "goals":
        return "What are your learning goals?"
    if field == "constraints":
        return "Any time or budget constraints?"
    return "Any preferences for learning mode or location?"


def _apply_heuristics(profile: StudentProfile, message: str) -> None:
    text = message.strip()
    low = text.lower()

    def extract_after(prefix: str) -> Optional[str]:
        idx = low.find(prefix)
        if idx != -1:
            return text[idx + len(prefix):].strip(" :-") or None
        return None

    # Explicit prefixes win
    g = extract_after("goals:") or extract_after("goal:")
    c = extract_after("constraints:") or extract_after("constraint:")
    p = extract_after("preferences:") or extract_after("preference:")

    if g and not profile.goals:
        profile.goals = g
    if c and not profile.constraints:
        profile.constraints = c
    if p and not profile.preferences:
        profile.preferences = p

    # Fallback keyword-based assignment if still missing
    if not profile.goals and ("goal" in low or "learn" in low):
        profile.goals = text
    if not profile.constraints and any(k in low for k in ("constraint", "time", "budget")):
        profile.constraints = text
    if not profile.preferences and any(k in low for k in ("prefer", "mode", "location", "online", "in-person")):
        profile.preferences = text


def _mock_matches(profile: StudentProfile) -> List[ProgramMatch]:
    goals = profile.goals or "your goals"
    return [
        ProgramMatch(program_name="Data Analyst Bootcamp", rationale=f"Aligned with {goals}; project-based, job-focused"),
        ProgramMatch(program_name="Intro to Data Science (Online)", rationale=f"Flexible pacing; supports {goals}")
    ]


@app.post("/chat")
def chat(req: ChatRequest):
    user = _ensure_user(req.user_id)
    profile: StudentProfile = user["profile"]  # type: ignore[assignment]
    history: List[str] = user["history"]  # type: ignore[assignment]

    history.append(req.message)
    _apply_heuristics(profile, req.message)

    missing = _missing_fields(profile)
    if missing:
        q = _question_for(missing[0])
        return {"reply": q, "next_questions": [q]}

    matches = _mock_matches(profile)
    summary = (
        f"Summary: goals={profile.goals}; constraints={profile.constraints}; "
        f"preferences={profile.preferences}."
    )
    return {"reply": summary, "matches": [m.model_dump() for m in matches]}
