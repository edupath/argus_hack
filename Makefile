install:
	python -m venv .venv && \
	. .venv/bin/activate && \
	pip install -r requirements.txt

test:
	PYTHONPATH=. .venv/bin/pytest -q

run:
	PYTHONPATH=. .venv/bin/python -m uvicorn src.main:app --reload

docker-build:
	docker build -t argus_hack-api:local .

up:
	docker compose up --build

down:
	docker compose down
