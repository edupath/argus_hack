from fastapi.testclient import TestClient
from src.main import app


client = TestClient(app)


def test_root_ok():
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

