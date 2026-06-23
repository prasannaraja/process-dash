# API Contract

Base URL: `/api`

> All write endpoints accept an optional `occurredAt` field (ISO 8601 datetime string) for retroactive logging. When omitted, the server uses the current time. When supplied, `occurredAt` records when the event actually happened while `ts` records when it was logged.

---

## Health

### GET /health

```json
{ "status": "ok" }
```

### GET /health/storage

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

Max 5 intents. Latest event for a date wins.

### GET /intents/daily/{date}

```json
{
  "date": "2026-06-23",
  "intents": ["Deep work", "Meetings", "Admin"]
}
```

---

## Intent Blocks

### POST /blocks/start

```json
{
  "date": "YYYY-MM-DD",
  "intent": "Deep work",
  "notes": "optional",
  "projectId": "uuid (optional)",
  "storyId": "uuid (optional)"
}
```

`storyId` links this focus block to a user story. It is carried through to the day rollup blocks list so you can see which story a block was working toward.

Response: `{ "blockId": "uuid" }`

### POST /blocks/interrupt

```json
{
  "blockId": "uuid",
  "reasonCode": "MEETING"
}
```

Valid reason codes: `MEETING`, `DEPENDENCY`, `CONTEXT_SWITCH`, `FAMILY`, `EMOTIONAL_LOAD`, `TECH_ISSUE`, `UNPLANNED_REQUEST`

### POST /blocks/end

```json
{
  "blockId": "uuid",
  "actualOutcome": "Partial implementation",
  "durationMinutes": 60
}
```

`durationMinutes` is the actual elapsed time. Rollups return both this and a bucketed `durationLabel` (e.g. `~1 hour`).

### GET /days/{date}

Returns a derived rollup for the day — blocks, recovery, todos, and metrics.

```json
{
  "date": "2026-06-23",
  "intents": ["Deep work", "Meetings"],
  "blocks": [
    {
      "blockId": "uuid",
      "storyId": "uuid or null",
      "intent": "Deep work",
      "notes": null,
      "date": "2026-06-23",
      "interrupted": true,
      "reasonCode": "MEETING",
      "actualOutcome": "Got halfway through",
      "durationMinutes": 45,
      "durationLabel": "~45 mins"
    }
  ],
  "recoveryBlocks": [
    {
      "blockId": "uuid",
      "kind": "LUNCH",
      "date": "2026-06-23",
      "durationMinutes": 30,
      "durationLabel": "~30 mins"
    }
  ],
  "todos": [],
  "metrics": {
    "totalBlocks": 3,
    "interruptedBlocks": 1,
    "fragmentationRate": 0.33,
    "focusBlocks": 2,
    "totalActiveMinutes": 180,
    "totalActiveLabel": "~3 hours",
    "totalRecoveryMinutes": 30,
    "totalRecoveryLabel": "~30 mins",
    "todosAdded": 0,
    "todosCompleted": 0
  }
}
```

---

## Recovery Blocks

### POST /recovery/start

```json
{
  "kind": "COFFEE",
  "date": "YYYY-MM-DD"
}
```

Valid kinds: `COFFEE`, `LUNCH`. Response: `{ "blockId": "uuid" }`

### POST /recovery/end

```json
{
  "blockId": "uuid",
  "durationMinutes": 15
}
```

---

## Sprints

### GET /sprints

Query params: `projectId` (optional)

```json
{
  "items": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "name": "Sprint 12",
      "startDate": "2026-06-09",
      "endDate": "2026-06-22",
      "durationDays": 14,
      "isArchived": false
    }
  ]
}
```

### POST /sprints

```json
{
  "name": "Sprint 12",
  "startDate": "YYYY-MM-DD",
  "durationDays": 14,
  "projectId": "uuid (optional)"
}
```

`endDate` is derived: `startDate + durationDays - 1`. Overlapping sprints are rejected with `409`.

### GET /sprints/{sprintId}

Returns a single sprint by ID. `404` if not found.

### PATCH /sprints/{sprintId}

```json
{
  "name": "Sprint 12B",
  "startDate": "YYYY-MM-DD",
  "durationDays": 14,
  "forceRecalculate": false
}
```

If the sprint has saved summaries and dates/duration are changing, returns:

```json
{ "ok": false, "requiresConfirmation": true, "warning": "..." }
```

