from __future__ import annotations

from typing import List, Dict, Any


def questions() -> List[Dict[str, Any]]:
    return [
        {
            "id": 1,
            "question": "If all Bloops are Razzies and all Razzies are Lazzies, are all Bloops Lazzies?",
            "choices": ["Yes", "No", "Cannot determine", "Only sometimes"],
            "answer": 0,
        },
        {
            "id": 2,
            "question": "Which number comes next in the sequence 2, 4, 8, 16, ?",
            "choices": ["20", "24", "30", "32"],
            "answer": 3,
        },
        {
            "id": 3,
            "question": "A is taller than B and B is taller than C. Who is the tallest?",
            "choices": ["A", "B", "C", "Cannot determine"],
            "answer": 0,
        },
        {
            "id": 4,
            "question": "Find the odd one out: dog, cat, bird, tree",
            "choices": ["dog", "cat", "bird", "tree"],
            "answer": 3,
        },
        {
            "id": 5,
            "question": "If it takes 5 machines 5 minutes to make 5 widgets, how long for 100 machines to make 100 widgets?",
            "choices": ["5 minutes", "100 minutes", "20 minutes", "1 minute"],
            "answer": 0,
        },
    ]


def score(answers: List[Dict[str, int]]) -> Dict[str, Any]:
    key = {q["id"]: q["answer"] for q in questions()}
    total = len(key)
    correct = 0
    correct_ids: List[int] = []
    for item in answers:
        qid = item.get("id")
        ans = item.get("answer")
        if qid in key and ans == key[qid]:
            correct += 1
            correct_ids.append(qid)
    return {"assessment": "logic5", "score": correct, "max_score": total, "correct": correct_ids}

