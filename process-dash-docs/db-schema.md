# Database Schema

## Core Principle

All data is stored as **append-only events**.
No updates or deletes.

---

## Table: event_log

| Field   | Type     |
|--------|----------|
| id     | UUID     |
| ts     | datetime |
| type   | string   |
| payload| JSON     |

---

## Event Types

- daily_intents_set
- intent_block_started
- intent_block_ended
- intent_block_interrupted
- sprint_summary_saved
- recovery_block_started
- recovery_block_ended
- code_review_logged

Legacy migration source:
- weekly_summary_saved (read-only legacy event; can be backfilled via `scripts/backfill_weekly_summaries_to_sprints.py`)

---

## Rules

- Corrections are new events
- Rollups are always derived
- Raw events are the source of truth
