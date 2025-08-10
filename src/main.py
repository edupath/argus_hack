
from fastapi import FastAPI, Depends, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware


from pydantic import BaseModel
from typing import Dict, List, Optional
from contextlib import asynccontextmanager
from typing import AsyncIterator
from pathlib import Path
from datetime import datetime, timezone
import json
from sqlalchemy import text

from .models import StudentProfile, ProgramMatch, ProgramRequirements
from .db import engine, get_session, ensure_column, append_audit
from .models_db import UserState, Message
from sqlmodel import SQLModel, Session, select
from .services.requirements_adapter import get_provider
from .services.requirements_lookup import (
    get_adapter as get_requirements_adapter,
    match_program_in_text,
)
from .services.partner_handoff import enqueue_handoff, get_status as get_job_status, worker_send
from .services.assessment import run_sample_assessment
from .services.parse_profile import parse_profile

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
from fastapi.middleware.cors import CORSMiddleware as _MW
app.add_middleware(
    _MW,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# In-memory conversational state
STATE: Dict[str, Dict[str, object]] = {}


# (startup handled by lifespan)


@app.get("/")
def root():
    return {"status": "ok"}


@app.get("/health")
def health(session: Session = Depends(get_session)):
    # Perform a trivial DB check
    try:
        session.exec(text("SELECT 1")).first()
        return {"status": "ok", "db": "ok"}
    except Exception:
        raise HTTPException(status_code=503, detail="database unavailable")


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

    # Update profile fields via parser with confidences
    profile = StudentProfile(
        goals=user_state.goals,
        constraints=user_state.constraints,
        preferences=user_state.preferences,
    )
    before = (profile.goals, profile.constraints, profile.preferences)
    parsed = parse_profile(req.message)
    low_conf: Dict[str, Dict[str, object]] = {}

    def maybe_set(field: str) -> None:
        nonlocal profile, user_state
        info = parsed[field]
        val = info.get("value")
        conf = float(info.get("confidence", 0.0))
        src = info.get("source")
        if not val:
            return
        # Accept high confidence (prefix) always, allowing overwrite
        if conf >= 0.9:
            setattr(profile, field, str(val))
        # Accept medium confidence if field empty
        elif conf >= 0.6 and getattr(profile, field) in (None, ""):
            setattr(profile, field, str(val))
        else:
            low_conf[field] = {"value": val, "confidence": conf}

    for fld in ("goals", "constraints", "preferences"):
        maybe_set(fld)

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

    # If anything missing or low-confidence candidates exist, ask targeted question
    if missing or low_conf:
        target = missing[0] if missing else list(low_conf.keys())[0]
        q = _question_for(target)
        reasoning["next_question"] = q
        if target in low_conf:
            lc = low_conf[target]
            reasoning["why_asked"] = {
                "field": target,
                "reason": "low confidence",
                "confidence": lc.get("confidence"),
                "extracted": lc.get("value"),
            }
        # Store reasoning on message and audit
        msg.reasoning = json.dumps(reasoning, ensure_ascii=False)
        session.add(msg)
        session.commit()
        ts = datetime.now(timezone.utc).isoformat()
        short = f"g={bool(profile.goals)} c={bool(profile.constraints)} p={bool(profile.preferences)}"
        append_audit(f"{ts} user={req.user_id} next=question parsed={short}")
        # Optional hint if program name detected
        try:
            adapter = get_requirements_adapter("mock")
            hint_name = match_program_in_text(req.message, adapter.known_programs())  # type: ignore[attr-defined]
        except Exception:
            hint_name = None
        reply_text = q
        if hint_name:
            reply_text += f"\n\nI can preview requirements for '{hint_name}'—say 'preview {hint_name}' to see them."
        resp = {"reply": reply_text, "next_questions": [q]}
        if debug_on:
            resp["reasoning"] = reasoning
        return resp

    # Submit hook: "submit <program name>"
    text_msg = req.message.strip()
    low_msg = text_msg.lower()
    if low_msg.startswith("submit "):
        program_name = text_msg[len("submit ") :].strip()
        if not program_name:
            raise HTTPException(status_code=400, detail="program name required after 'submit '")
        # Require profile completeness from DB and an assessment result in STATE
        state_entry = _ensure_user(req.user_id)
        assessment = state_entry.get("assessment")  # type: ignore[assignment]
        user_state = session.get(UserState, req.user_id)
        if not user_state:
            raise HTTPException(status_code=404, detail="user not found")
        if not (user_state.goals and user_state.constraints and user_state.preferences and assessment):
            raise HTTPException(status_code=400, detail="profile incomplete or assessment missing")
        dossier = {
            "profile": {
                "goals": user_state.goals,
                "constraints": user_state.constraints,
                "preferences": user_state.preferences,
            },
            "assessments": assessment,
        }
        job_id = enqueue_handoff(session, req.user_id, program_name, dossier)
        return {"message": f"submitted '{program_name}'", "job": {"id": job_id, "status": "queued"}, "hint": f"Check /handoff/status/{job_id}"}

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
    # Optional hint if program name detected
    try:
        adapter = get_requirements_adapter("mock")
        hint_name = match_program_in_text(req.message, adapter.known_programs())  # type: ignore[attr-defined]
    except Exception:
        hint_name = None

    # Build reply with optional preview hint and submission hint
    reply_text = summary
    if hint_name:
        reply_text += f"\n\nI can preview requirements for '{hint_name}'—say 'preview {hint_name}' to see them."

    # If profile complete, run a quick assessment and include submission hint
    submission_hint: Optional[str] = None
    if not missing:
        state_entry = _ensure_user(req.user_id)
        assessment = run_sample_assessment()
        state_entry["assessment"] = assessment
        submission_hint = "Say 'submit <program name>' to send your application."

    resp = {"reply": reply_text, "matches": [m.model_dump() for m in matches]}
    if submission_hint:
        resp["hint"] = submission_hint
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


@app.get("/requirements/{program_id}")
def preview_requirements(
    program_id: str,
    provider: str = Query(default="mock"),
):
    try:
        prov = get_provider(provider)
    except KeyError:
        raise HTTPException(status_code=404, detail="Provider not found")

    reqs = prov.fetch(program_id)
    return reqs.model_dump()


class RequirementsPreviewRequest(BaseModel):
    program_name: str


@app.post("/requirements/preview")
def preview_requirements_post(payload: RequirementsPreviewRequest):
    try:
        adapter = get_requirements_adapter("mock")
        data = adapter.get_requirements(payload.program_name)
        return data
    except KeyError:
        raise HTTPException(status_code=404, detail="Program not found")
class HandoffSubmit(BaseModel):
    user_id: str
    program_name: str


@app.post("/handoff/submit")
def handoff_submit(req: HandoffSubmit, session: Session = Depends(get_session)):
    # Load user state
    user_state = session.get(UserState, req.user_id)
    if user_state is None:
        raise HTTPException(status_code=404, detail="user not found")
    profile = {
        "goals": user_state.goals,
        "constraints": user_state.constraints,
        "preferences": user_state.preferences,
    }
    # Best-effort grab of in-memory assessment
    state_entry = _ensure_user(req.user_id)
    assessment = state_entry.get("assessment") if isinstance(state_entry, dict) else None
    dossier = {"profile": profile, "assessments": assessment or {}}
    job_id = enqueue_handoff(session, req.user_id, req.program_name, dossier)
    return {"id": job_id, "status": "queued"}


@app.get("/handoff/status/{job_id}")
def handoff_status(job_id: int, session: Session = Depends(get_session)):
    try:
        return get_job_status(session, job_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="job not found")


@app.post("/handoff/worker/{job_id}")
def handoff_worker(job_id: int, session: Session = Depends(get_session)):
    try:
        worker_send(session, job_id)
        return get_job_status(session, job_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="job not found")
