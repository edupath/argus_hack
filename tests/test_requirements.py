from fastapi.testclient import TestClient
from src.main import app


client = TestClient(app)


def test_requirements_preview_mock_returns_shape():
    resp = client.get("/requirements/test123")
    assert resp.status_code == 200
    data = resp.json()
    assert data["program_id"] == "test123"
    assert isinstance(data["prerequisites"], list)
    assert isinstance(data["deadlines"], dict)
    assert isinstance(data["materials"], list)


def test_requirements_unknown_provider_returns_404():
    resp = client.get("/requirements/abc?provider=unknown")
    assert resp.status_code == 404
