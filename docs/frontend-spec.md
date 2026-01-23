# Frontend UX Specification

## Pages

### Today

- Edit today's intents (max 5)
- **Start Block**:
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

### Week View

- Metrics:
  - total blocks
  - interrupted %
  - top fragmenters
- Reflection fields:
  - Not performance issues
  - One structural change

### Code Reviews

- Log review metadata
- Required vs suggestions
- Markdown export

## UX Rules

- Keyboard-first
- No judgment indicators
- Minimal UI, low friction
