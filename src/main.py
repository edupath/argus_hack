from fastapi import FastAPI, Depends, HTTPException, Header, Query
from pydantic import BaseModel
from typing import Dict, List, Optional
from contextlib import asynccontextmanager
from typing import AsyncIterator
from pathlib import Path
from datetime import datetime, timezone
import json

from .models import StudentProfile, ProgramMatch
from .services.assessments import logic5
from .db import engine, get_session, ensure_column, append_audit
from .models_db import UserState, Message, AssessmentResult
from sqlmodel import SQLModel, Session, select
from .services.assessment import Logic5

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Ensure data directory exists and create tables
    Path("data").mkdir(parents=True, exist_ok=True)
    SQLModel.metadata.create_all(engine)
    # Tiny migration: add Message.reasoning if missing
    with engine.begin() as conn:
        ensure_column(conn, "message", "reasoning", "TEXT")
    yield


app = FastAPI(title="Agentic Educational Advisor", lifespan=lifespan)

# In-memory conversational state
STATE: Dict[str, Dict[str, object]] = {}


# (startup handled by lifespan)


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
def chat(
    req: ChatRequest,
    session: Session = Depends(get_session),
    debug_q: Optional[str] = Query(default=None, alias="debug"),
    debug_h: Optional[str] = Header(default=None, alias="X-Debug"),
):
    # Small in-memory cache of recent history (not source of truth)
    cache = _ensure_user(req.user_id)
    history: List[str] = cache["history"]  # type: ignore[assignment]
    history.append(req.message)

    # Load or create persistent user state
    user_state = session.get(UserState, req.user_id)
    if user_state is None:
        user_state = UserState(id=req.user_id)
        session.add(user_state)
        session.commit()

    # Ensure migration safety at request time (idempotent)
    with engine.begin() as conn:
        ensure_column(conn, "message", "reasoning", "TEXT")

    # Persist incoming message (reasoning to be added later)
    msg = Message(user_id=req.user_id, text=req.message)
    session.add(msg)
    session.commit()

    # Update profile fields via heuristic
    profile = StudentProfile(
        goals=user_state.goals,
        constraints=user_state.constraints,
        preferences=user_state.preferences,
    )
    before = (profile.goals, profile.constraints, profile.preferences)
    _apply_heuristics(profile, req.message)
    after = (profile.goals, profile.constraints, profile.preferences)
    if after != before:
        user_state.goals = profile.goals
        user_state.constraints = profile.constraints
        user_state.preferences = profile.preferences
        session.add(user_state)
        session.commit()

    # Decide next action
    missing = _missing_fields(profile)
    # Reasoning capture
    reasoning: Dict[str, object] = {
        "parsed": {
            "goals": profile.goals,
            "constraints": profile.constraints,
            "preferences": profile.preferences,
        },
        "missing": missing,
    }

    # Determine debug flag
    debug_on = False
    if debug_q is not None and str(debug_q).lower() in ("1", "true"):  # type: ignore[arg-type]
        debug_on = True
    if not debug_on and debug_h is not None and str(debug_h).lower() == "true":
        debug_on = True

    # Handle assessment triggers
    if "start logic5" in req.message.lower():
        plugin = Logic5()
        qs = plugin.questions()
        lines = ["Logic5 – answer with: answers: q1=A,q2=B,...", "Questions:"]
        for q in qs:
            lines.append(f"{q['id']}: {q['prompt']} Choices: {', '.join(q.get('choices', []))}")
        msg.reasoning = json.dumps({"assessment": "logic5", "action": "start"})
        session.add(msg)
        session.commit()
        return {"reply": "\n".join(lines)}

    if req.message.lower().startswith("answers:"):
        mapping_text = req.message.split(":", 1)[1]
        pairs = [p.strip() for p in mapping_text.split(",") if p.strip()]
        answers: Dict[str, str] = {}
        for p in pairs:
            if "=" in p:
                k, v = p.split("=", 1)
                answers[k.strip()] = v.strip().upper()
        plugin = Logic5()
        res = plugin.score(answers)
        existing = session.exec(
            select(AssessmentResult).where(
                AssessmentResult.user_id == req.user_id,
                AssessmentResult.assessment_id == plugin.id,
            )
        ).first()
        if existing:
            existing.score = int(res["score"])  # type: ignore[index]
            existing.total = int(res["total"])  # type: ignore[index]
            existing.ts = datetime.now(timezone.utc)
            session.add(existing)
        else:
            session.add(
                AssessmentResult(
                    user_id=req.user_id,
                    assessment_id=plugin.id,
                    score=int(res["score"]),  # type: ignore[index]
                    total=int(res["total"])  # type: ignore[index]
                )
            )
        session.commit()
        msg.reasoning = json.dumps({"assessment": "logic5", "action": "score", "result": res})
        session.add(msg)
        session.commit()
        return {"reply": f"Logic5 result: {res['score']}/{res['total']}", "matches": []}

    # If anything missing, ask question
    if missing:
        q = _question_for(missing[0])
        reasoning["next_question"] = q
        # Store reasoning on message and audit
        msg.reasoning = json.dumps(reasoning, ensure_ascii=False)
        session.add(msg)
        session.commit()
        ts = datetime.now(timezone.utc).isoformat()
        short = f"g={bool(profile.goals)} c={bool(profile.constraints)} p={bool(profile.preferences)}"
        append_audit(f"{ts} user={req.user_id} next=question parsed={short}")
        # Offer Logic5 suggestion if CS/engineering/data goals and no prior result
        offer_logic = False
        goals_text = (profile.goals or "").lower()
        if any(k in goals_text for k in ("cs", "computer", "engineer", "data")):
            existing = session.exec(
                select(AssessmentResult).where(
                    AssessmentResult.user_id == req.user_id,
                    AssessmentResult.assessment_id == "logic5",
                )
            ).first()
            offer_logic = existing is None
        addition = (
            "\n\nOptional check: take the 5-question Logic5 micro-assessment to validate fit. Say 'start logic5' to begin."
            if offer_logic else ""
        )
        # Also add a hint if the user explicitly mentions logic5
        if any(k in req.message.lower() for k in ("logic5", "logic test", "logic assessment")):
            addition = addition or "\n\nYou can take the Logic5 micro-assessment: say 'start logic5' to begin."
        resp = {"reply": q + addition, "next_questions": [q]}
        if debug_on:
            resp["reasoning"] = reasoning
        return resp

    # Otherwise, return matches
    matches = _mock_matches(profile)
    reasoning["matches_logic"] = "mock top-2 by goal alignment"
    summary = (
        f"Summary: goals={profile.goals}; constraints={profile.constraints}; "
        f"preferences={profile.preferences}."
    )
    msg.reasoning = json.dumps(reasoning, ensure_ascii=False)
    session.add(msg)
    session.commit()
    ts = datetime.now(timezone.utc).isoformat()
    short = f"g={bool(profile.goals)} c={bool(profile.constraints)} p={bool(profile.preferences)}"
    append_audit(f"{ts} user={req.user_id} next=done parsed={short}")
    offer_logic = False
    goals_text = (profile.goals or "").lower()
    if any(k in goals_text for k in ("cs", "computer", "engineer", "data")):
        existing = session.exec(
            select(AssessmentResult).where(
                AssessmentResult.user_id == req.user_id,
                AssessmentResult.assessment_id == "logic5",
            )
        ).first()
        offer_logic = existing is None
    addition = (
        "\n\nOptional check: take the 5-question Logic5 micro-assessment to validate fit. Say 'start logic5' to begin."
        if offer_logic else ""
    )
    if any(k in req.message.lower() for k in ("logic5", "logic test", "logic assessment")):
        addition = addition or "\n\nYou can take the Logic5 micro-assessment: say 'start logic5' to begin."
    resp = {"reply": summary + addition, "matches": [m.model_dump() for m in matches]}
    if debug_on:
        resp["reasoning"] = reasoning
    return resp


