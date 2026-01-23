# Code Review Log

## Human-Centric, Trust-Preserving Review Documentation

---

## 1. Purpose

This document exists to:

- Capture **what was reviewed**
- Record **quality observations**
- Surface **systemic issues**, not personal faults
- Build **shared understanding and trust**
- Create **traceable learning**, not blame artifacts

This document is **not**:

- A performance evaluation
- A fault-finding exercise
- A justification or evidence record

> Code review is a **quality feedback loop**, not an audit.

---

## 2. When to Create a Review Log

Create a log when reviewing:

- A PR / MR of non-trivial size
- A significant feature, bugfix, or refactor
- Architectural or cross-cutting changes
- Defects, regressions, or risky areas
- Complex logic that benefits from explanation

Do **not** create a log for trivial or mechanical changes.

---

## 3. Review Context

```md
## Review Metadata
- Date:
- Reviewer:
- Author:
- Repository / Module:
- PR / Branch / Commit:
- Review Type: Feature | Bugfix | Refactor | Architecture | Hotfix
- Review Duration (rounded):
```

Notes:

- Duration is **approximate**
- Purpose is **visibility**, not accounting

---

## 4. Review Intent (Mandatory)

```md
## Review Intent
What was the primary goal of this review?
- [ ] Correctness
- [ ] Readability
- [ ] Maintainability
- [ ] Performance
- [ ] Security
- [ ] Architecture alignment
- [ ] Knowledge sharing
```

Rule:
> A review without declared intent becomes subjective and unfair.

---

## 5. High-Level Summary (Factual Only)

```md
## High-Level Summary
Brief, neutral description of what the change does and its scope.
Avoid opinions or judgment.
```

Example:
> Adds validation logic to the payment flow and centralizes error handling in shared middleware.

---

## 6. What Went Well (Always Required)

```md
## What Went Well
- Clear separation of concerns
- Tests cover major edge cases
- Naming and structure improved over previous version
```

Rule:
> Every review **must** acknowledge strengths.

---

## 7. Review Findings (Structured)

Only fill sections that are relevant.

### 7.1 Correctness

- [ ] Issues found
- [ ] No issues
Notes:

### 7.2 Readability & Maintainability

Notes:

### 7.3 Architecture & Design

Notes:

### 7.4 Performance / Scalability

Notes:

### 7.5 Security / Safety

Notes:

---

## 8. Required Changes vs Suggestions

### Required Changes (Blocking)

- Must be addressed before merge
- Keep this list **short and explicit**

### Suggestions (Non-Blocking)

- Improvements for later
- Optional refactors
- Style or clarity enhancements

Rule:
> If everything is “blocking”, nothing is.

---

## 9. Systemic Observations

```md
## Systemic Observations
Patterns not specific to this change:
- Repeated null checks across modules
- Duplicated validation logic
- Tests hard to read due to setup complexity
```

Feeds:

- Refactoring backlog
- Architecture discussions
- Technical debt visibility

---

## 10. Review Outcome

```md
## Review Outcome
- [ ] Approved
- [ ] Approved with comments
- [ ] Changes requested
- [ ] Follow-up review required
```

---

## 11. Knowledge Transfer (Optional)

```md
## Knowledge Transfer
- Learned about module X
- Discovered implicit contract in service Y
- Identified undocumented behavior
```

---

## 12. Emotional Safety Rules

- Comment on **code**, not people
- Describe **effects**, not intent
- Prefer questions over declarations
- Assume positive intent
- Avoid sarcasm and absolutes

Bad:
> “This is bad design.”

Better:
> “This makes future extension harder because…”

---

## 13. Storage & Privacy

- Logs belong to the **reviewer**
- Share **summaries**, not raw notes
- Never weaponize review logs
- Use for improvement, not evidence

---

## 14. Folder Placement

```text
work-observability/
├── daily/
├── weekly/
├── code-reviews/
│   └── 2026-01-23-pr-142.md
├── reference/
```

---

## 15. Final Principle

> A good code review leaves the code better  
> **and the people safer**.
