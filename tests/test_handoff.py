from fastapi.testclient import TestClient
from sqlmodel import Session, select, SQLModel
from typing import Optional

from src.main import app, STATE
from src.db import engine
from src.models_db import UserState, PartnerJob


client = TestClient(app)


def _reset_user(user_id: str):
    # Ensure tables exist before direct SQL access
    SQLModel.metadata.create_all(engine)
    STATE.pop(user_id, None)
    with Session(engine) as s:
        # delete jobs for this user
        jobs = s.exec(select(PartnerJob).where(PartnerJob.user_id == user_id)).all()
        for j in jobs:
            s.delete(j)
        u = s.get(UserState, user_id)
        if u:
            s.delete(u)
        s.commit()


def _ensure_user_with_profile(user_id: str):
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        u = s.get(UserState, user_id)
        if not u:
            u = UserState(id=user_id)
            s.add(u)
            s.commit()
        return u


def test_submit_enqueues_job_and_returns_id_and_status():
    user_id = "handoff_u1"
    _reset_user(user_id)
    # seed user with profile
    client.post("/chat", json={"user_id": user_id, "message": "goals: learn cs"})
    client.post("/chat", json={"user_id": user_id, "message": "constraints: evenings"})
    client.post("/chat", json={"user_id": user_id, "message": "preferences: online"})

    resp = client.post(
        "/handoff/submit",
        json={"user_id": user_id, "program_name": "State University — B.S. Computer Science"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert set(["id", "status"]) <= data.keys()
    assert data["status"] == "queued"

    with Session(engine) as s:
        job = s.get(PartnerJob, data["id"])  # type: ignore[arg-type]
        assert job is not None
        assert job.status == "queued"


def test_worker_marks_sent_or_error():
    user_id = "handoff_u2"
    _reset_user(user_id)
    # seed profile
    client.post("/chat", json={"user_id": user_id, "message": "goals: learn cs"})
    client.post("/chat", json={"user_id": user_id, "message": "constraints: evenings"})
    client.post("/chat", json={"user_id": user_id, "message": "preferences: online"})
    r = client.post(
        "/handoff/submit",
        json={"user_id": user_id, "program_name": "Bootcamp X"},
    )
    job_id = r.json()["id"]

    r2 = client.post(f"/handoff/worker/{job_id}")
    assert r2.status_code == 200
    status = r2.json()["status"]
    assert status in ("sent", "error")


def test_status_endpoint_returns_job_info():
    user_id = "handoff_u3"
    _reset_user(user_id)
    client.post("/chat", json={"user_id": user_id, "message": "goals: learn cs"})
    client.post("/chat", json={"user_id": user_id, "message": "constraints: evenings"})
    client.post("/chat", json={"user_id": user_id, "message": "preferences: online"})
    r = client.post(
        "/handoff/submit",
        json={"user_id": user_id, "program_name": "Bootcamp Y"},
    )
    job_id = r.json()["id"]

    s = client.get(f"/handoff/status/{job_id}")
    assert s.status_code == 200
    payload = s.json()
    assert set(["id", "status", "last_error", "created_at", "updated_at"]).issubset(payload.keys())


def test_chat_submit_triggers_enqueue_when_ready():
    user_id = "handoff_u4"
    _reset_user(user_id)
    # Fill profile via chat
    client.post("/chat", json={"user_id": user_id, "message": "goals: become a developer"})
    client.post("/chat", json={"user_id": user_id, "message": "constraints: part-time"})
    # This third message completes profile and sets assessment in STATE, and includes hint
    r3 = client.post("/chat", json={"user_id": user_id, "message": "preferences: online"})
    assert r3.status_code == 200
    assert "hint" in r3.json()

    # Now submit via chat
    r4 = client.post("/chat", json={"user_id": user_id, "message": "submit Awesome Program"})
    assert r4.status_code == 200
    data = r4.json()
    assert data["job"]["status"] == "queued"
    job_id = data["job"]["id"]
    with Session(engine) as s:
        job = s.get(PartnerJob, job_id)
        assert job is not None and job.program_name == "Awesome Program"
