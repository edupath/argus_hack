from __future__ import annotations

import os


class Settings:
    def __init__(self) -> None:
        self.REQUIREMENTS_PROVIDER: str = os.getenv("REQUIREMENTS_PROVIDER", "mock")


settings = Settings()
