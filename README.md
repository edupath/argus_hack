# Title
Agentic Educational Advisor

# Overview
This project builds an AI-powered, agentic advisor that guides students from goal discovery through real-time application and evaluation for educational programs. It compresses program discovery, guidance, application, assessment, and evaluation into a single, adaptive tool. When partners don’t support real-time decisions, the agent assembles and submits materials to the partner’s system and continues advising the student.

# Key Features
- Goal discovery dialog: elicit student goals, constraints, timelines, preferences.
- Opportunity matching: surface best-fit programs (college, bootcamps, etc.) with transparent rationales.
- Requirements intelligence: fetch and track program prerequisites, deadlines, and required materials.
- Real-time application flow: replace forms with conversational intake; assemble a complete application dossier.
- Micro-assessments on demand: short skill checks triggered contextually to verify readiness/fit.
- Artifact collection: request transcripts, certificates, portfolios; validate formats and completeness.
- Adaptive interviews: structured, competency-based interviews with scoring rubrics.
- Multi-path suggestions: proactively propose adjacent programs and explain trade-offs.
- Partner handoff: package and transmit applications to partner systems when direct agentic decisions aren’t permitted.
- Progress tracking & feedback: clear status, next steps, and personalized guidance.
- Privacy & auditability: explain data use; keep a traceable log of decisions and evidence.

# Initial Scope (MVP)
- Conversational intake → goals, constraints, basic profile.
- Program requirements lookup (mock adapters at first).
- Micro-assessment framework (plug-in style, e.g., math/logic/English).
- Application dossier builder (JSON schema + renderer).
- Partner handoff stub (queue + webhook/sample adapter).
- Basic audit log (who/what/when/why) for every decision.

# Proposed Architecture (brief)
- Core service: orchestration + reasoning (GPT-5).
- Skills/Tools: adapters for requirements lookup, assessments, file intake, partner APIs.
- Data: student profile, dossier schema, assessment results, decision log.
- UI: chat-first flow; optional web components for uploads + assessments.
- Storage: local dev (sqlite/filesystem); production to be defined.

# Local Development
- This repo is a development/testing sandbox; use a local venv or Node environment.
- Codex CLI is running in Full Auto; prefer small, incremental commits.
- See AGENTS.md for repo conventions.

## FastAPI Setup
- Prereqs: Python 3.11+
- Install deps and create venv:
  - `make install`
- Run the service (reload enabled):
  - `make run`
- Test the health endpoint:
  - `curl http://127.0.0.1:8000/`
- Run tests (requires `pytest` installed in your venv):
  - `make test`

### Persistence (SQLite + SQLModel)
- Database file: `data/app.db` (created automatically)
- ORM: SQLModel
- Reset the DB (dangerous):
  - Stop the app and run `rm -f data/app.db` (or `rm -rf data/`)
  - Then restart the app to recreate tables

### Debugging
- Add `?debug=1` to API requests or header `X-Debug: true` to surface per-message reasoning.
- A compact, single-line audit is appended to `data/audit.log` for each message.

### Requirements Preview
- Mock adapter supports a few example programs.
- Preview via API:
  - `curl -s -X POST http://127.0.0.1:8000/requirements/preview -H 'Content-Type: application/json' -d '{"program_name":"City College — Data Analytics Certificate"}' | jq`
- During chat, if a known program name appears in a message, the reply suggests: "preview <name>" to see requirements.

### Logic5 Micro-Assessment
- Questions: `GET /assessments/logic5/questions`
- Scoring: `POST /assessments/logic5/score` with body `{"answers":{"q1":"A","q2":"D","q3":"A","q4":"D","q5":"A"}}`
- Chat flow:
  - Say `start logic5` to receive questions in chat.
  - Reply with `answers: q1=A,q2=D,q3=A,q4=D,q5=A` to score.
  - If your goals mention CS/engineering/data and no prior Logic5 result exists, the agent suggests taking it.

Project layout:

```
src/
  main.py            # FastAPI app
  models/            # Pydantic models (StudentProfile, ProgramMatch)
  services/          # placeholders: requirements_lookup, assessment, dossier_builder
tests/
  test_main.py       # basic GET "/" test
requirements.txt     # runtime dependencies
Makefile             # install/run/test helpers
```

# Next Steps (high-value tasks)
1) Scaffold a minimal service with a chat loop and an in-memory student profile.
2) Implement a requirements adapter interface with one mock provider.
3) Add a micro-assessment plugin interface and a sample (e.g., 5-question logic quiz).
4) Implement dossier schema + renderer (JSON → Markdown + HTML).
5) Create a partner handoff stub (POST to a local endpoint; queue for retries).
6) Add an audit log that captures: input, tool calls, outputs, and rationale summary.
7) Write unit tests for adapters and assessment scoring.
8) Add a simple web uploader component (transcript.pdf) with validation.

# Example Commands (Dev)
- Python: `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
- Node: `npm install && npm run dev`
- Tests: `pytest -q` or `npm test`

Note: Do not commit `.venv`, `__pycache__`, or `.env`.

# License & Attribution
Internal prototype. Do not commit secrets. Follow AGENTS.md rules.
