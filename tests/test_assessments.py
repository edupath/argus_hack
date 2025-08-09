from fastapi.testclient import TestClient
from src.main import app


client = TestClient(app)


def test_logic5_get_returns_5_questions():
    r = client.get("/assessments/logic5/questions")
    assert r.status_code == 200
    data = r.json()
    assert data.get("id") == "logic5"
    qs = data.get("questions", [])
    assert isinstance(qs, list) and len(qs) == 5
    assert all("id" in q and "prompt" in q and "choices" in q for q in qs)


def test_logic5_scoring_counts_correct():
    payload = {"answers": {"q1": "A", "q2": "D", "q3": "A", "q4": "D", "q5": "A"}}
    r = client.post("/assessments/logic5/score", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data.get("score") == 5
    assert data.get("total") == 5


def test_chat_trigger_mentions_logic5():
    r = client.post("/chat", json={"user_id": "u_logic5", "message": "can I take a logic5 test now?"})
    assert r.status_code == 200
    text = r.json().get("reply", "").lower()
    assert "logic5" in text and "questions" not in text  # hint in reply when not 'start logic5'
