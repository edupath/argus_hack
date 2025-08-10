from fastapi.testclient import TestClient
from pathlib import Path
import types

from src.main import app
from src.services import requirements_lookup as rl


client = TestClient(app)


def _load_fixture() -> str:
    p = Path("tests/fixtures/sample_program.html")
    return p.read_text(encoding="utf-8")


def test_live_provider_parses_fixture(monkeypatch):
    html = _load_fixture()

    class Resp:
        status_code = 200
        text = html

    # monkeypatch the module's requests.get
    fake_requests = types.SimpleNamespace(get=lambda url, timeout=10: Resp())
    monkeypatch.setattr(rl, "requests", fake_requests, raising=True)

    provider = rl.LiveProvider()
    data = provider.preview("State University — B.S. Computer Science")
    assert data["program_name"].startswith("State University")
    assert any("Algebra" in x for x in data["prerequisites"])  # type: ignore[index]
    assert any("Application" in x for x in data["deadlines"])  # type: ignore[index]
    assert any("stateu.edu" in x for x in data["contacts"])  # type: ignore[index]
    assert "placement test" in data["notes"].lower()


def test_provider_selection_env_and_override(monkeypatch):
    # Default is mock
    r1 = client.post("/requirements/preview", json={"program_name": "X"})
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1["prerequisites"][0] == "High School Diploma"

    # Force live via override, monkeypatch fetch
    html = _load_fixture()

    class Resp:
        status_code = 200
        text = html

    fake_requests = types.SimpleNamespace(get=lambda url, timeout=10: Resp())
    monkeypatch.setattr(rl, "requests", fake_requests, raising=True)
    r2 = client.post(
        "/requirements/preview?use=live",
        json={"program_name": "State University — B.S. Computer Science"},
    )
    assert r2.status_code == 200
    d2 = r2.json()
    assert any("Algebra" in x for x in d2["prerequisites"])  # type: ignore[index]

