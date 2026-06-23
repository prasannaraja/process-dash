# API Contract (MVP)

Base URL: `/api`

---

## Health

### GET /health

Response:

```json
{ "status": "ok" }
```

### GET /health/storage

Returns active storage configuration and file metadata useful for manual backup/restore workflows.

Response:

```json
{
  "databasePath": "/data/workobs.sqlite",
  "databaseExists": true,
  "databaseSizeBytes": 32768,
  "databaseModifiedAtEpoch": 1773039567.0,
  "backupDir": "/backups",
  "backupDirExists": true
}
```

---

## Daily Intents

### POST /intents/daily

```json
{
  "date": "YYYY-MM-DD",
  "intents": ["Deep work", "Meetings", "Admin"]
}
```

### GET /intents/daily/{date}

Returns stored daily intents.

---

## Intent Blocks

### POST /blocks/start

```json
{
  "date": "YYYY-MM-DD",
  "intent": "Deep work",
  "notes": "optional"
}
```

### POST /blocks/end

```json
{
  "blockId": "uuid",
  "actualOutcome": "Partial implementation",
  "durationMinutes": 60 
}
```

*Note: `durationMinutes` represents the actual captured minutes. Reports will return both this and a bucketed `durationLabel`.*

### POST /blocks/interrupt

```json
{
  "blockId": "uuid",
  "reasonCode": "MEETING"
}
```

### GET /days/{date}

Returns a derived rollup for the given day.

- **Includes** computed `durationLabel` (e.g., "~1 hour") for each block.
- **Includes** metric: `totalActiveLabel` (e.g., "~½ day").
- **Includes** metric: `totalRecoveryLabel` (e.g. "~1 hour").

Includes constant: `ACTIVE_WORKDAY_MINUTES = 360` for labeling.

---

## Recovery Blocks (Coffee / Lunch)

### POST /api/recovery/start

```json
{
  "kind": "COFFEE" | "LUNCH",
  "date": "YYYY-MM-DD"
}
```

### POST /api/recovery/end

```json
{
  "blockId": "uuid",
  "durationMinutes": 15
}
```

---

## Sprint Reflection

---

## Sprints

### GET /sprints

List configured sprint definitions.

### POST /sprints

```json
{
  "name": "Sprint 12",
  "startDate": "YYYY-MM-DD",
  "durationDays": 14
}
```

Creates a sprint. `endDate` is derived from `startDate + durationDays - 1`.

### PATCH /sprints/{sprintId}

```json
{
  "name": "Sprint 12B",
  "startDate": "YYYY-MM-DD",
  "durationDays": 14,
  "forceRecalculate": false
}
```

If summary data already exists and date/duration are changed, API responds with:

```json
{
  "ok": false,
  "requiresConfirmation": true,
  "warning": "This sprint already has saved summaries..."
}
```

Resend with `forceRecalculate: true` to apply.

### GET /sprints/{sprintId}/rollup

Returns metrics and reflection for that sprint date range.

### POST /sprints/{sprintId}/summary

```json
{
  "topFragmenters": ["MEETING", "DEPENDENCY"],
  "notPerformanceIssues": ["Environment instability"],
  "oneChangeNextWeek": "Cluster meetings post-lunch"
}
```

### GET /sprints/summaries

Returns latest saved summary per sprint including progress metrics and sprint date range metadata.

Response shape:

```json
{
  "items": [
    {
      "sprintId": "9f5f2ac6-0e7f-4b86-8eef-b86d6f20e779",
      "name": "Sprint 12",
      "startDate": "2026-03-02",
      "endDate": "2026-03-15",
      "durationDays": 14,
      "savedAt": "2026-03-09T12:34:56+00:00",
      "topFragmenters": ["MEETING"],
      "notPerformanceIssues": ["Environment instability"],
      "oneChangeNextWeek": "Cluster meetings post-lunch",
      "metrics": {
        "totalBlocks": 9,
        "interruptedBlocks": 3,
        "fragmentationRate": 0.33,
        "focusBlocks": 4,
        "totalActiveMinutes": 420,
        "totalActiveLabel": "> 1 day",
        "totalRecoveryMinutes": 80,
        "totalRecoveryLabel": "~2 hours"
      }
    }
  ]
}
```

---

## Export

### POST /export/day/{date}

### POST /export/sprint/{sprintId}

Exports Markdown files.
