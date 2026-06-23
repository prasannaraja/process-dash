# Post-Documentation Plan  
## Bridging the Gap & Covering Everything End-to-End

---

## 1. Where We Are Now (Current State)

### Completed

- Full conceptual and functional understanding of Process Dashboard (PSP/TSP philosophy)
- Canonical domain model implemented as an append-only event log in SQLite
- **`process-dash-core-api`** — FastAPI backend fully built: intents, blocks, recovery, sprints, projects, todos, export, rollups, reporting, time buckets
- **`process-dash-frontend/beta`** — React 19 + Vite frontend with 10 pages covering daily, week, sprint, project, and todo workflows
- Docker Compose setup for local and container deployment
- Full documentation across all packages

### In Progress

- **`process-dash-core-mcp`** — MCP server wrapping the core API (scaffolded, not yet implemented)
- **`process-dash-copilot`** — LLM copilot using the MCP layer (scaffolded, not yet implemented)

### Not Yet Started

- LLM hosting container (llama-cpp or OpenAI-compatible)
- Sprint export endpoint (placeholder only)
- Passive/automated time capture
- External integrations (Git, calendar, CI)

---

## 2. The Core Gap We Must Bridge

### The Gap
> Strong ideas → weak modern usability

Specifically:
- High cognitive load for manual logging
- No conversational or natural-language interface
- No way to query your own data without navigating the UI

### The Goal
> Preserve **rigor + learning**, remove **friction + ceremony**

The MCP + Copilot layer is the answer to this gap — it lets you interact with your work data through natural language while keeping the structured event log as the source of truth.

---

## 3. Bridging Strategy

Four deliberate layers, building on each other:

```
Concepts → Model → Workflow → Copilot Automation
```

Layers 1–3 are complete. Layer 4 (Copilot) is the active front.

---

## 4. Layer 1 — Concept Translation ✅ Done

PSP concepts mapped to modern equivalents:

| PSP Concept       | This System                  |
|-------------------|------------------------------|
| Task              | Intent / Work Block          |
| Time Log          | Telemetry Event (event_log)  |
| Defect            | Interruption / Quality tag   |
| Rollup            | Day / Sprint aggregation     |
| Postmortem        | Sprint summary + reflection  |
| Script            | Guided UI workflow           |

---

## 5. Layer 2 — Canonical Domain Model ✅ Done

Implemented in `process-dash-core-api`:

- Append-only `event_log` table — all data as immutable events
- Rollups derived on read, never stored
- Projects, sprints, intents, blocks, recovery, todos all modelled
- SQLite local-first; configurable path via env vars

See `process-dash-docs/db-schema.md` for full schema.

---

## 6. Layer 3 — Daily Workflow ✅ Done

Delivered through `process-dash-frontend/beta`:

- Today page — declare intents, log blocks and interruptions
- DayView — review any day's rollup
- WeekView / WeekendSummary — weekly reflection
- SprintSummaries — sprint history and metrics
- Projects — project-level tracking
- Todos — lightweight task list

---

## 7. Layer 4 — Copilot Automation 🚧 In Progress

### Objective

Let you log work, query history, and get insights through natural language — without opening the UI.

### Architecture

```
process-dash-copilot
    │
    │  MCP (tool calls)
    ▼
process-dash-core-mcp
    │
    │  HTTP (REST)
    ▼
process-dash-core-api
    │
    │  SQLite
    ▼
process-dash-data/workobs.sqlite
```

The copilot never touches the database directly. All reads and writes go through the MCP → API chain, keeping the event log as the single source of truth.

### LLM Hosting

The LLM powering the copilot runs locally in a Docker container using **llama-cpp** (or any OpenAI-compatible server). This keeps all data on-device — no data leaves your machine.

```
process-dash-llm  (Docker container)
  llama-cpp-python server OR any OpenAI-compatible endpoint
  exposes: http://localhost:11434/v1  (OpenAI-compatible API)
```

The copilot is designed to work with any OpenAI-compatible endpoint, so you can swap in:
- llama-cpp (local, private, offline)
- Ollama (local, easier model management)
- OpenAI API (cloud, higher capability)
- Any other OpenAI-compatible host

Configuration is a single env var (`COPILOT_LLM_BASE_URL`), no code changes.

---

## 8. Execution Roadmap

### Phase 1 — Alignment ✅ Done
- Locked modern domain vocabulary
- Froze canonical data model
- Defined minimum viable discipline

### Phase 2 — Prototype ✅ Done
- Local-first event log tracker
- REST API with full CRUD
- React frontend for daily and sprint workflows

### Phase 3 — MCP Layer 🚧 Next
Build `process-dash-core-mcp`:
- Implement MCP server (Python, `mcp` SDK)
- Expose one tool per core API capability (intents, blocks, recovery, days, sprints, export)
- Wire `CORE_API_BASE_URL` config
- Add to Docker Compose as a service

### Phase 4 — Copilot 🔜 After Phase 3
Build `process-dash-copilot`:
- Connect to MCP via tool-calling loop
- Connect to LLM via OpenAI-compatible client
- Support conversational logging and querying
- Wire `COPILOT_LLM_BASE_URL` and `MCP_SERVER_URL` config
- Add to Docker Compose as a service

### Phase 5 — LLM Container 🔜 Alongside Phase 4
Build `process-dash-llm` Docker service:
- Base image: `ghcr.io/ggerganov/llama.cpp:server` or equivalent
- Mount model weights as a volume
- Expose OpenAI-compatible endpoint on port `11434`
- Document model selection and GGUF format requirements

### Phase 6 — Expansion 🔜 Future
- Passive time capture (IDE, Git, calendar signals)
- Sprint export endpoint (currently placeholder)
- Team-level aggregation
- External integrations (GitHub commits, CI, calendar)

---

## 9. Coverage Matrix

| Area          | Status   | Method                                      |
|---------------|----------|---------------------------------------------|
| Time          | ✅ Done  | Manual block logging via UI or copilot      |
| Intents       | ✅ Done  | Daily intent declaration                    |
| Sprints       | ✅ Done  | Sprint definitions, rollups, summaries      |
| Projects      | ✅ Done  | Project-level tracking                      |
| Quality       | ✅ Done  | Interruption reason codes                   |
| MCP layer     | 🚧 Next  | Tools wrapping core API                     |
| Copilot       | 🔜 Soon  | LLM agent over MCP                          |
| LLM hosting   | 🔜 Soon  | llama-cpp or OpenAI-compatible in Docker    |
| Passive capture | ❌ TBD | IDE/Git/calendar signals                    |
| Integrations  | ❌ TBD  | Git, CI, calendar, finance                  |

---

## 10. Guiding Rule Going Forward

> **Never automate confusion.**  
> First make it clear, then make it easy, then make it fast.

The event log is clear. The UI makes it easy. The copilot makes it fast.
