# Process Dashboard — Documentation Summary  
## Part 2: Core Usage (Day-to-Day Workflow)

---

## 1. Project & Task Hierarchy

Process Dashboard organizes work in a **tree structure**:

- **Project** → top-level container
- **Phases / Components** → logical breakdown (e.g., Design, Code, Test)
- **Tasks** → the atomic units where time and defects are recorded

Key idea:
> Metrics are always recorded at the **leaf task**, then automatically **rolled up** to parents.

This hierarchy enables:
- Fine-grained tracking without manual aggregation
- Natural drill-down from project → phase → task
- Consistent rollups for reporting

---

## 2. Selecting the Active Task (Context Switching)

Before doing any work, you explicitly **select an active task**.

Why this matters:
- All time logged goes to the currently selected task
- Prevents accidental misattribution of effort
- Encourages conscious context switching

This is intentional friction:
> You must *declare intent* before work is counted.

---

## 3. Time Tracking Mechanics

### Starting and Stopping Time
- Time is logged against the active task
- Typically done via a **timer**
- Manual adjustments are possible if needed

### What Gets Recorded
Each time log entry includes:
- Task
- Start / stop timestamps
- Elapsed time
- (Optionally) comments or phase context

Design principle:
> Time tracking should be **low-friction**, but **explicit**.

---

## 4. Defect Logging

Defects are treated as **first-class data**, not side notes.

Each defect entry captures:
- **Injection phase** (where the defect was introduced)
- **Removal phase** (where it was found/fixed)
- Type / category (depending on process)
- Optional description

Why this structure exists:
- Enables analysis of **where defects originate**
- Supports early defect removal strategies
- Makes quality measurable, not subjective

Important:
> Defects are logged when *discovered*, not retroactively guessed.

---

## 5. Estimation vs Actuals

### Estimation
Before starting work, you estimate:
- Size (e.g., LOC, proxy units)
- Time required

These estimates are stored alongside the task.

### Actuals
During and after execution:
- Actual time is accumulated automatically
- Actual size is entered during postmortem
- Actual defects are already logged

This creates a persistent dataset:
- Estimate → Actual → Delta
- Enables trend analysis and calibration over time

---

## 6. Rollups and Aggregation

Rollups happen **automatically**:

- Task → Phase
- Phase → Project
- Project → Portfolio (if configured)

Rolled-up metrics include:
- Total time
- Total defects
- Schedule variance
- Estimation accuracy indicators

Key benefit:
> You never manually “sum things up” — structure does the work.

---

## 7. Task Completion & Postmortem

Completing a task is not just marking it “done”.

The **postmortem** typically includes:
- Entering actual size
- Reviewing time logs
- Reviewing defect logs
- Confirming completeness

This enforces reflection:
> Learning happens *after* execution, not during the rush.

---

## 8. Reports as Daily Feedback

From day one, the system generates reports showing:
- Planned vs actual effort
- Defect distribution by phase
- Progress against schedule
- Historical trends

Reports are:
- Read-only
- Derived entirely from collected data
- Updated continuously as logs change

This keeps feedback **immediate and objective**.

---

## 9. Daily Mental Model

A typical daily flow looks like:

1. Select task
2. Start timer
3. Do work
4. Stop timer
5. Log defects as discovered
6. Repeat
7. Complete task → postmortem

Simple loop, repeated consistently.

---

## 10. Core Design Philosophy (Day-to-Day)

- Precision over convenience
- Structure over memory
- Measurement over opinion
- Automation over manual bookkeeping

In modern terms:
> This is disciplined observability for human work.

---

## Next Section

**Part 3 — Reports, Scripts & Automation**
- Process scripts and guided workflows
- Built-in reports and analytics
- What’s powerful vs clunky
- How teams actually use these features in practice