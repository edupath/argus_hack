from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Dict, List, Tuple


class Assessment(ABC):
    id: str

    @abstractmethod
    def questions(self) -> List[Dict]:
        """Return list of question dicts: {id, prompt, choices?}."""
        raise NotImplementedError

    @abstractmethod
    def score(self, answers: Dict[str, str]) -> Dict:
        """Return {score:int, total:int, breakdown:list}."""
        raise NotImplementedError


class Logic5(Assessment):
    id = "logic5"

    def __init__(self) -> None:
        # qid -> (correct_letter, prompt, choices[A-D], rationale)
        self._items: List[Tuple[str, str, List[str], str, str]] = [
            (
                "q1",
                "If all Bloops are Razzies and all Razzies are Lazzies, are all Bloops Lazzies?",
                ["Yes", "No", "Cannot determine", "Only sometimes"],
                "A",
                "Transitive: if A⊂B and B⊂C then A⊂C.",
            ),
            (
                "q2",
                "Which number comes next: 2, 4, 8, 16, ?",
                ["20", "24", "30", "32"],
                "D",
                "Doubles each time; 16×2=32.",
            ),
            (
                "q3",
                "A is taller than B and B is taller than C. Who is tallest?",
                ["A", "B", "C", "Cannot determine"],
                "A",
                "Transitive order: A>B and B>C implies A>C.",
            ),
            (
                "q4",
                "Find the odd one out: dog, cat, bird, tree",
                ["dog", "cat", "bird", "tree"],
                "D",
                "Three are animals; a tree is not.",
            ),
            (
                "q5",
                "If 5 machines take 5 minutes for 5 widgets, time for 100 machines to make 100 widgets?",
                ["5 minutes", "100 minutes", "20 minutes", "1 minute"],
                "A",
                "Rate is 1 widget per machine per 5 minutes; 100 in 5 minutes.",
            ),
        ]

    def questions(self) -> List[Dict]:
        out = []
        for qid, prompt, choices, correct, rationale in self._items:
            out.append({"id": qid, "prompt": prompt, "choices": ["A", "B", "C", "D"]})
        return out

    def score(self, answers: Dict[str, str]) -> Dict:
        key = {qid: correct for qid, _, __, correct, ___ in self._items}
        total = len(key)
        s = 0
        breakdown = []
        for qid, _, __, correct, rationale in self._items:
            user_ans = (answers.get(qid) or "").strip().upper()
            ok = user_ans == correct
            if ok:
                s += 1
            breakdown.append(
                {
                    "question_id": qid,
                    "correct": ok,
                    "user": user_ans or None,
                    "rationale": rationale,
                }
            )
        return {"score": s, "total": total, "breakdown": breakdown}

