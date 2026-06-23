"""
process-dash-copilot — conversational AI copilot for Process Dash.

Endpoints:
  GET  /health                  — liveness check
  POST /chat                    — send a message, get a reply + tool call log
  DELETE /sessions/{id}         — clear a session's message history
  POST /v1/chat/completions     — OpenAI-compatible endpoint (session via X-Session-Id header)
"""

import time
import uuid
from typing import Optional

from fastapi import FastAPI, Header, HTTPException
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


# OpenAI-compatible models
class OAIMessage(BaseModel):
    role: str
    content: str


class OAIChatRequest(BaseModel):
    model: str = "process-dash-copilot"
    messages: list[OAIMessage]
    stream: bool = False


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


@app.post("/v1/chat/completions")
def openai_chat(req: OAIChatRequest, x_session_id: Optional[str] = Header(default=None)):
    """
    OpenAI-compatible chat completions endpoint.
    Session ID comes from the X-Session-Id header; a new one is created if absent.
    Only the last user message is forwarded to the copilot's chat loop.
    """
    session_id = (x_session_id or "").strip() or str(uuid.uuid4())

    # Extract the last user message
    user_messages = [m for m in req.messages if m.role == "user"]
    if not user_messages:
        raise HTTPException(status_code=400, detail="No user message found in messages array")
    last_user_message = user_messages[-1].content

    try:
        result = chat(session_id, last_user_message)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return {
        "id": f"chatcmpl-{uuid.uuid4().hex[:8]}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": req.model,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": result["reply"]},
                "finish_reason": "stop",
            }
        ],
        "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
        "x_session_id": session_id,
    }
