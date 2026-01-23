# Process Dashboard — Documentation Summary  
## Part 1: Big Picture & Philosophy

---

## 1. What Process Dashboard Is Trying to Solve

Process Dashboard exists to make **PSP/TSP-style engineering discipline sustainable** in real-world work.

The core problem it addresses is simple:
- Disciplined software processes require **fine-grained data collection**
- Manual collection is painful and discourages long-term adoption
- Without automation, even motivated engineers abandon the practice

Process Dashboard reduces the *friction* of collecting metrics while preserving the rigor needed for meaningful analysis.

---

## 2. The Core Feedback Loop (PSP Mindset)

The entire system is built around a continuous improvement loop:

1. **Plan** work (estimate size and time)
2. **Execute** while collecting data
3. **Measure** actual outcomes
4. **Analyze** historical data statistically
5. **Improve** process and future estimates

This is not just tracking — it is **measurement-driven learning**.

---

## 3. PSP vs TSP (Why the Tool Supports Both)

### PSP — Personal Software Process
Focuses on individual discipline:
- Time tracking by task and phase
- Defect injection and removal tracking
- Size estimation and actuals
- Estimation accuracy improvement over time

### TSP — Team Software Process
Scales PSP to teams:
- Aggregates individual metrics
- Supports team planning and tracking
- Emphasizes data consistency and privacy

The tool is explicitly designed to:
- Roll up individual data into team views
- Preserve **personal data ownership and privacy**
- Enable organization-level analysis without violating trust

---

## 4. More Than PSP: A General Process Engine

Although closely associated with PSP/TSP, Process Dashboard is described as a **general-purpose process enactment tool**.

Key idea:
- You can use the dashboard to implement **any defined process**
- PSP scripts are just one set of workflows
- Some features (e.g., earned-value-style tracking) work even without PSP

This makes it more of a **process + metrics platform** than a single methodology tool.

---

## 5. Scripts and Forms: The UX Strategy

The user experience is delivered through:
- Web-based **scripts and forms**
- Guided workflows for planning, execution, and postmortem
- A desktop engine acting as data store and coordinator

The philosophy is:
> The process should guide the user step-by-step, not rely on memory or discipline alone.

---

## 6. The Three Foundational Metrics

Everything in Process Dashboard revolves around three metrics:

### Time
- Actual effort spent
- Drives schedule tracking and estimation accuracy

### Defects
- Where defects are injected
- Where they are removed
- Encourages early defect removal and quality focus

### Size
- Anchor variable for estimation models
- Enables statistical prediction (e.g., PROBE)

These metrics are mandatory because they enable **objective learning**, not opinion-based retrospection.

---

## 7. The Underlying Worldview

The documentation reflects a strong philosophy rooted in SEI / Watts Humphrey thinking:

- Process is not bureaucracy — it is **feedback**
- Quality and predictability are **engineered**, not innate
- Estimation accuracy improves through **data + reflection**
- Improvement requires closing the loop with evidence

In modern terms:
> This is telemetry for human work, not just task management.

---

## 8. Practical Constraint Noted

The documentation portal is frame-based and some linked pages are not directly accessible programmatically.  
Despite this, the **conceptual foundation and core mechanics** are clearly described and can be summarized systematically.

---

## Next Section

**Part 2 — Core Usage (Day-to-Day):**
- Projects and task hierarchy
- Active task selection
- Time logging mechanics
- Defect logging
- Estimation vs actuals
- Rollups and completion logic