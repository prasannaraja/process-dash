# Process Dash

Process Dash is a lightweight work observability app for tracking daily intents, focus blocks, interruptions, and recovery breaks.

It includes:
- A FastAPI backend with an event-log model (SQLite via SQLModel)
- A React + Vite frontend for daily and sprint workflows
- An MCP server that exposes the core API as tools for LLM consumption
- An LLM copilot that uses the MCP to interact with your work data conversationally
- Docker Compose for running both services together
- Markdown export for daily logs

## What It Tracks

- Daily intents (up to 5)
- Intent blocks (start, interrupt, finish)
- Interruption reasons (`MEETING`, `DEPENDENCY`, `CONTEXT_SWITCH`, etc.)
- Recovery blocks (`COFFEE`, `LUNCH`)
- Day and sprint rollups:
  - total blocks
  - interrupted blocks
  - fragmentation rate
  - focus blocks
  - active and recovery time labels
- Sprint reflection (top fragmenters, non-performance issues, next-sprint change)
- Sprint summaries history view (all saved sprint summaries in one place)
- Sprint definitions with editable start date and duration (7, 14, or custom N days)

## Tech Stack

- Backend: FastAPI, SQLModel, Alembic, SQLite
- Frontend: React 19, TypeScript, Vite, Tailwind CSS
- MCP Server: exposes core API as MCP tools for LLM agents
- Copilot: LLM agent powered by the MCP layer
- Tooling: Pytest, ESLint, Docker, Docker Compose

## Repository Layout

```text
process-dash-core-api/      FastAPI app, models, routers, services, tests
process-dash-core-mcp/      MCP server — wraps core API as tools for LLM agents
process-dash-copilot/       LLM copilot — uses the MCP to interact with work data
process-dash-frontend/beta/ React/Vite frontend
process-dash-docs/          Product and API documentation
process-dash-data/          SQLite storage (mounted in Docker)
process-dash-backups/       Manual backup copies (mounted in Docker)
scripts/                    Convenience run scripts
```

### Architecture Overview

```
process-dash-copilot  ──(MCP)──▶  process-dash-core-mcp  ──(HTTP)──▶  process-dash-core-api
                                                                               │
process-dash-frontend  ──────────────────────────────────(HTTP)──────────────▶│
                                                                         SQLite (process-dash-data)
```

The copilot and frontend both talk to the same core API — the copilot via the MCP layer, the frontend directly over HTTP.

## Quick Start (Docker)

From the repository root:

```bash
docker compose up --build
```

Services:
- Frontend: `http://localhost:5051`
- Backend API: `http://localhost:8001`
- Swagger UI: `http://localhost:8001/docs`

Notes:
- Frontend container exposes Vite on host port `5051`.
- Backend data is persisted via `./process-dash-data:/data` and defaults to `/data/workobs.sqlite` in Docker.
- Backup files can be kept in `./process-dash-backups:/backups` via `WORKOBS_BACKUP_DIR=/backups`.

## Storage Configuration

You can choose where SQLite is stored through environment variables.

- `WORKOBS_DB_PATH`: absolute or relative path to active SQLite file.
- `WORKOBS_BACKUP_DIR`: directory used for manual backup copies.
- `WORKOBS_DB_STRICT_PATH`: if `true`, startup fails when configured paths do not exist.

Default behavior when `WORKOBS_DB_PATH` is not set:
- Windows: `%APPDATA%/work-observability/workobs.sqlite`
- macOS: `~/Library/Application Support/work-observability/workobs.sqlite`
- Linux: `~/.local/share/work-observability/workobs.sqlite`

In Docker Compose (current defaults):
- Active DB: `/data/workobs.sqlite` backed by `./process-dash-data`
- Backup dir: `/backups` backed by `./process-dash-backups`

Inspect active runtime paths:

```bash
curl http://localhost:8001/api/health/storage
```

### Manual Backup and Restore

Recommended restore-safe workflow:

1. Stop app containers.
2. Copy database file from backup directory to active path.
3. Start containers again.
4. Verify API health and expected data.

PowerShell example:

