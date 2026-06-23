# process-dash-docs

Product and technical documentation for Process Dash.

## Documents

| File | Description |
|---|---|
| `api-contract.md` | Full REST API reference with request/response examples |
| `db-schema.md` | Database schema — event_log table, event types, and payload shapes |
| `frontend-spec.md` | Frontend page specs and component behaviour |
| `metrics-definition.md` | Definitions for fragmentation rate, focus blocks, active time, and other rollup metrics |
| `time-capture-and-reporting.md` | Strategy and rules for how time is captured and reported |
| `interruption-codes.md` | Reference for all interruption reason codes (`MEETING`, `DEPENDENCY`, etc.) |
| `backup-restore.md` | Manual backup and restore workflow for the SQLite database |
| `Overview.md` | High-level product overview and goals |
| `Actionable Items.md` | Running list of tracked action items and decisions |
| `Post-Documentation Plan.md` | Documentation plan written after initial build |
| `Practical Time-Capture Strategy.md` | Pragmatic notes on time capture in real workflows |

## Plan/

Long-form planning documents and observability logs from the development process:

| File | Description |
|---|---|
| `Plan/Part 1–4.md` | Phased build plan |
| `Plan/observability-log/` | Daily and weekly logs, metrics definitions, interruption codes, philosophy notes, and future automation ideas captured during development |

## Usage

These documents are the source of truth for API behaviour, data shape, and product decisions. When in doubt about how a metric is calculated or what an event payload should contain, check here before reading the code.
