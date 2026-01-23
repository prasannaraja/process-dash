# API Contract (MVP)

Base URL: `/api`

---

## Health

### GET /health

Response:

```json
{ "status": "ok" }
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
- **Includes** new metric: `totalActiveLabel` (e.g., "~½ day").

Includes constant: `ACTIVE_WORKDAY_MINUTES = 360` for labeling.

---

## Weekly

### POST /weeks/{yearWeek}/summary

```json
{
  "topFragmenters": ["MEETING", "DEPENDENCY"],
  "notPerformanceIssues": ["Environment instability"],
  "oneChangeNextWeek": "Cluster meetings post-lunch"
}
```

### GET /weeks/{yearWeek}

Returns weekly rollup and reflections.

---

## Export

### POST /export/day/{date}

### POST /export/week/{yearWeek}

Exports Markdown files.