```powershell
Copy-Item .\data\workobs.sqlite .\backups\workobs-$(Get-Date -Format yyyyMMdd-HHmmss).sqlite
```

Restore example:

```powershell
& 'C:\Program Files\Docker\Docker\resources\bin\docker.EXE' compose -f 'docker-compose.yml' down
Copy-Item .\backups\workobs-20260309-120000.sqlite .\data\workobs.sqlite -Force
& 'C:\Program Files\Docker\Docker\resources\bin\docker.EXE' compose -f 'docker-compose.yml' up -d --build
```

## Run Without Docker

### 1) Backend

```bash
cd process-dash-core-api
python -m venv venv
# Windows PowerShell
./venv/Scripts/Activate.ps1
# macOS/Linux
# source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2) Frontend

```bash
cd process-dash-frontend/beta
npm install
npm run dev
```

Optional API base override (if needed):
- Set `VITE_API_BASE` to point to backend, for example `http://localhost:8000/api`.

## API Summary

Base path: `/api`

- `GET /health`
- `GET /health/storage`
- `POST /intents/daily`
- `GET /intents/daily/{date}`
- `POST /blocks/start`
- `POST /blocks/interrupt`
- `POST /blocks/end`
- `POST /recovery/start`
- `POST /recovery/end`
- `GET /days/{date}`
- `GET /sprints`
- `POST /sprints`
- `PATCH /sprints/{sprintId}`
- `GET /sprints/{sprintId}/rollup`
- `POST /sprints/{sprintId}/summary`
- `GET /sprints/summaries`
- `POST /export/day/{date}`
- `POST /export/sprint/{sprintId}` (placeholder)

See `docs/api-contract.md` for request and response examples.

## Data Model and Rollups

The backend stores immutable events in `event_log` and computes day/sprint views by replaying events.

Core event types include:
- `daily_intents_set`
- `intent_block_started`
- `intent_block_interrupted`
- `intent_block_ended`
- `recovery_block_started`
- `recovery_block_ended`
- `sprint_summary_saved`

Durations are stored as minutes and reported with approximate bucket labels (for example `~30 mins`, `~1 hour`, `~1 day`).

## Tests

Backend tests:

```bash
cd process-dash-core-api
python -m pytest -q
```

## Helpful Scripts

- `scripts/run_all.ps1` starts backend and frontend in separate PowerShell windows.
- `scripts/run_backend.sh` starts backend on port `8000`.
- `scripts/run_frontend.sh` starts frontend Vite dev server.
- `scripts/backfill_weekly_summaries_to_sprints.py` migrates legacy `weekly_summary_saved` events to `sprint_summary_saved`.
- `scripts/db_backup.ps1` creates timestamped SQLite backup copies.
- `scripts/db_restore.ps1` restores a chosen SQLite backup file.

### Legacy Backfill (Optional)

Run this once if your existing data contains `weekly_summary_saved` events created before the sprint-first cutover:

```bash
cd process-dash-core-api
python ..\scripts\backfill_weekly_summaries_to_sprints.py
```

## Current Status / Known Gaps

- Sprint export endpoint exists (`POST /export/sprint/{sprintId}`) but is not implemented yet.
- Frontend contains default Vite scaffold README in `frontend/beta/README.md`; root README is the primary project guide.
- `process-dash-core-mcp` and `process-dash-copilot` are scaffolded but not yet implemented.

## Viewing Sprint Progress

Use the frontend `Sprints` tab (`/sprints`) to view all saved sprint summaries in one place.

This page shows:
- Every sprint summary (latest entry per sprint)
- Progress metrics per sprint (blocks, interruptions, fragmentation, focus)
- Reflection details (top fragmenters, non-performance issues, next-week structural change)

It now also supports:
- Creating sprint definitions with custom duration
- Editing sprint dates/duration with warning-confirm flow when historical summaries exist

## Documentation

- `process-dash-docs/api-contract.md`
- `process-dash-docs/backup-restore.md`
- `process-dash-docs/metrics-definition.md`
- `process-dash-docs/time-capture-and-reporting.md`
- `process-dash-docs/frontend-spec.md`
- `process-dash-docs/db-schema.md`
