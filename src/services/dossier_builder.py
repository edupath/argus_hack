"""Placeholder dossier builder.

Assembles a simple application dossier from profile and assessment results.
"""

from typing import Dict, Any


def build_dossier(profile: Dict[str, Any], assessments: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "profile": profile,
        "assessments": assessments,
        "version": 1,
    }