@app.get("/users/{user_id}")
def get_user(
    user_id: str,
    session: Session = Depends(get_session),
    debug_q: Optional[str] = Query(default=None, alias="debug"),
    debug_h: Optional[str] = Header(default=None, alias="X-Debug"),
):
    user = session.get(UserState, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    msgs = session.exec(
        select(Message).where(Message.user_id == user_id).order_by(Message.ts.desc())
    ).all()

    debug_on = False
    if debug_q is not None and str(debug_q).lower() in ("1", "true"):  # type: ignore[arg-type]
        debug_on = True
    if not debug_on and debug_h is not None and str(debug_h).lower() == "true":
        debug_on = True

    payload = {
        "user": {
            "id": user.id,
            "goals": user.goals,
            "constraints": user.constraints,
            "preferences": user.preferences,
        },
        "history": [],
    }
    for m in msgs:
        item = {"id": m.id, "text": m.text, "ts": m.ts}
        if debug_on and getattr(m, "reasoning", None):
            try:
                item["reasoning"] = json.loads(m.reasoning)  # type: ignore[arg-type]
            except Exception:
                item["reasoning"] = m.reasoning
        payload["history"].append(item)
    return payload


@app.get("/assessments/logic5/questions")
def logic5_questions():
    plugin = Logic5()
    return {"id": plugin.id, "questions": plugin.questions()}


class Logic5ScoreRequest(BaseModel):
    answers: Dict[str, str]


@app.post("/assessments/logic5/score")
def logic5_score(payload: Logic5ScoreRequest):
    plugin = Logic5()
    result = plugin.score(payload.answers)
    return result
