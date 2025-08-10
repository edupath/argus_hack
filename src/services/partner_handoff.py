from __future__ import annotations

import json
import random
from datetime import datetime, timezone
from typing import Dict

from sqlmodel import Session, select

from ..models_db import PartnerJob


def enqueue_handoff(session: Session, user_id: str, program_name: str, payload: Dict) -> int:
    job = PartnerJob(
        user_id=user_id,
        program_name=program_name,
        payload=json.dumps(payload, ensure_ascii=False),
        status="queued",
    )
    session.add(job)
    session.commit()
    session.refresh(job)
    return int(job.id)  # type: ignore[return-value]


def get_status(session: Session, job_id: int) -> Dict:
    job = session.get(PartnerJob, job_id)
    if not job:
        raise KeyError("job not found")
    return {
        "id": job.id,
        "status": job.status,
        "last_error": job.last_error,
        "created_at": job.created_at.isoformat(),
        "updated_at": job.updated_at.isoformat(),
    }


def worker_send(session: Session, job_id: int) -> None:
    job = session.get(PartnerJob, job_id)
    if not job:
        raise KeyError("job not found")
    # Simulate partner API call with 10-20% error chance
    fail = random.random() < 0.15
    job.updated_at = datetime.now(timezone.utc)
    if fail:
        job.status = "error"
        job.last_error = "Simulated partner API failure"
    else:
        job.status = "sent"
        job.last_error = None
    session.add(job)
    session.commit()

