"""Program requirements lookup providers (mock + live).

Live provider is guarded by an environment flag and can be overridden per-call.
"""

from __future__ import annotations

from typing import Dict, Any, List, Optional
import re

# Provide a requests symbol for monkeypatching in tests without requiring installation
try:
    import requests  # type: ignore
except Exception:  # pragma: no cover - in tests we monkeypatch this symbol
    requests = None  # type: ignore


class BaseProvider:
    def preview(self, program_name: str) -> Dict[str, Any]:  # pragma: no cover (interface)
        raise NotImplementedError

# Adapter-style mock and helpers retained for main adapter flow
from abc import ABC, abstractmethod


class Adapter(ABC):
    @abstractmethod
    def get_requirements(self, program_name: str) -> Dict:
        raise NotImplementedError


class AdapterMockProvider(Adapter):
    def __init__(self) -> None:
        self._data: Dict[str, Dict] = {
            "State University — B.S. Computer Science": {
                "program_name": "State University — B.S. Computer Science",
                "prerequisites": ["HS Algebra II", "Intro CS", "Transcript", "Interview"],
                "deadlines": {"priority": "2025-12-01", "final": "2026-01-15"},
                "tests": ["logic5 (recommended)", "english (optional)"],
                "notes": "Scholarship deadlines may differ.",
            },
            "City College — Data Analytics Certificate": {
                "program_name": "City College — Data Analytics Certificate",
                "prerequisites": ["HS Algebra II", "Intro to Spreadsheets", "Transcript"],
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
        return AdapterMockProvider()
    raise KeyError("unknown adapter")


def match_program_in_text(text: str, programs: List[str]) -> Optional[str]:
    low = text.lower()
    for p in programs:
        if p.lower() in low:
            return p
    return None


class MockProvider(BaseProvider):
    def preview(self, program_name: str) -> Dict[str, Any]:
        return {
            "program_name": program_name,
            "prerequisites": ["High School Diploma"],
            "deadlines": ["Application: 2025-12-31"],
            "contacts": ["admissions@example.edu"],
            "notes": "Mock provider data",
        }


class LiveProvider(BaseProvider):
    def __init__(self) -> None:
        # Map known names to slugs/URLs (simple demo)
        self._map = {
            "state university — b.s. computer science": "https://example.edu/programs/cs",
            "state university - b.s. computer science": "https://example.edu/programs/cs",
        }

    def _resolve_url(self, program_name: str) -> Optional[str]:
        low = program_name.strip().lower()
        return self._map.get(low)

    def _fetch_html(self, url: str) -> str:
        if requests is None:
            raise RuntimeError("requests not available; cannot fetch live content")
        try:
            resp = requests.get(url, timeout=10)  # type: ignore[attr-defined]
            if getattr(resp, "status_code", 500) != 200:
                raise RuntimeError(f"HTTP {resp.status_code}")
            return str(getattr(resp, "text", ""))
        except Exception as e:
            raise RuntimeError(f"fetch failed: {e}")

    def _parse_html(self, html: str) -> Dict[str, Any]:
        prereqs: List[str] = []
        deadlines: List[str] = []
        contacts: List[str] = []
        notes = ""
        try:
            from bs4 import BeautifulSoup  # type: ignore

            soup = BeautifulSoup(html, "html.parser")
            pr_ul = soup.find(id=re.compile(r"prereq", re.I))
            if pr_ul:
                prereqs = [li.get_text(strip=True) for li in pr_ul.find_all("li")]
            dl_ul = soup.find(id=re.compile(r"deadline", re.I))
            if dl_ul:
                deadlines = [li.get_text(strip=True) for li in dl_ul.find_all("li")]
            ctn = soup.find(id=re.compile(r"contact", re.I))
            if ctn:
                for a in ctn.find_all("a"):
                    href = (a.get("href") or "").strip()
                    if href.startswith("mailto:"):
                        contacts.append(href.replace("mailto:", ""))
                    elif href.startswith("tel:"):
                        contacts.append(href.replace("tel:", ""))
                txt = ctn.get_text(" ", strip=True)
                contacts += re.findall(r"[\w.\-]+@[\w.\-]+", txt)
                contacts += re.findall(r"\+?\d[\d\-\s]{7,}\d", txt)
            note_el = soup.find(id=re.compile(r"notes?", re.I)) or soup.find("meta", attrs={"name": "description"})
            if note_el:
                notes = note_el.get("content", "") if getattr(note_el, "name", "") == "meta" else note_el.get_text(" ", strip=True)
        except Exception:
            # Fallback: extract by UL ids and simple patterns
            def extract_li_by_ul_id(pattern: str) -> List[str]:
                m = re.search(rf"<ul[^>]*id=\"{pattern}\"[^>]*>(.*?)</ul>", html, flags=re.I | re.S)
                if not m:
                    return []
                block = m.group(1)
                items = re.findall(r"<li[^>]*>(.*?)</li>", block, flags=re.I | re.S)
                return [re.sub(r"<[^>]+>", "", t).strip() for t in items]

            prereqs = extract_li_by_ul_id(r'prereq[^"]*')
            deadlines = extract_li_by_ul_id(r'deadline[^"]*')
            contacts = re.findall(r'mailto:([^\"]+)', html, flags=re.I)
            if not contacts:
                contacts = re.findall(r"([\w.\-]+@[\w.\-]+)", html)
            m = re.search(r"<div[^>]*id=\"notes\"[^>]*>(.*?)</div>", html, flags=re.I | re.S)
            if m:
                notes = re.sub(r"<[^>]+>", " ", m.group(1)).strip()

        def _dedup(seq: List[str]) -> List[str]:
            seen = set()
            out: List[str] = []
            for x in seq:
                t = (x or "").strip()
                if not t or t in seen:
                    continue
                out.append(t)
                seen.add(t)
            return out

        return {"prerequisites": _dedup(prereqs), "deadlines": _dedup(deadlines), "contacts": _dedup(contacts), "notes": notes.strip()}

    def preview(self, program_name: str) -> Dict[str, Any]:
        url = self._resolve_url(program_name) or "https://example.test/sample_program"
        html = self._fetch_html(url)
        parsed = self._parse_html(html)
        parsed["program_name"] = program_name
        return parsed


def get_provider(kind: Optional[str] = None):
    from ..settings import settings

    use = (kind or settings.REQUIREMENTS_PROVIDER or "mock").strip().lower()
    if use == "live":
        return LiveProvider()
    return MockProvider()
