run:
	uvicorn src.main:app --reload

test:
	pytest -q

install:
	python -m venv .venv && \
	. .venv/bin/activate && \
	pip install -r requirements.txt

