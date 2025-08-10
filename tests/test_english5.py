from fastapi.testclient import TestClient
from src.main import app, STATE


client = TestClient(app)


def test_questions_shape():
    r = client.get("/assessments/english5/questions")
    assert r.status_code == 200
    data = r.json()
    assert data["assessment"] == "english-5q"
    assert data["total"] == 5
    assert isinstance(data["questions"], list) and len(data["questions"]) == 5
    q = data["questions"][0]
    assert set(["id", "question", "choices"]).issubset(q.keys())


def test_scoring_endpoint_returns_breakdown():
    # Provide some answers (intentionally mix correctness)
    answers = {"q1": "B", "q2": "A", "q3": "C", "q4": "C", "q5": "B"}
    r = client.post("/assessments/english5/score", json={"answers": answers})
    assert r.status_code == 200
    res = r.json()
    assert set(["score", "total", "breakdown"]).issubset(res.keys())
    assert res["total"] == 5
    assert len(res["breakdown"]) == 5


def test_chat_offer_and_scoring_path():
    uid = "eng_demo_1"
    STATE.pop(uid, None)
    # Seed profile so we see matches and a hint for English5
    client.post("/chat", json={"user_id": uid, "message": "goals: improve my college admissions essays"})
    client.post("/chat", json={"user_id": uid, "message": "constraints: weekends only"})
    r3 = client.post("/chat", json={"user_id": uid, "message": "preferences: online"})
    assert r3.status_code == 200
    body = r3.json()
    assert "hint" in body and "English5" in body["hint"]

    # Now answer via chat
    r4 = client.post("/chat", json={"user_id": uid, "message": "answers: q1=B,q2=B,q3=C,q4=C,q5=B"})
    assert r4.status_code == 200
    payload = r4.json()
    assert "result" in payload and payload["result"]["total"] == 5
    # Persisted to STATE
    assert "english5_result" in STATE[uid]