Resend with `forceRecalculate: true` to apply.

### GET /sprints/{sprintId}/rollup

Returns metrics and reflection for the sprint's date range.

```json
{
  "sprintId": "uuid",
  "projectId": "uuid",
  "name": "Sprint 12",
  "startDate": "2026-06-09",
  "endDate": "2026-06-22",
  "durationDays": 14,
  "metrics": {
    "totalBlocks": 9,
    "interruptedBlocks": 3,
    "fragmentationRate": 0.33,
    "focusBlocks": 4,
    "topFragmenters": [{ "code": "MEETING", "count": 3 }],
    "totalActiveMinutes": 420,
    "totalActiveLabel": "~7 hours",
    "totalRecoveryMinutes": 80,
    "totalRecoveryLabel": "~1.5 hours",
    "todosCompleted": 2
  },
  "stories": {
    "storiesCommitted": 5,
    "storiesDone": 3,
    "storiesInProgress": 1,
    "storiesTodo": 1,
    "storiesCarriedOver": 0,
    "pointsCommitted": 18,
    "pointsDelivered": 11,
    "velocity": 11,
    "deliveryRate": 0.6
  },
  "reflection": {
    "topFragmenters": ["MEETING"],
    "notPerformanceIssues": ["Environment instability"],
    "oneChangeNextWeek": "Cluster meetings post-lunch"
  }
}
```

### POST /sprints/{sprintId}/summary

```json
{
  "topFragmenters": ["MEETING", "DEPENDENCY"],
  "notPerformanceIssues": ["Environment instability"],
  "oneChangeNextWeek": "Cluster meetings post-lunch"
}
```

### GET /sprints/summaries

Query params: `projectId` (optional). Returns latest saved summary per sprint with full metrics.

---

## User Stories

Stories represent the committed work items for a sprint. Status lifecycle: `TODO → IN_PROGRESS → DONE → CARRIED_OVER`. Valid Fibonacci point values: `1, 2, 3, 5, 8, 13`.

### GET /stories

Query params: `sprintId` (optional), `projectId` (optional), `status` (optional — `TODO`, `IN_PROGRESS`, `DONE`, `CARRIED_OVER`)

```json
{
  "items": [
    {
      "id": "uuid",
      "sprintId": "uuid",
      "projectId": "uuid",
      "title": "As a user I can log a focus block",
      "description": null,
      "acceptanceCriteria": null,
      "storyPoints": 3,
      "status": "TODO",
      "createdAt": "2026-06-09T08:00:00Z",
      "updatedAt": "2026-06-09T08:00:00Z"
    }
  ]
}
```

### POST /stories

```json
{
  "sprintId": "uuid",
  "projectId": "uuid (optional — inherited from sprint if omitted)",
  "title": "As a user I can log a focus block",
  "description": "optional",
  "acceptanceCriteria": "optional",
  "storyPoints": 3
}
```

Returns the created story object. `404` if `sprintId` does not exist. `422` if `storyPoints` is not a Fibonacci value.

### GET /stories/{storyId}

Returns a single story. `404` if not found or deleted.

### PATCH /stories/{storyId}

Updates any combination of: `title`, `description`, `acceptanceCriteria`, `storyPoints`, `status`. All fields optional.

```json
{
  "title": "Updated title",
  "storyPoints": 5,
  "status": "IN_PROGRESS"
}
```

When `status` changes, a `user_story_status_changed` event is appended to the event log.

### PATCH /stories/{storyId}/status

Shorthand for updating only the status. Fires `user_story_status_changed` event.

```json
{ "status": "DONE" }
```

### DELETE /stories/{storyId}

Soft-deletes the story — it is excluded from all list and rollup queries going forward. Appends a `user_story_deleted` event.

Response: `{ "ok": true }`

---

## Todos

### POST /todos

```json
{ "text": "Review PR #142", "date": "YYYY-MM-DD" }
```

Response: `{ "ok": true, "todoId": "uuid" }`

### GET /todos/{date}

```json
{
  "date": "2026-06-23",
  "todos": [
    {
      "todoId": "uuid",
      "text": "Review PR #142",
      "date": "2026-06-23",
      "completed": false,
      "completionDate": null
    }
  ]
}
```

### PATCH /todos/{todoId}/complete

```json
{ "completionDate": "YYYY-MM-DD" }
```

### PATCH /todos/{todoId}/uncomplete

