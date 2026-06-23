"""
process-dash-copilot — conversational AI copilot for Process Dash.

Endpoints:
  GET  /health            — liveness check
  POST /chat              — send a message, get a reply + tool call log
  DELETE /sessions/{id}   — clear a session's message history
"""

import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.chat import chat, clear_session

app = FastAPI(title="Process Dash Copilot", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ─────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    sessionId: str = ""  # if empty, a new session is created


class ChatResponse(BaseModel):
    reply: str
    sessionId: str
    toolCalls: list[dict] = []


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "process-dash-copilot"}


@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest):
    session_id = req.sessionId.strip() or str(uuid.uuid4())
    try:
        result = chat(session_id, req.message)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return ChatResponse(
        reply=result["reply"],
        sessionId=result["sessionId"],
        toolCalls=result["toolCalls"],
    )


@app.delete("/sessions/{session_id}")
def delete_session(session_id: str):
    clear_session(session_id)
    return {"ok": True, "sessionId": session_id}
