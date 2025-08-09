# Agent Instructions

## Project Purpose
This is a scratch repo to test Codex CLI (Full Auto) with GPT-5. Priorities: speed, clear diffs, and safe/traceable changes.

## What You Can Do (Full Auto)
- You may create/edit files and run shell commands.
- Default to incremental commits with meaningful messages.
- After non-trivial changes, run `/diff` and show a brief summary.

## Languages & Stack
- Prefer Node.js (latest LTS) and/or Python 3.11+.
- For web demos: vanilla HTML/CSS/JS unless asked for a framework.

## Conventions
- Use readable, commented code.
- Create a README.md for anything runnable (with quickstart steps).
- Use `.env` for secrets; never commit secrets.

## Testing & Quality
- For Python: `pytest -q` when tests exist.
- For Node: `npm test` when tests exist.
- If adding new modules, generate minimal tests when reasonable.

## Dependencies
- Prefer local installs (`npm i --save`, `python -m venv .venv && pip install -r requirements.txt`).
- Do not install global packages unless requested.

## Git & Commits
- Commit in small steps.
- Message format: `<area>: <what and why>` (e.g., `docs: add README with setup`).
- Keep main branch clean; feel free to create feature branches if needed.

## Safety & Limits
- Do not run long-lived servers without telling me first.
- Do not remove files without confirmation unless trivial (cache/temp).

## Handy Commands
- `/status` to show mode/config.
- `/diff` after changes.
- `/undo` to revert last action.
