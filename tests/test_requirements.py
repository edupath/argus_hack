from fastapi.testclient import TestClient
from src.main import app


client = TestClient(app)


def test_requirements_preview_mock_returns_shape():
    # Known program from MockProvider
    payload = {"program_name": "City College — Data Analytics Certificate"}
    resp = client.post("/requirements/preview", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["program_name"] == payload["program_name"]
    for key in ("prerequisites", "deadlines", "tests", "notes"):
        assert key in data


def test_requirements_unknown_provider_returns_404():
    resp = client.get("/requirements/abc?provider=unknown")
    assert resp.status_code == 404


def test_preview_unknown_program_404():
    resp = client.post("/requirements/preview", json={"program_name": "NoSuch Program"})
    assert resp.status_code == 404


def test_chat_suggests_preview_when_program_name_seen():
    # message containing exact known program name
    program = "State University — B.S. Computer Science"
    r = client.post("/chat", json={"user_id": "u_prog_hint", "message": f"I'm interested in {program}"})
    assert r.status_code == 200
    text = r.json().get("reply", "")
    assert "preview" in text.lower()
    assert program in text
