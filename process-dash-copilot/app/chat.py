"""
Chat session manager.

Maintains an in-memory message history per session and runs the
LLM tool-calling loop (call LLM → execute tools → continue → return reply).
"""

import json
import os

from dotenv import load_dotenv
load_dotenv()  # loads process-dash-copilot/.env when running outside Docker

from openai import OpenAI

from app.context import build_system_prompt
from app.mcp_caller import call_tool
from app.tools import TOOLS

LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "http://localhost:11434/v1")
LLM_MODEL = os.environ.get("LLM_MODEL", "llama3")
LLM_API_KEY = os.environ.get("LLM_API_KEY", "ollama")  # Ollama ignores this
MAX_TOOL_ROUNDS = 8  # safety cap on tool-call loops

# ── Session store (in-memory) ──────────────────────────────────────────────────

_sessions: dict[str, list[dict]] = {}


def _get_or_create_session(session_id: str) -> list[dict]:
    if session_id not in _sessions:
        _sessions[session_id] = [
            {"role": "system", "content": build_system_prompt()}
        ]
    return _sessions[session_id]


def clear_session(session_id: str) -> None:
    _sessions.pop(session_id, None)


# ── LLM client ────────────────────────────────────────────────────────────────

def _llm_client() -> OpenAI:
    return OpenAI(base_url=LLM_BASE_URL, api_key=LLM_API_KEY)


# ── Tool execution ─────────────────────────────────────────────────────────────


# ── Chat loop ─────────────────────────────────────────────────────────────────

def chat(session_id: str, user_message: str) -> dict:
    """
    Process a user message and return the assistant reply.

    Returns:
        {
            "reply": str,
            "toolCalls": [{"name": str, "args": dict, "result": str}, ...],
            "sessionId": str,
        }
    """
    messages = _get_or_create_session(session_id)
    messages.append({"role": "user", "content": user_message})

    client = _llm_client()
    tool_call_log: list[dict] = []

    for _ in range(MAX_TOOL_ROUNDS):
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
        )
        msg = response.choices[0].message

        # Add assistant message to history
        messages.append(msg.model_dump(exclude_unset=True))

        # No tool calls — we have a final text reply
        if not msg.tool_calls:
            reply = msg.content or ""
            return {
                "reply": reply,
                "toolCalls": tool_call_log,
                "sessionId": session_id,
            }

        # Execute tool calls once — build both the log and the LLM tool-result messages
        tool_results = []
        for tc in msg.tool_calls:
            args = {}
            try:
                args = json.loads(tc.function.arguments)
            except json.JSONDecodeError:
                pass
            result = call_tool(tc.function.name, args)
            tool_call_log.append({
                "name": tc.function.name,
                "args": args,
                "result": result,
            })
            tool_results.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": result,
            })
        messages.extend(tool_results)

    # Exceeded max rounds — ask the LLM to wrap up without more tools
    messages.append({
        "role": "user",
        "content": "Please provide a final answer based on what you have so far.",
    })
    final = client.chat.completions.create(
        model=LLM_MODEL,
        messages=messages,
    )
    reply = final.choices[0].message.content or ""
    messages.append({"role": "assistant", "content": reply})
    return {
        "reply": reply,
        "toolCalls": tool_call_log,
        "sessionId": session_id,
    }
