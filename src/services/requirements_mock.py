from __future__ import annotations

from ..models import ProgramRequirements


class MockRequirementsProvider:
    def fetch(self, program_id: str) -> ProgramRequirements:
        # Simple deterministic mock data based on program_id
        base = program_id.lower()
        return ProgramRequirements(
            program_id=program_id,
            prerequisites=["High School Diploma", f"Interest in {base}"],
            deadlines={"application": "2025-12-31"},
            materials=["Transcript", "Personal Statement"],
        )

