from __future__ import annotations

from typing import Dict, List, Tuple


Question = Dict[str, object]


_QUESTIONS: List[Question] = [
    {
        "id": "q1",
        "question": "Choose the sentence with correct grammar.",
        "choices": {
            "A": "Her and I went to the store.",
            "B": "She and I went to the store.",
            "C": "Me and her went to the store.",
            "D": "I and she went to the store.",
        },
        "answer": "B",
        "rationale": "Subject pronouns: 'She and I' is correct.",
    },
    {
        "id": "q2",
        "question": "Select the best transition for clarity: 'I studied hard; __ , I improved my grade.'",
        "choices": {"A": "however", "B": "therefore", "C": "meanwhile", "D": "instead"},
        "answer": "B",
        "rationale": "Cause→effect: 'therefore' signals a result.",
    },
    {
        "id": "q3",
        "question": "Identify the thesis statement.",
        "choices": {
            "A": "Many people like pizza.",
            "B": "This essay will discuss pizza.",
            "C": "Local pizzerias are superior to chains due to freshness and variety.",
            "D": "Pizza was invented in Italy.",
        },
        "answer": "C",
        "rationale": "A defensible claim with reasons: freshness and variety.",
    },
    {
        "id": "q4",
        "question": "Choose the correctly punctuated sentence.",
        "choices": {
            "A": "Because it was raining we stayed inside.",
            "B": "Because, it was raining, we stayed inside.",
            "C": "Because it was raining, we stayed inside.",
            "D": "Because it was raining we, stayed inside.",
        },
        "answer": "C",
        "rationale": "Introductory clause takes a comma before the main clause.",
    },
    {
        "id": "q5",
        "question": "Which sentence is most concise?",
        "choices": {
            "A": "At this point in time, we are currently planning",
            "B": "We are planning now",
            "C": "We are in the process of making plans",
            "D": "We are doing some planning at this time",
        },
        "answer": "B",
        "rationale": "Avoid redundancy; 'We are planning now' is concise.",
    },
]


def get_questions() -> Dict[str, object]:
    return {
        "assessment": "english-5q",
        "total": len(_QUESTIONS),
        "questions": [
            {"id": q["id"], "question": q["question"], "choices": q["choices"]}
            for q in _QUESTIONS
        ],
    }


def score_answers(answers: Dict[str, str]) -> Dict[str, object]:
    total = len(_QUESTIONS)
    score = 0
    breakdown: List[Dict[str, object]] = []
    ans_norm = {k.lower(): str(v).strip().upper() for k, v in answers.items()}
    for q in _QUESTIONS:
        qid = str(q["id"]).lower()
        correct = q["answer"]
        user = ans_norm.get(qid)
        ok = bool(user) and user == correct
        if ok:
            score += 1
        breakdown.append(
            {
                "id": q["id"],
                "correct": correct,
                "answer": user,
                "is_correct": ok,
                "rationale": q["rationale"],
            }
        )
    return {"assessment": "english-5q", "score": score, "total": total, "breakdown": breakdown}

