import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type FinancialYear, type ProjectDefinition } from "../../api/client";

// ── Shared primitives ─────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
    background: "var(--surface-3)", border: "1px solid var(--border)",
    color: "var(--text)", borderRadius: 6, padding: "8px 11px",
    fontSize: 13, fontFamily: "inherit", width: "100%",
};
const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "var(--text-3)",
    textTransform: "uppercase", letterSpacing: "0.06em",
    display: "block", marginBottom: 5,
};
function F({ title, children }: { title: string; children: React.ReactNode }) {
    return <div><label style={lbl}>{title}</label>{children}</div>;
}

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS = ["Basics", "Financial Year", "Team", "Review"];

function StepBar({ current }: { current: number }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 32 }}>
            {STEPS.map((s, i) => {
                const done = i < current;
                const active = i === current;
                return (
                    <div key={s} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : undefined }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: "50%", display: "flex",
                                alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700,
                                background: done ? "var(--green)" : active ? "var(--accent)" : "var(--surface-3)",
                                color: done || active ? "#fff" : "var(--text-3)",
                                border: active ? "2px solid var(--accent)" : "2px solid transparent",
                                transition: "all 0.2s",
                            }}>
                                {done ? "✓" : i + 1}
                            </div>
                            <span style={{ fontSize: 11, color: active ? "var(--text)" : "var(--text-3)", whiteSpace: "nowrap" }}>{s}</span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div style={{ flex: 1, height: 2, background: done ? "var(--green)" : "var(--border)", margin: "0 6px", marginBottom: 16, transition: "background 0.2s" }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ── Step 1: Basics ────────────────────────────────────────────────────────────

interface BasicsData {
    name: string;
    myRole: string;
    allocation: number;
    startDate: string;
    endDate: string;
}

function Step1({ data, onChange }: { data: BasicsData; onChange: (d: BasicsData) => void }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>New Project</div>
            <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 8 }}>Start with the basics — what's the project and your role in it.</div>
            <F title="Project name *">
                <input style={inp} value={data.name} onChange={e => onChange({ ...data, name: e.target.value })} placeholder="e.g. Dash aka SPARK" autoFocus />
            </F>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <F title="Your role on this project *">
                    <select style={inp} value={data.myRole} onChange={e => onChange({ ...data, myRole: e.target.value })}>
                        <option value="LEAD">Lead / Tech Lead</option>
                        <option value="CONTRIBUTOR">Contributor</option>
                        <option value="OBSERVER">Observer</option>
                        <option value="MANAGER">Manager</option>
                    </select>
                </F>
                <F title="Your allocation (%)">
                    <input type="number" min={1} max={100} style={inp} value={data.allocation}
                        onChange={e => onChange({ ...data, allocation: Number(e.target.value) })} />
                </F>
                <F title="Project start date *">
                    <input type="date" style={inp} value={data.startDate} onChange={e => onChange({ ...data, startDate: e.target.value })} />
                </F>
                <F title="Project end date (optional)">
                    <input type="date" style={inp} value={data.endDate} onChange={e => onChange({ ...data, endDate: e.target.value })} />
                </F>
            </div>
        </div>
    );
}

// ── Step 2: Financial Year ────────────────────────────────────────────────────

interface FYData {
    fyId: string;       // ID of selected existing FY, or "new"
    label: string;
    fyStart: string;
    fyEnd: string;
    orgGoal: string;
    prevFeedback: string;
    isCurrent: boolean;
}

