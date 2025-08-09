from fastapi.testclient import TestClient
from src.main import app


client = TestClient(app)


def test_logic5_get_returns_5_questions():
    r = client.get("/assessments/logic5")
    assert r.status_code == 200
    data = r.json()
    assert data.get("assessment") == "logic5"
    qs = data.get("questions", [])
    assert isinstance(qs, list) and len(qs) == 5
    assert all("id" in q and "question" in q and "choices" in q for q in qs)


def test_logic5_scoring_counts_correct():
    # Build answers with 3 known-correct based on plugin key
    # 1->0, 2->3, 3->0, 4->3, 5->0 per implementation
    payload = {
        "answers": [
            {"id": 1, "answer": 0},
            {"id": 2, "answer": 3},
            {"id": 3, "answer": 0},
            {"id": 4, "answer": 1},  # wrong
            {"id": 5, "answer": 2},  # wrong
        ]
    }
    r = client.post("/assessments/logic5/score", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data.get("assessment") == "logic5"
    assert data.get("score") == 3
    assert data.get("max_score") == 5


def test_chat_trigger_mentions_logic5():
    r = client.post("/chat", json={"user_id": "u_logic5", "message": "can I take a logic5 test now?"})
    assert r.status_code == 200
    text = r.json().get("reply", "").lower()
    assert "logic5" in text and "assessment" in text

