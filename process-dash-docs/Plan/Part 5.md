# Process Dash — Plan  
## Part 5: MCP Layer, Copilot, and LLM Hosting

---

## 1. What This Phase Adds

Parts 1–4 covered the philosophy, usage model, reporting strategy, and internal architecture of a modern PSP-inspired observability system. That foundation is now fully built (`process-dash-core-api` + `process-dash-frontend`).

Part 5 covers the next evolutionary layer:

> Replace manual UI navigation with a **conversational interface** powered by a locally-hosted LLM, connected to the core system via an MCP (Model Context Protocol) server.

This is not a replacement for the frontend — it is a second interface for lower-friction interactions: logging work, asking questions about your day or sprint, and triggering exports by talking naturally.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    process-dash-copilot                      │
│  LLM agent — interprets user input, calls MCP tools         │
└───────────────────────┬─────────────────────────────────────┘
                        │ MCP (tool calls)
┌───────────────────────▼─────────────────────────────────────┐
│                  process-dash-core-mcp                       │
│  MCP server — translates tool calls into HTTP requests       │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP REST
┌───────────────────────▼─────────────────────────────────────┐
│                  process-dash-core-api                       │
│  FastAPI — all business logic, event log, rollups            │
└───────────────────────┬─────────────────────────────────────┘
                        │ SQLite
┌───────────────────────▼─────────────────────────────────────┐
│                   process-dash-data                          │
│  workobs.sqlite — append-only event store                    │
└─────────────────────────────────────────────────────────────┘

         ┌────────────────────────────┐
         │     process-dash-llm        │
         │  llama-cpp / OpenAI-compat  │
         │  Docker container, port 11434│
         └────────────────────────────┘
              ▲
              │ OpenAI-compatible API
              │
    process-dash-copilot
```

The copilot talks to two things: the MCP server (for data tools) and the LLM server (for inference). Everything else is hidden behind those interfaces.

---

## 3. Component: process-dash-core-mcp

### Purpose

Expose the core API as a set of MCP tools that any MCP-compatible agent can call. The server owns no data — it is a pure translation layer.

### Technology

- Python, using the `mcp` SDK (`pip install mcp`)
- Runs as a long-lived HTTP or stdio MCP server
- One tool per logical capability

### Planned Tools

| Tool | Maps to | Description |
|---|---|---|
| `set_daily_intents` | `POST /api/intents/daily` | Set up to 5 intents for a date |
| `get_daily_intents` | `GET /api/intents/daily/{date}` | Retrieve intents for a date |
| `start_block` | `POST /api/blocks/start` | Start a focus block |
| `interrupt_block` | `POST /api/blocks/interrupt` | Interrupt current block with reason |
| `end_block` | `POST /api/blocks/end` | End current block |
| `start_recovery` | `POST /api/recovery/start` | Log start of a break |
| `end_recovery` | `POST /api/recovery/end` | Log end of a break |
| `get_day_rollup` | `GET /api/days/{date}` | Fetch day metrics |
| `list_sprints` | `GET /api/sprints` | List sprint definitions |
| `get_sprint_rollup` | `GET /api/sprints/{id}/rollup` | Sprint metrics |
| `get_sprint_summaries` | `GET /api/sprints/summaries` | All sprint summaries |
| `export_day` | `POST /api/export/day/{date}` | Export day as Markdown |

### Configuration

| Variable | Description | Default |
|---|---|---|
| `CORE_API_BASE_URL` | URL of process-dash-core-api | `http://localhost:8000/api` |
| `MCP_PORT` | Port to serve MCP on | `3100` |

### Docker Compose Service

```yaml
mcp:
  build:
    context: ./process-dash-core-mcp
  ports:
    - "3100:3100"
  environment:
    - CORE_API_BASE_URL=http://backend:8000/api
  depends_on:
    - backend
  networks:
    - process-dash-net
```

---

## 4. Component: process-dash-copilot

### Purpose

A conversational LLM agent that lets you interact with your work data in natural language. It calls the MCP tools to read and write data, and calls the LLM to generate responses.

### Technology

- Python
- OpenAI-compatible client (e.g. `openai` Python SDK, pointed at local LLM)
- MCP client for tool dispatch
- Simple REPL or HTTP interface for input

### Interaction Examples