function Step2({ data, onChange, fys }: { data: FYData; onChange: (d: FYData) => void; fys: FinancialYear[] }) {
    const isNew = data.fyId === "new";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Financial Year</div>
            <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 8 }}>
                Link this project to your organisation's financial year and goals.
            </div>

            <F title="Financial year">
                <select style={inp} value={data.fyId} onChange={e => {
                    const v = e.target.value;
                    if (v === "new") {
                        onChange({ ...data, fyId: "new" });
                    } else {
                        const fy = fys.find(f => f.id === v);
                        if (fy) onChange({ ...data, fyId: fy.id, label: fy.label, fyStart: fy.startDate, fyEnd: fy.endDate, orgGoal: fy.orgGoal || "", prevFeedback: fy.prevYearFeedback || "" });
                    }
                }}>
                    <option value="">— Skip for now —</option>
                    {fys.map(f => <option key={f.id} value={f.id}>{f.label}{f.isCurrent ? " (current)" : ""}</option>)}
                    <option value="new">+ Create new financial year</option>
                </select>
            </F>

            {isNew && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, background: "var(--surface-3)", borderRadius: 8, padding: 16, border: "1px solid var(--border)" }}>
                    <div style={{ gridColumn: "1/-1" }}>
                        <F title="Label">
                            <input style={inp} value={data.label} onChange={e => onChange({ ...data, label: e.target.value })} placeholder="FY 2025-26" />
                        </F>
                    </div>
                    <F title="Start date">
                        <input type="date" style={inp} value={data.fyStart} onChange={e => onChange({ ...data, fyStart: e.target.value })} />
                    </F>
                    <F title="End date">
                        <input type="date" style={inp} value={data.fyEnd} onChange={e => onChange({ ...data, fyEnd: e.target.value })} />
                    </F>
                    <F title="Mark as current FY">
                        <div style={{ display: "flex", alignItems: "center", height: 36 }}>
                            <input type="checkbox" checked={data.isCurrent} onChange={e => onChange({ ...data, isCurrent: e.target.checked })}
                                style={{ width: 16, height: 16, accentColor: "var(--accent)", cursor: "pointer" }} />
                        </div>
                    </F>
                </div>
            )}

            {(isNew || data.fyId) && (
                <>
                    <F title="Organisation goal for this year">
                        <textarea style={{ ...inp, resize: "vertical", minHeight: 80 }} value={data.orgGoal}
                            onChange={e => onChange({ ...data, orgGoal: e.target.value })}
                            placeholder="e.g. Achieve product-market fit for the SPARK dashboard…" />
                    </F>
                    <F title="Previous year feedback / lessons learned (optional)">
                        <textarea style={{ ...inp, resize: "vertical", minHeight: 80 }} value={data.prevFeedback}
                            onChange={e => onChange({ ...data, prevFeedback: e.target.value })}
                            placeholder="e.g. Sprints were too long — move to 2-week cadence…" />
                    </F>
                </>
            )}
        </div>
    );
}

// ── Step 3: Team ──────────────────────────────────────────────────────────────

interface Member { name: string; email: string; role: string }
interface TeamData {
    leadName: string;
    leadEmail: string;
    members: Member[];
}

