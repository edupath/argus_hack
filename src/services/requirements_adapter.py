from __future__ import annotations

from typing import Protocol

from ..models import ProgramRequirements


class RequirementsProvider(Protocol):
    def fetch(self, program_id: str) -> ProgramRequirements:  # pragma: no cover - interface
        ...


def get_provider(name: str) -> RequirementsProvider:
    name_l = name.lower()
    if name_l == "mock":
        from .requirements_mock import MockRequirementsProvider

        return MockRequirementsProvider()
    raise KeyError(f"Unknown requirements provider: {name}")

