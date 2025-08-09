"""Placeholder service for program requirements lookup.

This module will define interfaces and mock adapters to fetch prerequisites,
deadlines, and required materials for programs.
"""

from typing import Dict, Any


def get_mock_requirements(program_id: str) -> Dict[str, Any]:
    return {
        "program_id": program_id,
        "prerequisites": ["High School Diploma"],
        "deadlines": {"application": "2025-12-31"},
        "materials": ["Transcript", "Personal Statement"],
    }