function Step3({ data, onChange }: { data: TeamData; onChange: (d: TeamData) => void }) {
    const [newName, setNewName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newRole, setNewRole] = useState("CONTRIBUTOR");

    const addMember = () => {
        if (!newName.trim()) return;
        onChange({ ...data, members: [...data.members, { name: newName.trim(), email: newEmail, role: newRole }] });
        setNewName(""); setNewEmail(""); setNewRole("CONTRIBUTOR");
    };

    const removeMember = (i: number) => onChange({ ...data, members: data.members.filter((_, idx) => idx !== i) });

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Team</div>
                <div style={{ fontSize: 13, color: "var(--text-2)" }}>Set the project lead (required) and add initial team members.</div>
            </div>

            {/* Lead */}
            <div style={{ background: "var(--surface-3)", borderRadius: 8, padding: 16, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", marginBottom: 12 }}>Project Lead / Manager *</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <F title="Name">
                        <input style={inp} value={data.leadName} onChange={e => onChange({ ...data, leadName: e.target.value })} placeholder="Full name" />
                    </F>
                    <F title="Email (optional)">
                        <input style={inp} value={data.leadEmail} onChange={e => onChange({ ...data, leadEmail: e.target.value })} placeholder="lead@company.com" />
                    </F>
                </div>
            </div>

            {/* Additional members */}
            <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 10 }}>Additional Team Members (optional)</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 130px auto", gap: 8, marginBottom: 8 }}>
                    <input style={inp} placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addMember()} />
                    <input style={inp} placeholder="Email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                    <select style={inp} value={newRole} onChange={e => setNewRole(e.target.value)}>
                        <option value="CONTRIBUTOR">Contributor</option>
                        <option value="LEAD">Lead</option>
                        <option value="OBSERVER">Observer</option>
                    </select>
                    <button onClick={addMember} disabled={!newName.trim()} style={{
                        padding: "0 14px", borderRadius: 6, background: "var(--accent)", color: "#fff",
                        border: "none", cursor: newName.trim() ? "pointer" : "not-allowed",
                        opacity: newName.trim() ? 1 : 0.4, fontFamily: "inherit", fontSize: 13,
                    }}>Add</button>
                </div>

                {data.members.length > 0 && (
                    <div style={{ border: "1px solid var(--border)", borderRadius: 7, overflow: "hidden" }}>
                        {data.members.map((m, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", padding: "9px 12px", borderBottom: i < data.members.length - 1 ? "1px solid var(--border)" : "none" }}>
                                <span style={{ flex: 1, fontSize: 13, color: "var(--text)" }}>{m.name}</span>
                                <span style={{ fontSize: 12, color: "var(--text-3)", marginRight: 12 }}>{m.email || "—"}</span>
                                <span style={{ fontSize: 11, color: "var(--accent)", marginRight: 12, fontWeight: 600 }}>{m.role}</span>
                                <button onClick={() => removeMember(i)} style={{ background: "transparent", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: 14 }}>✕</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Step 4: Review ────────────────────────────────────────────────────────────

function Step4({ basics, fy, team, fys }: { basics: BasicsData; fy: FYData; team: TeamData; fys: FinancialYear[] }) {
    const Row = ({ label, value }: { label: string; value: string }) => (
        <div style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
            <span style={{ width: 160, fontSize: 12, color: "var(--text-3)", flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: 13, color: "var(--text)" }}>{value || "—"}</span>
        </div>
    );

    const fyLabel = fy.fyId === "new" ? fy.label : fys.find(f => f.id === fy.fyId)?.label || "None";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Review</div>
                <div style={{ fontSize: 13, color: "var(--text-2)" }}>Everything look right? Hit Create to finish.</div>
            </div>

            <div style={{ background: "var(--surface-3)", borderRadius: 8, padding: 16, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Project</div>
                <Row label="Name" value={basics.name} />
                <Row label="Your role" value={basics.myRole} />
                <Row label="Allocation" value={`${basics.allocation}%`} />
                <Row label="Start date" value={basics.startDate} />
                <Row label="End date" value={basics.endDate || "Open"} />
            </div>

            <div style={{ background: "var(--surface-3)", borderRadius: 8, padding: 16, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Financial Year</div>
                <Row label="FY" value={fyLabel || "Not linked"} />
                {fy.orgGoal && <Row label="Org goal" value={fy.orgGoal.slice(0, 80) + (fy.orgGoal.length > 80 ? "…" : "")} />}
            </div>

            <div style={{ background: "var(--surface-3)", borderRadius: 8, padding: 16, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Team</div>
                <Row label="Lead" value={team.leadName || "Not set"} />
                <Row label="Members" value={team.members.length ? team.members.map(m => m.name).join(", ") : "None"} />
            </div>
        </div>
    );
}

// ── Wizard shell ──────────────────────────────────────────────────────────────

export function ProjectWizard({ onClose, onCreated }: { onClose: () => void; onCreated: (p: ProjectDefinition) => void }) {
    const [step, setStep] = useState(0);
    const [fys, setFys] = useState<FinancialYear[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const today = new Date().toISOString().slice(0, 10);

    const [basics, setBasics] = useState<BasicsData>({ name: "", myRole: "LEAD", allocation: 100, startDate: today, endDate: "" });
    const [fyData, setFyData] = useState<FYData>({ fyId: "", label: "", fyStart: "", fyEnd: "", orgGoal: "", prevFeedback: "", isCurrent: false });
    const [team, setTeam] = useState<TeamData>({ leadName: "", leadEmail: "", members: [] });

    useEffect(() => {
        api.financialYears.list().then(r => setFys(r.items)).catch(() => {});
    }, []);

    const canNext = () => {
        if (step === 0) return basics.name.trim() && basics.startDate;
        if (step === 2) return !!team.leadName.trim();
        return true;
    };

    const handleCreate = async () => {
        setSubmitting(true); setError("");
        try {
            // 1. Ensure FY exists if new
            let fyId: string | undefined;
            if (fyData.fyId === "new" && fyData.label && fyData.fyStart && fyData.fyEnd) {
                const newFy = await api.financialYears.create({
                    label: fyData.label, startDate: fyData.fyStart, endDate: fyData.fyEnd,
                    orgGoal: fyData.orgGoal || undefined, prevYearFeedback: fyData.prevFeedback || undefined,
                    isCurrent: fyData.isCurrent,
                });
                fyId = newFy.id;
            } else if (fyData.fyId && fyData.fyId !== "") {
                fyId = fyData.fyId;
                // Update org goal + feedback on existing FY if changed
                if (fyData.orgGoal || fyData.prevFeedback) {
                    await api.financialYears.update(fyId, { orgGoal: fyData.orgGoal || undefined, prevYearFeedback: fyData.prevFeedback || undefined }).catch(() => {});
                }
            }

            // 2. Create project
            const project = await api.projects.create({
                name: basics.name.trim(),
                allocationStartDate: basics.startDate,
                allocationEndDate: basics.endDate || undefined,
            });

            // 3. Add lead as team member
            if (team.leadName.trim()) {
                await api.projects.createMember(project.id, { name: team.leadName.trim(), email: team.leadEmail, role: "LEAD" });
            }

            // 4. Add additional members
            for (const m of team.members) {
                await api.projects.createMember(project.id, { name: m.name, email: m.email, role: m.role });
            }

            // 5. Add self as allocation
            if (basics.startDate) {
                await api.projects.createAllocation(project.id, {
                    teamMemberId: "", // will be skipped if empty — placeholder
                    startDate: basics.startDate,
                    endDate: basics.endDate || undefined,
                    allocationPercentage: basics.allocation,
                }).catch(() => {});
            }

            onCreated(project);
        } catch (e: any) {
            setError(e.message || "Failed to create project");
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 60,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.65)",
        }}>
            <div style={{
                width: 600, maxHeight: "90vh", background: "var(--surface)",
                border: "1px solid var(--border-2)", borderRadius: 12,
                display: "flex", flexDirection: "column", overflow: "hidden",
                boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
            }}>
                {/* Header */}
                <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>Add Project</span>
                    <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>✕</button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 8px" }}>
                    <StepBar current={step} />
                    {step === 0 && <Step1 data={basics} onChange={setBasics} />}
                    {step === 1 && <Step2 data={fyData} onChange={setFyData} fys={fys} />}
                    {step === 2 && <Step3 data={team} onChange={setTeam} />}
                    {step === 3 && <Step4 basics={basics} fy={fyData} team={team} fys={fys} />}
                </div>

                {/* Footer */}
                <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                    <div>
                        {error && <span style={{ fontSize: 12, color: "var(--red)" }}>{error}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        {step > 0 && (
                            <button onClick={() => setStep(s => s - 1)} style={{ padding: "8px 16px", borderRadius: 6, background: "var(--surface-3)", border: "1px solid var(--border)", color: "var(--text-2)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                                Back
                            </button>
                        )}
                        {step < 3 ? (
                            <button
                                onClick={() => setStep(s => s + 1)}
                                disabled={!canNext()}
                                style={{ padding: "8px 20px", borderRadius: 6, background: canNext() ? "var(--accent)" : "var(--surface-3)", border: "none", color: canNext() ? "#fff" : "var(--text-3)", cursor: canNext() ? "pointer" : "not-allowed", fontSize: 13, fontFamily: "inherit", fontWeight: 600 }}
                            >
                                {step === 1 ? "Next →" : step === 2 && !team.leadName.trim() ? "Skip →" : "Next →"}
                            </button>
                        ) : (
                            <button
                                onClick={handleCreate}
                                disabled={submitting}
                                style={{ padding: "8px 24px", borderRadius: 6, background: "var(--accent)", border: "none", color: "#fff", cursor: submitting ? "not-allowed" : "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 600, opacity: submitting ? 0.7 : 1 }}
                            >
                                {submitting ? "Creating…" : "✦ Create Project"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
