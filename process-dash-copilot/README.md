# process-dash-copilot

LLM-powered conversational copilot for Process Dash. Accepts natural language messages and responds by calling Process Dash tools, logging work, answering questions, and generating stand-up updates and sprint retro points.

## Role in the Architecture

```
process-dash-copilot  ──(tool calls)──▶  process-dash-core-api
        │
   LLM (OpenAI-compatible endpoint: Ollama, llama.cpp, or cloud)
```

The copilot uses OpenAI-compatible tool calling. In Phase 3, it calls the core API directly via `api_client.py`. In a future phase it will route all tool calls through the MCP server for full protocol compliance.

## API

### POST /chat

```json
{
  "message": "I just started working on the auth story, 3 points",
  "sessionId": "optional-uuid"
}
```

Response:
```json
{
  "reply": "Got it — I've started a focus block linked to 'Implement OAuth flow' and moved the story to IN_PROGRESS.",
  "sessionId": "uuid",
  "toolCalls": [
    { "name": "list_stories", "args": { "sprintId": "..." }, "result": "..." },
    { "name": "start_block",  "args": { "date": "2026-06-23", "intent": "auth story", "storyId": "..." }, "result": "..." },
    { "name": "update_story_status", "args": { "storyId": "...", "status": "IN_PROGRESS" }, "result": "..." }
  ]
}
```

If `sessionId` is omitted, a new session is created and the ID is returned. Pass it on subsequent messages to continue the conversation.

### DELETE /sessions/{sessionId}

Clears the message history for a session.

### GET /health

```json
{ "status": "ok", "service": "process-dash-copilot" }
```

## Configuration

| Variable | Description | Default |
|---|---|---|
| `LLM_BASE_URL` | OpenAI-compatible base URL | `http://localhost:11434/v1` (Ollama) |
| `LLM_MODEL` | Model name | `llama3` |
| `LLM_API_KEY` | API key (ignored by Ollama) | `ollama` |
| `CORE_API_BASE_URL` | Core API base URL | `http://localhost:8000/api` |
| `PORT` | Service port | `3200` |

## LLM options

**Option A — Ollama (local, free):**
```bash
ollama pull llama3           # or mistral, qwen2.5, etc.
# Set LLM_BASE_URL=http://localhost:11434/v1 (default)
```

**Option B — llama.cpp in Docker:**
```bash
# See docker-compose.yml for the commented ollama service block
```

**Option C — Cloud fallback:**
```bash
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=sk-...
```

## Run locally

```bash
cd process-dash-copilot
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 3200
```

## Run with Docker Compose

```bash
docker compose up copilot
# Copilot: http://localhost:3200
```

The copilot service depends on `backend` and `mcp`. To use Ollama locally, uncomment the `ollama` service in `docker-compose.yml` and pull a model.

## Example conversations

```
User: What did I do today?
→ Calls get_day → Summarises blocks, todos, metrics in plain English

User: I'm starting work on the payments story
→ Calls list_sprints → list_stories → start_block (with storyId) → update_story_status

User: Got interrupted by a meeting, about 45 mins ago
→ Calls get_day to find the open block → interrupt_block (MEETING)

User: What should I say in standup tomorrow?
→ Calls get_day + get_sprint_rollup → Formats yesterday/today/blockers

User: Give me my retro bullets for this sprint
→ Calls list_sprints + get_sprint_rollup → Formats delivery/fragmentation/improvements
```