```
You:  Start a focus block on the auth refactor
Bot:  Started a block for "auth refactor". Timer is running.

You:  I got pulled into a meeting
Bot:  Block interrupted. Reason logged as MEETING. Ready to resume when you are.

You:  How fragmented was my day today?
Bot:  You had 6 intent blocks. 4 were interrupted — 2 by MEETING, 1 by CONTEXT_SWITCH,
      1 by DEPENDENCY. Fragmentation rate: 67%. Focus blocks completed: 2.

You:  Export today's log
Bot:  Daily log for 2026-06-23 exported to Markdown.
```

### Configuration

| Variable | Description | Default |
|---|---|---|
| `MCP_SERVER_URL` | URL of process-dash-core-mcp | `http://localhost:3100` |
| `COPILOT_LLM_BASE_URL` | OpenAI-compatible LLM base URL | `http://localhost:11434/v1` |
| `COPILOT_LLM_MODEL` | Model name to use for inference | `llama3` |
| `COPILOT_LLM_API_KEY` | API key (use `none` for local) | `none` |

### Docker Compose Service

```yaml
copilot:
  build:
    context: ./process-dash-copilot
  ports:
    - "8080:8080"
  environment:
    - MCP_SERVER_URL=http://mcp:3100
    - COPILOT_LLM_BASE_URL=http://llm:11434/v1
    - COPILOT_LLM_MODEL=llama3
    - COPILOT_LLM_API_KEY=none
  depends_on:
    - mcp
    - llm
  networks:
    - process-dash-net
```

---

## 5. Component: process-dash-llm (LLM Hosting)

### Purpose

Host a locally-running LLM that exposes an OpenAI-compatible HTTP API. The copilot points to this container — no data leaves the machine.

### Technology Choice

**Option A — llama-cpp (recommended for control)**

- Image: `ghcr.io/ggerganov/llama.cpp:server`
- Serves OpenAI-compatible endpoint at `/v1/chat/completions`
- Model weights mounted as a volume (GGUF format)
- Low overhead, runs on CPU or GPU

**Option B — Ollama (recommended for ease)**

- Image: `ollama/ollama`
- Pull models with `ollama pull llama3`
- OpenAI-compatible via `http://localhost:11434/v1`
- Easier model management, slightly heavier image

**Option C — Cloud fallback**

- Set `COPILOT_LLM_BASE_URL=https://api.openai.com/v1`
- Set `COPILOT_LLM_API_KEY=<your key>`
- No container needed — just env var swap

The copilot code does not change between options. Only env vars differ.

### llama-cpp Docker Compose Service

```yaml
llm:
  image: ghcr.io/ggerganov/llama.cpp:server
  ports:
    - "11434:8080"
  volumes:
    - ./process-dash-llm/models:/models
  command: >
    -m /models/llama3.gguf
    --host 0.0.0.0
    --port 8080
    --ctx-size 4096
    --n-predict 512
  networks:
    - process-dash-net
```

### Model Selection Notes

- Use a 7B or 8B parameter model for a good quality/speed trade-off on CPU
- GGUF Q4_K_M quantization is a practical default (small size, reasonable quality)
- Recommended starting model: `Meta-Llama-3-8B-Instruct.Q4_K_M.gguf`
- Models are not committed to git — add `process-dash-llm/models/` to `.gitignore`

---

## 6. Privacy Guarantee

All components run locally inside Docker on your machine.

```
Your machine
├── process-dash-core-api    (event log, all your work data)
├── process-dash-core-mcp    (tool server, no data stored)
├── process-dash-copilot     (agent, no data stored)
└── process-dash-llm         (inference, model weights local)

External network: nothing leaves unless you explicitly choose Option C (cloud LLM)
```

This matches the PSP philosophy from Part 1: personal data sovereignty is non-negotiable.

---

## 7. Build Order

1. `process-dash-core-mcp` — build and test MCP tools against the running core API
2. `process-dash-llm` — get the LLM container running, verify OpenAI-compatible endpoint works
3. `process-dash-copilot` — wire LLM + MCP together, test conversational flows
4. Docker Compose — add all three new services, verify full stack comes up with `docker compose up`

---

## 8. Definition of Done for This Phase

- [ ] MCP server starts and all tools return correct responses when called manually
- [ ] LLM container serves `/v1/chat/completions` and returns coherent responses
- [ ] Copilot can log a focus block start/interrupt/end through natural language
- [ ] Copilot can answer "how was my day?" with data from the rollup tool
- [ ] Full stack starts with a single `docker compose up --build`
- [ ] Swap from local LLM to OpenAI API requires only env var changes

---

## 9. Guiding Rule for This Phase

> **The copilot is a convenience layer, not the source of truth.**  
> The event log is always correct. The copilot just makes writing to it easier.
