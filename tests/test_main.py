from fastapi.testclient import TestClient
from sqlmodel import Session, select, SQLModel
from src.main import app, STATE
from src.db import engine
from src.models_db import UserState, Message
import json


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
    STATE.pop(user_id, None)  # ensure in-memory clean state
    # ensure DB clean state
    with Session(engine) as s:
        msgs = s.exec(select(Message).where(Message.user_id == user_id)).all()
        for m in msgs:
            s.delete(m)
        u = s.get(UserState, user_id)
        if u:
            s.delete(u)
        s.commit()
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


def test_get_user_404_when_missing():
    missing_id = "no_such_user"
    # Ensure clean slate
    with Session(engine) as s:
        u = s.get(UserState, missing_id)
        if u:
            s.delete(u)
            s.commit()
    resp = client.get(f"/users/{missing_id}")
    assert resp.status_code == 404


def test_get_user_returns_profile_and_history_after_chat_flow():
    user_id = "u_read_1"
    # cleanup any existing state
    with Session(engine) as s:
        msgs = s.exec(select(Message).where(Message.user_id == user_id)).all()
        for m in msgs:
            s.delete(m)
        u = s.get(UserState, user_id)
        if u:
            s.delete(u)
        s.commit()

    # Seed via chat flow
    client.post("/chat", json={"user_id": user_id, "message": "goals: study data analysis"})
    client.post("/chat", json={"user_id": user_id, "message": "constraints: evenings only, tight budget"})
    last_msg = "preferences: online, US-based"
    client.post("/chat", json={"user_id": user_id, "message": last_msg})

    # Read API
    resp = client.get(f"/users/{user_id}")
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["user"]["id"] == user_id
    assert "goals" in payload["user"] and payload["user"]["goals"] is not None
    assert "constraints" in payload["user"] and payload["user"]["constraints"] is not None
    assert "preferences" in payload["user"] and payload["user"]["preferences"] is not None
    assert isinstance(payload["history"], list) and len(payload["history"]) >= 3
    # most recent first
    assert payload["history"][0]["text"] == last_msg


def test_chat_debug_includes_reasoning():
    user_id = "u_debug_1"
    # clean user state
    with Session(engine) as s:
        msgs = s.exec(select(Message).where(Message.user_id == user_id)).all()
        for m in msgs:
            s.delete(m)
        u = s.get(UserState, user_id)
        if u:
            s.delete(u)
        s.commit()

    resp = client.post(f"/chat?debug=1", json={"user_id": user_id, "message": "hi"})
    assert resp.status_code == 200
    data = resp.json()
    assert "reasoning" in data
    assert "parsed" in data["reasoning"]
    assert ("missing" in data["reasoning"]) or ("matches_logic" in data["reasoning"])  # type: ignore[operator]


def test_message_persists_reasoning():
    user_id = "u_debug_2"
    # clean user state
    with Session(engine) as s:
        msgs = s.exec(select(Message).where(Message.user_id == user_id)).all()
        for m in msgs:
            s.delete(m)
        u = s.get(UserState, user_id)
        if u:
            s.delete(u)
        s.commit()

    client.post("/chat", json={"user_id": user_id, "message": "goals: learn ML"})
    with Session(engine) as s:
        msgs = s.exec(select(Message).where(Message.user_id == user_id)).all()
        assert len(msgs) == 1
        assert msgs[0].reasoning is not None
        # ensure it's JSON
        json.loads(msgs[0].reasoning)


def test_get_user_history_includes_reasoning_in_debug():
    user_id = "u_debug_3"
    # reset
    with Session(engine) as s:
        msgs = s.exec(select(Message).where(Message.user_id == user_id)).all()
        for m in msgs:
            s.delete(m)
        u = s.get(UserState, user_id)
        if u:
            s.delete(u)
        s.commit()

    client.post("/chat", json={"user_id": user_id, "message": "goals: web dev"})
    client.post("/chat", json={"user_id": user_id, "message": "constraints: nights"})

    r_debug = client.get(f"/users/{user_id}?debug=1")
    assert r_debug.status_code == 200
    payload = r_debug.json()
    assert len(payload["history"]) >= 2
    assert "reasoning" in payload["history"][0]

    r_nodebug = client.get(f"/users/{user_id}")
    assert r_nodebug.status_code == 200
    payload2 = r_nodebug.json()
    assert "reasoning" not in payload2["history"][0]
