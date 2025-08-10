from fastapi.testclient import TestClient
from sqlmodel import Session, select, SQLModel

from src.main import app
from src.db import engine
from src.models_db import UserState, AssessmentResult, PartnerJob


client = TestClient(app)


def test_demo_seed_creates_complete_flow():
    # Ensure tables exist for isolation
    SQLModel.metadata.create_all(engine)

    r1 = client.post("/demo/seed")
    assert r1.status_code == 200
    data1 = r1.json()
    assert set(["user_id", "assessment", "partner_job_id", "status_url"]).issubset(data1.keys())
    assert data1["user_id"] == "demo1"
    assert data1["assessment"]["score"] in (4, 5)  # ~4/5
    assert data1["assessment"]["total"] == 5
    assert data1["partner_job_id"] > 0
    assert data1["status_url"].startswith("/handoff/status/")

    # Validate DB state
    with Session(engine) as s:
        u = s.get(UserState, "demo1")
        assert u is not None and u.goals and u.constraints and u.preferences
        assessments = s.exec(select(AssessmentResult).where(AssessmentResult.user_id == "demo1")).all()
        assert len(assessments) == 1
        jobs = s.exec(select(PartnerJob).where(PartnerJob.user_id == "demo1")).all()
        assert len(jobs) == 1

    # Idempotency: calling again should replace/update records (still 1 of each)
    r2 = client.post("/demo/seed")
    assert r2.status_code == 200
    data2 = r2.json()
    with Session(engine) as s:
        assessments = s.exec(select(AssessmentResult).where(AssessmentResult.user_id == "demo1")).all()
        assert len(assessments) == 1
        jobs = s.exec(select(PartnerJob).where(PartnerJob.user_id == "demo1")).all()
        assert len(jobs) == 1

