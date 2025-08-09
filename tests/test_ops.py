from fastapi.testclient import TestClient
from pathlib import Path

from src.main import app
from src.db import append_audit


client = TestClient(app)


def test_health_ok_when_db_available():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "db": "ok"}


def test_audit_rotation_rolls_file(tmp_path):
    # Ensure data directory exists
    data_dir = Path("data")
    data_dir.mkdir(parents=True, exist_ok=True)

    log_path = data_dir / "audit.log"
    backup_path = data_dir / "audit.1.log"

    # Clean any previous files for isolation
    for p in (log_path, backup_path):
        try:
            p.unlink()
        except FileNotFoundError:
            pass

    # Create a log just over 5MB
    big_size = 5 * 1024 * 1024 + 1024  # 5MB + 1KB
    with open(log_path, "wb") as f:
        f.write(b"x" * big_size)

    # This append should trigger rotation
    append_audit("hello")

    assert backup_path.exists(), "Rotated file audit.1.log should exist"
    assert backup_path.stat().st_size >= big_size
    assert log_path.exists(), "New audit.log should exist after rotation"
    # New log should contain the appended line
    with open(log_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    assert lines and lines[-1].strip() == "hello"

