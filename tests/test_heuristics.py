from fastapi.testclient import TestClient
from sqlmodel import Session, select, SQLModel

from src.main import app, STATE
from src.db import engine
from src.models_db import UserState


client = TestClient(app)


def _reset(user_id: str):
    STATE.pop(user_id, None)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        u = s.get(UserState, user_id)
        if u:
            s.delete(u)
            s.commit()


def test_high_confidence_prefix_updates_field():
    uid = "h_conf_1"
    _reset(uid)
    r = client.post("/chat", json={"user_id": uid, "message": "goals: become a data scientist"})
    assert r.status_code == 200
    # Fetch user to confirm goals set
    ru = client.get(f"/users/{uid}")
    assert ru.status_code == 200
    user = ru.json()["user"]
    assert "data scientist" in (user["goals"] or "").lower()


def test_low_confidence_triggers_clarification_with_reason():
    uid = "l_conf_1"
    _reset(uid)
    r = client.post("/chat?debug=1", json={"user_id": uid, "message": "I want to learn more"})
    assert r.status_code == 200
    body = r.json()
    assert "next_questions" in body
    assert "reasoning" in body and "why_asked" in body["reasoning"]
    assert body["reasoning"]["why_asked"]["reason"] == "low confidence"


def test_update_field_on_later_message():
    uid = "update_1"
    _reset(uid)
    client.post("/chat", json={"user_id": uid, "message": "goals: learn python"})
    client.post("/chat", json={"user_id": uid, "message": "goals: learn machine learning"})
    ru = client.get(f"/users/{uid}")
    assert ru.status_code == 200
    user = ru.json()["user"]
    assert "machine learning" in (user["goals"] or "").lower()


def test_low_conf_does_not_overwrite_existing():
    uid = "no_overwrite_low"
    _reset(uid)
    client.post("/chat", json={"user_id": uid, "message": "goals: learn python"})
    # Low-confidence message should not overwrite and should trigger clarification if nothing missing
    # Fill remaining to avoid missing-trigger overshadowing low_conf
    client.post("/chat", json={"user_id": uid, "message": "constraints: nights"})
    client.post("/chat", json={"user_id": uid, "message": "preferences: online"})
    r = client.post("/chat?debug=1", json={"user_id": uid, "message": "I want to learn dancing"})
    assert r.status_code == 200
    # Ensure original goals remain
    ru = client.get(f"/users/{uid}")
    user = ru.json()["user"]
    assert "python" in (user["goals"] or "").lower()
    # Clarification should include why_asked with source
    data = r.json()
    assert "reasoning" in data and "why_asked" in data["reasoning"]
    assert data["reasoning"]["why_asked"]["reason"] == "low confidence"
    assert "source" in data["reasoning"]["why_asked"]


def test_multi_field_single_message():
    uid = "multi_one"
    _reset(uid)
    msg = "goals: break into data science constraints: evenings, budget < $1k preferences: online US-based"
    r = client.post("/chat", json={"user_id": uid, "message": msg})
    assert r.status_code == 200
    # All three should be set at once
    ru = client.get(f"/users/{uid}")
    assert ru.status_code == 200
    user = ru.json()["user"]
    assert user["goals"] and "data science" in user["goals"].lower()
    assert user["constraints"] and "evenings" in user["constraints"].lower()
    assert user["preferences"] and "online" in user["preferences"].lower()
