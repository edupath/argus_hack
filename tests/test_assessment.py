from fastapi.testclient import TestClient
from sqlmodel import Session, select
from src.main import app
from src.db import engine
from src.models_db import AssessmentResult


client = TestClient(app)


def test_logic5_questions_shape():
    r = client.get("/assessments/logic5/questions")
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == "logic5"
    qs = data["questions"]
    assert isinstance(qs, list) and len(qs) == 5
    assert set(["id", "prompt"]).issubset(qs[0].keys())


def test_logic5_scoring_happy_path():
    answers = {"q1": "A", "q2": "D", "q3": "A", "q4": "D", "q5": "A"}
    r = client.post("/assessments/logic5/score", json={"answers": answers})
    assert r.status_code == 200
    data = r.json()
    assert data["score"] == 5
    assert data["total"] == 5
    assert isinstance(data.get("breakdown"), list)


def test_chat_offers_logic5_for_cs_goals():
    uid = "u_logic_offer"
    client.post("/chat", json={"user_id": uid, "message": "goals: break into data engineering"})
    r = client.post("/chat", json={"user_id": uid, "message": "constraints: nights"})
    assert r.status_code == 200
    text = r.json()["reply"].lower()
    assert "logic5" in text and "optional" in text


def test_chat_scores_logic5_when_answers_provided():
    uid = "u_logic_flow"
    # start flow
    r1 = client.post("/chat", json={"user_id": uid, "message": "start logic5"})
    assert r1.status_code == 200
    assert "questions" in r1.json()["reply"].lower()
    # answer
    r2 = client.post("/chat", json={"user_id": uid, "message": "answers: q1=A,q2=D,q3=A,q4=D,q5=A"})
    assert r2.status_code == 200
    assert "logic5 result" in r2.json()["reply"].lower()
    # persisted
    with Session(engine) as s:
        res = s.exec(select(AssessmentResult).where(AssessmentResult.user_id == uid, AssessmentResult.assessment_id == "logic5")).first()
        assert res is not None and res.score == 5 and res.total == 5

