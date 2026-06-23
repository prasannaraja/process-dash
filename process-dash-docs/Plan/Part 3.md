# Process Dashboard — Documentation Summary  
## Part 3: Reports, Scripts & Automation

---

## 1. Reports: The System’s Primary Output

Reports are not optional add-ons — they are the **main reason the data exists**.

Everything you enter (time, defects, size) ultimately feeds reports that help you:
- Understand what actually happened
- Compare plan vs reality
- Improve future estimates and quality

Important principle:
> If data doesn’t change decisions, it’s noise. Reports turn data into decisions.

---

## 2. Types of Reports

### Effort & Schedule Reports
These show:
- Planned vs actual time
- Schedule variance
- Progress over time

Used for:
- Detecting overruns early
- Understanding where time really goes
- Calibrating future estimates

---

### Defect Reports
Defect data is sliced by:
- Injection phase
- Removal phase
- Defect type/category

This enables:
- Identifying phases that inject most defects
- Measuring effectiveness of reviews/tests
- Driving earlier defect removal

Key insight:
> Quality problems are usually *systemic*, not random.

---

### Estimation Accuracy Reports
These focus on:
- Estimated vs actual size
- Estimated vs actual time
- Historical error trends

Purpose:
- Improve estimation skill statistically
- Reduce optimism bias
- Move from guessing → forecasting

---

## 3. Scripts: Guided Process Execution

Scripts are **web-based guided workflows** embedded in the dashboard.

They:
- Walk users through process steps
- Present forms in the correct order
- Enforce discipline without relying on memory

Examples:
- Planning scripts
- Development scripts
- Postmortem scripts

Think of scripts as:
> A “wizard” that encodes the process so you don’t have to remember it.

---

## 4. Scripts vs Reports (Clear Separation)

- **Scripts** → how you *do* the work
- **Reports** → how you *learn* from the work

This separation is intentional:
- Scripts collect data
- Reports interpret data
- Neither contaminates the other

---

## 5. Automation Through Structure (Not Bots)

Process Dashboard automation is **structural**, not reactive.

Automation comes from:
- Hierarchical task models
- Automatic rollups
- Derived metrics
- Script-driven workflows

Not from:
- AI suggestions
- Heuristic alerts
- Background agents

This reflects the era it was designed in, but the model is still solid.

---

## 6. Earned-Value–Style Tracking (Lightweight)

Without explicitly calling it “EVM”, the system supports:
- Planned value
- Actual effort
- Progress indicators

Used to answer:
- Are we ahead or behind schedule?
- How much work remains?
- Are estimates stabilizing?

This works even **without full PSP adoption**.

---

## 7. Customization via Scripts and Templates

Advanced users can:
- Customize scripts
- Define new process steps
- Tailor data capture to organizational needs

However:
- Customization is powerful
- But tooling is dated
- Requires comfort with configuration and templates

Trade-off:
> High rigor, moderate usability.

---

## 8. How Teams Actually Use This in Practice

Common real-world usage patterns:
- Individuals track time consistently
- Defects are logged mainly for significant issues
- Reports are reviewed weekly or postmortem
- Managers focus on rollups, not raw logs

Reality check:
> Perfect PSP adherence is rare — partial adoption still delivers value.

---

## 9. Strengths of This Approach

- Forces objective reflection
- Builds estimation skill over time
- Makes quality visible early
- Reduces “hero narrative” bias
- Creates institutional memory

This is especially strong in:
- Regulated environments
- High-maturity teams
- Individuals serious about self-improvement

---

## 10. Limitations (Honest Assessment)

- UI and workflow feel dated
- High initial discipline cost
- Not optimized for fast context switching
- No real-time collaboration
- No native modern integrations

Yet:
> The *ideas* are stronger than the implementation.

---

## Next Section

**Part 4 — Advanced Topics & Internals**
- File structure and data storage
- Configuration model
- Privacy and ownership
- Architectural strengths and limits
- Whether it makes sense to modernize or rebuild today