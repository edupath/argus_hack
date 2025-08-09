from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Dict, List, Optional


class Adapter(ABC):
    @abstractmethod
    def get_requirements(self, program_name: str) -> Dict:
        raise NotImplementedError


class MockProvider(Adapter):
    def __init__(self) -> None:
        self._data: Dict[str, Dict] = {
            "State University — B.S. Computer Science": {
                "program_name": "State University — B.S. Computer Science",
                "prerequisites": [
                    "HS Algebra II",
                    "Intro CS",
                    "Transcript",
                    "Interview",
                ],
                "deadlines": {"priority": "2025-12-01", "final": "2026-01-15"},
                "tests": ["logic5 (recommended)", "english (optional)"],
                "notes": "Scholarship deadlines may differ.",
            },
            "City College — Data Analytics Certificate": {
                "program_name": "City College — Data Analytics Certificate",
                "prerequisites": [
                    "HS Algebra II",
                    "Intro to Spreadsheets",
                    "Transcript",
                ],
                "deadlines": {"priority": "2025-11-15", "final": "2026-01-05"},
                "tests": ["logic5 (recommended)", "english (optional)"],
                "notes": "Scholarship deadlines may differ.",
            },
            "Hillsdale — Economics (example)": {
                "program_name": "Hillsdale — Economics (example)",
                "prerequisites": ["HS Algebra II", "Transcript"],
                "deadlines": {"priority": "2025-10-01", "final": "2025-12-20"},
                "tests": ["logic5 (recommended)"],
                "notes": "Scholarship deadlines may differ.",
            },
        }

    def get_requirements(self, program_name: str) -> Dict:
        try:
            return self._data[program_name]
        except KeyError as e:
            raise KeyError("unknown program") from e

    def known_programs(self) -> List[str]:
        return list(self._data.keys())


def get_adapter(name: str = "mock") -> Adapter:
    if name.lower() == "mock":
        return MockProvider()
    raise KeyError("unknown adapter")


def match_program_in_text(text: str, programs: List[str]) -> Optional[str]:
    low = text.lower()
    for p in programs:
        if p.lower() in low:
            return p
    return None

