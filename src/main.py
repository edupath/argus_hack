from __future__ import annotations
from fastapi import FastAPI, Depends, HTTPException, Header, Query, APIRouter, Body
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
from .models_db import UserState, Message, PartnerJob, AssessmentResult
from sqlmodel import SQLModel, Session, select
from .services.requirements_adapter import get_provider as get_req_provider
from .services.requirements_lookup import (
    get_adapter as get_requirements_adapter,
    match_program_in_text,
    get_provider as get_live_req_provider,
)
from .services.partner_handoff import enqueue_handoff, get_status as get_job_status, worker_send
from .services.assessment import run_sample_assessment
from .services.parse_profile import parse_profile
from .services.assessments.english5 import (
    get_questions as english5_questions,
    score_answers as english5_score,
)

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Ensure data directory exists and create tables
    Path("data").mkdir(parents=True, exist_ok=True)
    SQLModel.metadata.create_all(engine)
    # Tiny migration: add Message.reasoning if missing
    with engine.begin() as conn:
        ensure_column(conn, "message", "reasoning", "TEXT")
    yield

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
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


def _to_dict(m):
    if hasattr(m, "model_dump"):
        return m.model_dump()
    if hasattr(m, "dict"):
        return m.dict()
    return m


def _handle_chat(
    req: ChatRequest,
    debug: Optional[str],
    x_debug: Optional[str],
    session: Session,
) -> dict:
    # Assessment answers short-circuit: "answers: q1=A,q2=B,..."
    txt = req.message.strip()
    lowtxt = txt.lower()
    if lowtxt.startswith("answers:"):
        payload = txt[len("answers:") :].strip()
        answers: Dict[str, str] = {}
        for part in payload.split(","):
            part = part.strip()
            if not part:
                continue
            if "=" in part:
                k, v = part.split("=", 1)
                answers[k.strip()] = v.strip().upper()
        result = english5_score(answers)
        cache = _ensure_user(req.user_id)
        cache["english5_result"] = result  # type: ignore[index]
        return {"reply": f"English5 score: {result['score']}/{result['total']}", "result": result}
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
            low_conf[field] = {"value": val, "confidence": conf, "source": src}

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
    if debug is not None and str(debug).lower() in ("1", "true"):  # type: ignore[arg-type]
        debug_on = True
    if not debug_on and x_debug is not None and str(x_debug).lower() == "true":
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
                "source": lc.get("source"),
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

    # Build reply with optional preview hint and submission/assessment hints
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

    # English5 suggestion based on goals
    english_hint = None
    gtxt = (profile.goals or "").lower()
    if any(k in gtxt for k in ("humanities", "communication", "essay")):
        english_hint = "Consider the English5 assessment: GET /assessments/english5/questions"

    resp = {"reply": reply_text, "matches": [_to_dict(m) for m in matches]}
    if english_hint and submission_hint:
        resp["hint"] = f"{english_hint}. {submission_hint}"
    elif english_hint:
        resp["hint"] = english_hint
    elif submission_hint:
        resp["hint"] = submission_hint
    if debug_on:
        resp["reasoning"] = reasoning
    return resp

@app.post("/chat")
def chat(
    req: ChatRequest,
    session: Session = Depends(get_session),
    debug_q: Optional[str] = Query(default=None, alias="debug"),
    debug_h: Optional[str] = Header(default=None, alias="X-Debug"),
):
    return _handle_chat(req, debug_q, debug_h, session)


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
        prov = get_req_provider(provider)
    except KeyError:
        raise HTTPException(status_code=404, detail="Provider not found")

    reqs = prov.fetch(program_id)
    return reqs.model_dump()

class RequirementsPreviewRequest(BaseModel):
    program_name: str


@app.post("/requirements/preview")
def preview_requirements_post(payload: RequirementsPreviewRequest, use: Optional[str] = Query(default=None, alias="use")):
    # Optional override to live provider; default to adapter
    if use and use.strip().lower() == "live":
        try:
            provider = get_live_req_provider("live")
            return provider.preview(payload.program_name)
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))
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


@app.get("/assessments/english5/questions")
def english5_get_questions():
    return english5_questions()


class English5ScoreRequest(BaseModel):
    answers: Dict[str, str]


@app.post("/assessments/english5/score")
def english5_post_score(req: English5ScoreRequest):
    return english5_score(req.answers)