```json
{ "completionDate": "YYYY-MM-DD" }
```

Reopens a completed todo. Clears `completed` and `completionDate` in rollups.

### DELETE /todos/{todoId}

No body. Todo is excluded from all future rollups.

---

## Projects

### GET /projects

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Auth Service",
      "description": null,
      "allocationStartDate": "2026-01-01",
      "allocationEndDate": null,
      "isActive": true
    }
  ]
}
```

### POST /projects

```json
{
  "name": "Auth Service",
  "description": "optional",
  "allocationStartDate": "YYYY-MM-DD (optional)",
  "allocationEndDate": "YYYY-MM-DD (optional)"
}
```

### GET /projects/{projectId}

Returns a single project.

### PATCH /projects/{projectId}

```json
{
  "name": "Auth Service v2",
  "description": "optional",
  "allocationStartDate": "YYYY-MM-DD",
  "allocationEndDate": "YYYY-MM-DD",
  "isActive": true
}
```

All fields optional.

### GET /projects/{projectId}/config

### PATCH /projects/{projectId}/config

```json
{
  "defaultSprintDurationDays": 14,
  "githubRepo": "owner/repo",
  "githubToken": "ghp_...",
  "githubUsername": "prasannaraja"
}
```

### GET /projects/{projectId}/github/activity?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD

Returns GitHub commits and PRs for the project within the date range. Returns `{ "configured": false }` if GitHub integration is not set up.

### GET /projects/{projectId}/members

### POST /projects/{projectId}/members

```json
{ "name": "Jane Smith", "email": "jane@example.com", "role": "CONTRIBUTOR" }
```

### PATCH /projects/{projectId}/members/{memberId}

```json
{ "name": "Jane Smith", "role": "LEAD", "isActive": false }
```

### GET /projects/{projectId}/contacts

### POST /projects/{projectId}/contacts

```json
{ "name": "Product Owner", "email": "po@example.com", "contactRole": "STAKEHOLDER", "isPrimary": true }
```

### GET /projects/{projectId}/allocations

### POST /projects/{projectId}/allocations

```json
{
  "teamMemberId": "uuid",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD (optional)",
  "allocationPercentage": 100
}
```

Overlapping allocations for the same member are rejected with `409`.

---

## Reports

### GET /reports/projects

Returns lifetime metrics for all active projects.

### GET /reports/projects/{projectId}/data

Returns metrics, sprint list, and block history for a specific project.

---

## Export

### POST /export/day/{date}

Returns a Markdown file download of the day's log.

### POST /export/sprint/{sprintId}

*Not yet implemented — returns placeholder.*

---

## Copilot

Base URL: `http://localhost:3200` (port `3200` in Docker Compose)

The copilot is a separate service (`process-dash-copilot`). It accepts natural language messages, calls Process Dash tools internally, and returns a plain-English reply plus a log of every tool call made.

### POST /chat

```json
{
  "message": "I'm starting work on the auth story",
  "sessionId": "optional-uuid"
}
```

`sessionId` is optional. If omitted, a new session is created and its ID is returned. Pass it on subsequent messages to maintain conversation history.

Response:
```json
{
  "reply": "Started a focus block linked to 'Implement OAuth flow' and moved it to IN_PROGRESS.",
  "sessionId": "uuid",
  "toolCalls": [
    { "name": "list_stories",        "args": { "sprintId": "..." }, "result": "..." },
    { "name": "start_block",         "args": { "date": "2026-06-23", "intent": "auth story", "storyId": "..." }, "result": "..." },
    { "name": "update_story_status", "args": { "storyId": "...", "status": "IN_PROGRESS" }, "result": "..." }
  ]
}
```

### DELETE /sessions/{sessionId}

Clears the conversation history for a session. The next message on that ID starts a fresh session.

Response: `{ "ok": true, "sessionId": "uuid" }`

### GET /health

```json
{ "status": "ok", "service": "process-dash-copilot" }
```

---

## MCP Server

The MCP server (`process-dash-core-mcp`) exposes the same 16 tools over:

- **stdio** — for Claude Desktop (`python server.py`)
- **SSE** — for service-to-service use (`python server.py --transport sse`, port `3100`)

SSE endpoint: `GET http://localhost:3100/sse`

See `process-dash-core-mcp/README.md` for Claude Desktop config and full tool list.
