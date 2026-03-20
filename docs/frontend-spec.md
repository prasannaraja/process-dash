# Frontend UX Specification

## Pages

### Today

- Edit today's intents (max 5)
- **Start Block**:
  - Options: [Work Block] [Coffee] [Lunch]
  - Show "Started at: HH:mm"
- **Finish Block**:
  - Show suggested duration (calculated from start time)
  - Input: Dropdown of bucket options + "Use suggested"
  - Store: Actual minutes
  - Display: Bucket label
- Interrupt with single reason
- Show active block clearly

### Day View

- Table of intent blocks
- Columns:
  - Intent
  - Actual Outcome
  - Duration (rounded)
  - Interrupted (Y/N)
  - Reason

### Sprint View

- Metrics:
  - total blocks
  - interrupted %
  - top fragmenters
- Reflection fields:
  - Not performance issues
  - One structural change for next sprint

### Sprint Summaries

- List all saved sprint summaries
- Show sprint name and date range
- Show progress metrics per sprint
- Support sprint creation (name, start date, duration)
- Support sprint edits with warning-confirm flow when historical summaries exist

### Code Reviews

- Log review metadata
- Required vs suggestions
- Markdown export

## UX Rules

- Keyboard-first
- No judgment indicators
- Minimal UI, low friction