class DemoSeedResponse(BaseModel):
    user_id: str
    assessment: Dict[str, int]
    partner_job_id: int
    status_url: str


@app.post("/demo/seed")
def demo_seed(session: Session = Depends(get_session)) -> DemoSeedResponse:
    user_id = "demo1"
    SQLModel.metadata.create_all(engine)
    user = session.get(UserState, user_id) or UserState(id=user_id)
    user.goals = "Become a software engineer"
    user.constraints = "Part-time, budget under $1k"
    user.preferences = "Online, US-based"
    session.add(user)
    session.commit()
    prev = session.exec(select(AssessmentResult).where(AssessmentResult.user_id == user_id)).all()
    for a in prev:
        session.delete(a)
    session.commit()
    assess = AssessmentResult(user_id=user_id, assessment="logic-5q", score=4, max_score=5)
    session.add(assess)
    session.commit()
    dossier = {
        "profile": {"goals": user.goals, "constraints": user.constraints, "preferences": user.preferences},
        "assessments": {"logic-5q": {"score": assess.score, "max_score": assess.max_score}},
    }
    jobs = session.exec(select(PartnerJob).where(PartnerJob.user_id == user_id)).all()
    for j in jobs:
        session.delete(j)
    session.commit()
    job = PartnerJob(user_id=user_id, program_name="State University — B.S. Computer Science", payload=json.dumps(dossier, ensure_ascii=False), status="queued")
    session.add(job)
    session.commit()
    session.refresh(job)
    return DemoSeedResponse(user_id=user_id, assessment={"score": assess.score, "total": assess.max_score}, partner_job_id=int(job.id or 0), status_url=f"/handoff/status/{int(job.id or 0)}")
# --- API shim for UI expecting /api/* paths ---
from fastapi import APIRouter

def register_api_shim(app: FastAPI) -> None:
    api = APIRouter(prefix="/api")

    @api.post("/chat")
    def api_chat(
        payload: dict = Body(...),
        session: Session = Depends(get_session),
        debug_q: Optional[str] = Query(default=None, alias="debug"),
        debug_h: Optional[str] = Header(default=None, alias="X-Debug"),
    ):
        # Accept multiple frontend shapes
        uid = (
            payload.get("user_id")
            or payload.get("userId")
            or payload.get("uid")
            or "demo"
        )
        msg = payload.get("message") or payload.get("text") or payload.get("prompt")
        if not msg:
            raise HTTPException(status_code=422, detail="message/text/prompt is required")

        req = ChatRequest(user_id=uid, message=msg)
        return _handle_chat(req, debug_q, debug_h, session)

    @api.get("/profile/{user_id}")
    def api_profile(
        user_id: str,
        session: Session = Depends(get_session),
        debug_q: Optional[str] = Query(default=None, alias="debug"),
        debug_h: Optional[str] = Header(default=None, alias="X-Debug"),
    ):
        # Delegate to main handler with DI-provided session; if missing, return empty profile
        try:
            return get_user(user_id, session=session, debug_q=debug_q, debug_h=debug_h)
        except HTTPException as e:
            if e.status_code == 404:
                return {"user": {"id": user_id, "goals": None, "constraints": None, "preferences": None}, "history": []}
            raise

    @api.get("/applications")
    def api_applications(userId: str):
        return {"userId": userId, "applications": []}

    @api.get("/activity")
    def api_activity(userId: str):
        return {"userId": userId, "activity": []}

    @api.get("/program-matches")
    def api_program_matches(userId: str):
        entry = _ensure_user(userId)
        profile: StudentProfile = entry["profile"]  # type: ignore
        matches = _mock_matches(profile) if "_mock_matches" in globals() else []
        return {"userId": userId, "matches": [_to_dict(m) for m in matches]}

    @api.get("/pending-questions")
    def api_pending_questions(userId: str):
        entry = _ensure_user(userId)
        profile: StudentProfile = entry["profile"]  # type: ignore
        missing = _missing_fields(profile)
        return {"userId": userId, "questions": [_question_for(f) for f in missing]}

    app.include_router(api)

# Call this ONCE at the very end of the file, after all route handlers are defined:
register_api_shim(app)
# --- end API shim ---
=======
def requirements_preview(
    req: RequirementsPreviewRequest,
    use: Optional[str] = Query(default=None, alias="use"),
):
    provider = get_provider(use)
    try:
        return provider.preview(req.program_name)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"provider error: {e}")
>>>>>>> origin/feat/requirements-provider-live
