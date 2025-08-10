from __future__ import annotations

import re
from typing import Dict, Optional, Tuple


FieldResult = Dict[str, object]


def _extract_with_prefix(text: str, field: str) -> Optional[str]:
    pattern = re.compile(rf"\b{re.escape(field)}s?:\s*(.+)", re.IGNORECASE)
    m = pattern.search(text)
    if m:
        return m.group(1).strip()
    return None


def _extract_with_keywords(text: str, keywords: Tuple[str, ...]) -> Optional[str]:
    low = text.lower()
    if any(k in low for k in keywords):
        # Heuristic: return full text as candidate value
        return text.strip()
    return None


def parse_profile(text: str) -> Dict[str, FieldResult]:
    """Parse a message for goals, constraints, preferences with confidence.

    Returns a mapping of field -> {value, confidence, source}
    where source is one of "prefix", "keyword", or None when not found.
    Confidence scale: 0.0–1.0
    - Explicit prefixes (e.g., "goals:") => 0.95
    - Keyword-based hints => 0.55 (below acceptance threshold)
    """
    res: Dict[str, FieldResult] = {
        "goals": {"value": None, "confidence": 0.0, "source": None},
        "constraints": {"value": None, "confidence": 0.0, "source": None},
        "preferences": {"value": None, "confidence": 0.0, "source": None},
    }

    text_stripped = text.strip()

    # Prefix extraction (high confidence)
    for field in ("goal", "constraint", "preference"):
        val = _extract_with_prefix(text_stripped, field)
        if val:
            key = field + ("s" if not field.endswith("s") else "")
            if key == "goals" and not field.endswith("s"):
                key = "goals"
            if key == "constraints" and not field.endswith("s"):
                key = "constraints"
            if key == "preferences" and not field.endswith("s"):
                key = "preferences"
            res[key] = {"value": val, "confidence": 0.95, "source": "prefix"}

    # Keyword extraction (low confidence hints)
    if res["goals"]["value"] is None:  # type: ignore[index]
        cand = _extract_with_keywords(text_stripped, ("goal", "learn", "become"))
        if cand:
            res["goals"] = {"value": cand, "confidence": 0.55, "source": "keyword"}
    if res["constraints"]["value"] is None:  # type: ignore[index]
        cand = _extract_with_keywords(text_stripped, ("constraint", "time", "budget", "cost", "schedule"))
        if cand:
            res["constraints"] = {"value": cand, "confidence": 0.55, "source": "keyword"}
    if res["preferences"]["value"] is None:  # type: ignore[index]
        cand = _extract_with_keywords(text_stripped, ("prefer", "mode", "location", "online", "in-person", "hybrid", "remote"))
        if cand:
            res["preferences"] = {"value": cand, "confidence": 0.55, "source": "keyword"}

    return res

