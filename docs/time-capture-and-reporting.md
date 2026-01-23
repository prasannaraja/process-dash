# Time Capture and Reporting Strategy

This document defines **Option 2: Soft Timer Capture** with **Approximate Reporting Buckets**, designed to balance accurate private data with human-centric public reporting.

## A. Goals

- **Capture actual elapsed time** as an assist (soft timer) to reduce memory load.
- **Preserve user control**: The human is the final authority; timers are suggestions.
- **Report time approximately**: Avoid false precision (e.g., "47 minutes") which invites micromanagement. Use broad buckets (e.g., "~1 hour") for external sharing and reflection.

## B. Two Time Concepts

1. **Captured Time (Internal / Private)**
    - stored as `durationMinutes` (integer).
    - Represents the actual human-verified duration.
    - Used for personal reflection and identifying structural fragmentation.

2. **Reported Time (External / Public)**
    - Derived from `durationMinutes`.
    - Presented as a **Bucketed String** (e.g., "~15 mins", "~½ day").
    - Used for weekly summaries, team syncs, and "busyness" checks.

## C. Soft Timer Behavior (Option 2)

Measurements are **suggestions**, not mandates.

1. **Start Block**:
    - System records `startedAt` timestamp locally (frontend state).
    - *Optional*: Event payload can include `startedAt` for device syncing, but `startedAt` is **not** the source of truth for duration.

2. **Finish Block**:
    - System computes `suggestedMinutes = now - startedAt`.
    - UI prompts user: **"Duration: [ Input Field ] (Suggested: ~X mins)"**.
    - User accepts or accepts-and-adjusts (e.g. subtracting a 5 min bathroom break).

3. **Storage**:
    - The final, user-confirmed integer is stored as `durationMinutes` in the `intent_block_ended` event.

## D. "Full Day" Definition

To normalize reporting labels, we define a "sustainable active workday" (excluding breaks/lunch) as:

> **ACTIVE_WORKDAY_MINUTES = 360** (6 hours)

- **Quarter Day**: 90 mins
- **Half Day**: 180 mins
- **Full Day**: 360 mins

## E. Reporting Buckets (Derived)

When generating reports (Day View, Week View, Markdown Exports), map `durationMinutes` to these labels:

| Actual Minutes | Reported As Label |
|---------------:|:------------------|
| 0 – 15         | `~15 mins`        |
| 16 – 30        | `~30 mins`        |
| 31 – 60        | `~1 hour`         |
| 61 – 120       | `~2 hours`        |
| 121 – 180      | `~½ day`          |
| 181 – 360      | `~1 day`          |
| > 360          | `> 1 day`         |

### Rules

- **Display Only**: Buckets are calculated on-the-fly or in read-models. They are not stored as the primary value.
- **Privacy**: Raw minutes remain internal to the system database.

## F. Report Requirements

1. **Day/Week Reports**:
    - Tables must display the **Reported Label** by default.
    - *Future Feature*: A "Drill-down" toggle can reveal exact minutes for the owner only.

2. **Export Artifacts**:
    - Markdown exports (e.g., "Daily Log") must use the **Reported Label** in table columns.

## G. Implementation Notes

- **Frontend**: Responsible for the "Soft Timer" countdown and suggestion logic.
- **Backend**: Responsible for deriving the `durationLabel` field in `GET /days/{date}` and `GET /weeks/{yearWeek}` responses.
