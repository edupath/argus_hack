from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Agentic Educational Advisor")


@app.get("/")
def root():
    return {"status": "ok"}


class ChatRequest(BaseModel):
    message: str


@app.post("/chat")
def chat(req: ChatRequest):
    # Placeholder implementation – to be replaced with real agent logic
    return {"reply": f"Echo: {req.message}", "note": "Placeholder endpoint"}

