install:
	python -m venv .venv && \
	. .venv/bin/activate && \
	pip install -r requirements.txt

test:
	PYTHONPATH=. .venv/bin/pytest -q

run:
	PYTHONPATH=src .venv/bin/python -m uvicorn src.main:app --reload
