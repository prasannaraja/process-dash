# process-dash-core-api

FastAPI backend for Process Dash. Stores all work observability data as append-only events in SQLite and exposes a REST API consumed by both the frontend and the MCP layer.

## Structure

```
app/
  main.py          FastAPI app, CORS config, router registration
  models.py        SQLModel table definitions
  db.py            Engine setup and init_db
  settings.py      Pydantic settings (DB path, backup dir, env overrides)
  routers/         One file per resource: health, intents, blocks, recovery,
                   reports, sprints, projects, todos, export
  services/        Business logic: events, rollups, reporting, time_buckets,
                   export_md, github
migrations/        Alembic migration versions
tests/             Pytest suite (health, recovery, sprints, reporting, rollups)
```

## API

Base path: `/api`

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/health/storage` | Active DB path and file metadata |
| POST | `/intents/daily` | Set daily intents |
| GET | `/intents/daily/{date}` | Get intents for a date |
| POST | `/blocks/start` | Start a focus block |
| POST | `/blocks/interrupt` | Interrupt current block |
| POST | `/blocks/end` | End current block |
| POST | `/recovery/start` | Start a recovery break |
| POST | `/recovery/end` | End a recovery break |
| GET | `/days/{date}` | Day-level rollup |
| GET | `/sprints` | List sprint definitions |
| POST | `/sprints` | Create a sprint definition |
| PATCH | `/sprints/{sprintId}` | Update a sprint definition |
| GET | `/sprints/{sprintId}/rollup` | Sprint metrics rollup |
| POST | `/sprints/{sprintId}/summary` | Save sprint reflection |
| GET | `/sprints/summaries` | All saved sprint summaries |
| POST | `/export/day/{date}` | Export day log as Markdown |
| POST | `/export/sprint/{sprintId}` | Export sprint summary *(placeholder)* |

See `process-dash-docs/api-contract.md` for full request/response examples.

## Storage

Configured via environment variables:

| Variable | Description | Default |
|---|---|---|
| `WORKOBS_DB_PATH` | Path to SQLite file | OS-specific (see below) |
| `WORKOBS_BACKUP_DIR` | Directory for backup copies | Sibling `backups/` of DB file |
| `WORKOBS_DB_STRICT_PATH` | Fail on startup if paths don't exist | `false` |

OS defaults for `WORKOBS_DB_PATH`:
- macOS: `~/Library/Application Support/work-observability/workobs.sqlite`
- Windows: `%APPDATA%/work-observability/workobs.sqlite`
- Linux: `~/.local/share/work-observability/workobs.sqlite`

In Docker Compose the DB is mounted from `../process-dash-data` at `/data/workobs.sqlite`.

## Setup

```bash
cd process-dash-core-api
python -m venv venv
source venv/bin/activate   # Windows: ./venv/Scripts/Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Swagger UI: `http://localhost:8000/docs`

## Migrations

```bash
alembic upgrade head
```

## Tests

```bash
python -m pytest -q
```
