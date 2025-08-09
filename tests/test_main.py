from fastapi.testclient import TestClient
from sqlmodel import Session, select, SQLModel
from src.main import app, STATE
from src.db import engine
from src.models_db import UserState, Message


client = TestClient(app)


def test_root_ok():
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_chat_asks_question_when_profile_empty():
    user_id = "u_test_1"
    STATE.pop(user_id, None)  # ensure clean state for this user
    resp = client.post("/chat", json={"user_id": user_id, "message": "hi"})
    assert resp.status_code == 200
    data = resp.json()
    assert "reply" in data
    assert "next_questions" in data
    assert isinstance(data["next_questions"], list) and len(data["next_questions"]) == 1


def test_chat_returns_matches_after_all_fields():
    user_id = "u_test_2"
    STATE.pop(user_id, None)  # ensure clean state
    # Provide goals
    r1 = client.post("/chat", json={"user_id": user_id, "message": "goals: become a data analyst"})
    assert r1.status_code == 200
    assert "next_questions" in r1.json()
    # Provide constraints
    r2 = client.post("/chat", json={"user_id": user_id, "message": "constraints: part-time; budget < $1000"})
    assert r2.status_code == 200
    assert "next_questions" in r2.json()
    # Provide preferences
    r3 = client.post("/chat", json={"user_id": user_id, "message": "preferences: online in the US"})
    assert r3.status_code == 200
    data = r3.json()
    assert "matches" in data
    assert isinstance(data["matches"], list) and len(data["matches"]) >= 2
    assert set(["program_name", "rationale"]).issubset(data["matches"][0].keys())


def test_persist_creates_user_state_on_first_message():
    SQLModel.metadata.create_all(engine)
    user_id = "persist_u1"
    # cleanup pre-existing
    with Session(engine) as s:
        s.exec(select(Message).where(Message.user_id == user_id)).all()
        s.exec(select(UserState).where(UserState.id == user_id)).all()
        # Explicitly delete if exists
        msgs = s.exec(select(Message).where(Message.user_id == user_id)).all()
        for m in msgs:
            s.delete(m)
        u = s.get(UserState, user_id)
        if u:
            s.delete(u)
        s.commit()

    resp = client.post("/chat", json={"user_id": user_id, "message": "hello there"})
    assert resp.status_code == 200

    with Session(engine) as s:
        u = s.get(UserState, user_id)
        assert u is not None
        msgs = s.exec(select(Message).where(Message.user_id == user_id)).all()
        assert len(msgs) == 1


def test_subsequent_messages_update_existing_state():
    SQLModel.metadata.create_all(engine)
    user_id = "persist_u2"
    # cleanup pre-existing
    with Session(engine) as s:
        msgs = s.exec(select(Message).where(Message.user_id == user_id)).all()
        for m in msgs:
            s.delete(m)
        u = s.get(UserState, user_id)
        if u:
            s.delete(u)
        s.commit()

    client.post("/chat", json={"user_id": user_id, "message": "goals: learn data analysis"})
    client.post("/chat", json={"user_id": user_id, "message": "constraints: part-time, budget under 1k"})
    client.post("/chat", json={"user_id": user_id, "message": "preferences: online from home"})

    with Session(engine) as s:
        u = s.get(UserState, user_id)
        assert u is not None
        assert (u.goals or "").lower().find("data analysis") != -1
        assert "part-time" in (u.constraints or "").lower()
        assert "online" in (u.preferences or "").lower()
        msgs = s.exec(select(Message).where(Message.user_id == user_id)).all()
        assert len(msgs) == 3
