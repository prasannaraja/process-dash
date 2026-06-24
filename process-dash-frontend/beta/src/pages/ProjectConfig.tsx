import { useEffect, useMemo, useState } from "react";
import {
    api,
    type ProjectContact,
    type ProjectDefinition,
    type ProjectMember,
    type TeamAllocation,
} from "../api/client";
import { Badge, Button, Input, Loading } from "../components/ui";
import { ProjectWizard } from "../components/ProjectWizard";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "overview" | "team" | "contacts" | "allocation" | "github";

const TABS: { id: Tab; label: string }[] = [
    { id: "overview",   label: "Overview"   },
    { id: "team",       label: "Team"       },
    { id: "contacts",   label: "Contacts"   },
    { id: "allocation", label: "Allocation" },
    { id: "github",     label: "GitHub"     },
];

// ── Shared input style ────────────────────────────────────────────────────────

const input: React.CSSProperties = {
    background: "var(--surface-3)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: 6,
    padding: "7px 10px",
    fontSize: 13,
    fontFamily: "inherit",
    width: "100%",
};

const label: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 500,
    color: "var(--text-3)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    display: "block",
    marginBottom: 5,
};

function Field({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <div style={label}>{title}</div>
            {children}
        </div>
    );
}

function SavedBadge({ show }: { show: boolean }) {
    if (!show) return null;
    return <span style={{ fontSize: 12, color: "var(--green)" }}>✓ Saved</span>;
}

// ── Tab: Overview ─────────────────────────────────────────────────────────────

function OverviewTab({
    projectId,
    project,
    onSaved,
}: {
    projectId: string;
    project: ProjectDefinition;
    onSaved: () => void;
}) {
    const [name, setName]             = useState(project.name || "");
    const [desc, setDesc]             = useState(project.description || "");
    const [startDate, setStartDate]   = useState(project.allocationStartDate || "");
    const [endDate, setEndDate]       = useState(project.allocationEndDate || "");
    const [duration, setDuration]     = useState(14);
    const [saved, setSaved]           = useState(false);
    const [saving, setSaving]         = useState(false);
    const [error, setError]           = useState("");

    useEffect(() => {
        setName(project.name || "");
        setDesc(project.description || "");
        setStartDate(project.allocationStartDate || "");
        setEndDate(project.allocationEndDate || "");
        api.projects.getConfig(projectId).then(c => setDuration(c.defaultSprintDurationDays || 14)).catch(() => {});
    }, [projectId, project]);

    const save = async () => {
        setSaving(true); setError("");
        try {
            await Promise.all([
                api.projects.update(projectId, { name, description: desc, allocationStartDate: startDate || undefined, allocationEndDate: endDate || undefined }),
                api.projects.updateConfig(projectId, { defaultSprintDurationDays: duration }),
            ]);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
            onSaved();
        } catch (e: any) {
            setError(e.message || "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field title="Project name">
                    <input style={input} value={name} onChange={e => setName(e.target.value)} />
                </Field>
                <Field title="Description">
                    <input style={input} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Short description" />
                </Field>
                <Field title="Allocation start">
                    <input type="date" style={input} value={startDate} onChange={e => setStartDate(e.target.value)} />
                </Field>
                <Field title="Allocation end">
                    <input type="date" style={input} value={endDate} onChange={e => setEndDate(e.target.value)} />
                </Field>
                <Field title="Default sprint duration (days)">
                    <select style={input} value={duration} onChange={e => setDuration(Number(e.target.value))}>
                        <option value={7}>7 days (1 week)</option>
                        <option value={14}>14 days (2 weeks)</option>
                        <option value={21}>21 days (3 weeks)</option>
                    </select>
                </Field>
            </div>
            {error && <div style={{ fontSize: 12, color: "var(--red)" }}>{error}</div>}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Button variant="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                <SavedBadge show={saved} />
            </div>
        </div>
    );
}

// ── Tab: Team ─────────────────────────────────────────────────────────────────

function TeamTab({ projectId, members, onRefresh }: { projectId: string; members: ProjectMember[]; onRefresh: () => void }) {
    const [name, setName]   = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole]   = useState("CONTRIBUTOR");
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState("");

    const add = async () => {
        if (!name.trim()) return;
        setAdding(true); setError("");
        try {
            await api.projects.createMember(projectId, { name, email, role });
            setName(""); setEmail(""); setRole("CONTRIBUTOR");
            onRefresh();
        } catch (e: any) {
            setError(e.message || "Failed to add member");
        } finally {
            setAdding(false);
        }
    };

    const roleBadge = (r: string) => {
        if (r === "LEAD") return <Badge variant="accent">{r}</Badge>;
        if (r === "OBSERVER") return <Badge variant="default">{r}</Badge>;
        return <Badge variant="default">{r}</Badge>;
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Add form */}
            <div style={{ background: "var(--surface-3)", borderRadius: 8, padding: 16, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 12 }}>Add Member</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 140px", gap: 10, marginBottom: 10 }}>
                    <Field title="Name">
                        <input style={input} value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
                    </Field>
                    <Field title="Email">
                        <input style={input} value={email} onChange={e => setEmail(e.target.value)} placeholder="email@company.com" />
                    </Field>
                    <Field title="Role">
                        <select style={input} value={role} onChange={e => setRole(e.target.value)}>
                            <option value="CONTRIBUTOR">Contributor</option>
                            <option value="LEAD">Lead</option>
                            <option value="OBSERVER">Observer</option>
                        </select>
                    </Field>
                </div>
                {error && <div style={{ fontSize: 12, color: "var(--red)", marginBottom: 8 }}>{error}</div>}
                <Button variant="secondary" onClick={add} disabled={adding || !name.trim()}>
                    {adding ? "Adding…" : "Add Member"}
                </Button>
            </div>

            {/* Members list */}
            {members.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-3)", fontSize: 13 }}>
                    No team members yet
                </div>
            ) : (
                <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: "var(--surface-3)", borderBottom: "1px solid var(--border)" }}>
                                {["Name", "Email", "Role"].map(h => (
                                    <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-3)" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {members.map(m => (
                                <tr key={m.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                    <td style={{ padding: "10px 14px", color: "var(--text)", fontWeight: 500 }}>{m.name}</td>
                                    <td style={{ padding: "10px 14px", color: "var(--text-2)" }}>{m.email || "—"}</td>
                                    <td style={{ padding: "10px 14px" }}>{roleBadge(m.role)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ── Tab: Contacts ─────────────────────────────────────────────────────────────

function ContactsTab({ projectId, contacts, onRefresh }: { projectId: string; contacts: ProjectContact[]; onRefresh: () => void }) {
    const [name, setName]       = useState("");
    const [email, setEmail]     = useState("");
    const [role, setRole]       = useState("STAKEHOLDER");
    const [primary, setPrimary] = useState(false);
    const [adding, setAdding]   = useState(false);
    const [error, setError]     = useState("");

    const add = async () => {
        if (!name.trim()) return;
        setAdding(true); setError("");
        try {
            await api.projects.createContact(projectId, { name, email, contactRole: role, isPrimary: primary });
            setName(""); setEmail(""); setRole("STAKEHOLDER"); setPrimary(false);
            onRefresh();
        } catch (e: any) {
            setError(e.message || "Failed to add contact");
        } finally {
            setAdding(false);
        }
    };

    const roleColor = (r: string) => {
        if (r === "MANAGER") return "yellow";
        if (r === "TECH_LEAD") return "accent";
        return "default";
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Add form */}
            <div style={{ background: "var(--surface-3)", borderRadius: 8, padding: 16, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 12 }}>Add Contact</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 160px", gap: 10, marginBottom: 10 }}>
                    <Field title="Name">
                        <input style={input} value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
                    </Field>
                    <Field title="Email">
                        <input style={input} value={email} onChange={e => setEmail(e.target.value)} placeholder="email@company.com" />
                    </Field>
                    <Field title="Role">
                        <select style={input} value={role} onChange={e => setRole(e.target.value)}>
                            <option value="STAKEHOLDER">Stakeholder</option>
                            <option value="MANAGER">Manager</option>
                            <option value="TECH_LEAD">Tech Lead</option>
                        </select>
                    </Field>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-2)", cursor: "pointer", marginBottom: 10 }}>
                    <input type="checkbox" checked={primary} onChange={e => setPrimary(e.target.checked)} style={{ width: 14, height: 14, accentColor: "var(--accent)" }} />
                    Primary contact (main feedback reference)
                </label>
                {error && <div style={{ fontSize: 12, color: "var(--red)", marginBottom: 8 }}>{error}</div>}
                <Button variant="secondary" onClick={add} disabled={adding || !name.trim()}>
                    {adding ? "Adding…" : "Add Contact"}
                </Button>
            </div>

            {/* Contacts list */}
            {contacts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-3)", fontSize: 13 }}>
                    No contacts yet
                </div>
            ) : (
                <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: "var(--surface-3)", borderBottom: "1px solid var(--border)" }}>
                                {["Name", "Email", "Role", ""].map((h, i) => (
                                    <th key={i} style={{ padding: "9px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-3)" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {contacts.map(c => (
                                <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                    <td style={{ padding: "10px 14px", color: "var(--text)", fontWeight: 500 }}>{c.name}</td>
                                    <td style={{ padding: "10px 14px", color: "var(--text-2)" }}>{c.email || "—"}</td>
                                    <td style={{ padding: "10px 14px" }}><Badge variant={roleColor(c.contactRole) as any}>{c.contactRole}</Badge></td>
                                    <td style={{ padding: "10px 14px" }}>{c.isPrimary && <Badge variant="green">Primary</Badge>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ── Tab: Allocation ───────────────────────────────────────────────────────────

function AllocationTab({ projectId, members, allocations, onRefresh }: { projectId: string; members: ProjectMember[]; allocations: TeamAllocation[]; onRefresh: () => void }) {
    const [memberId, setMemberId] = useState(members[0]?.id || "");
    const [startDate, setStart]   = useState("");
    const [endDate, setEnd]       = useState("");
    const [pct, setPct]           = useState(100);
    const [adding, setAdding]     = useState(false);
    const [error, setError]       = useState("");

    const add = async () => {
        if (!memberId || !startDate) return;
        setAdding(true); setError("");
        try {
            await api.projects.createAllocation(projectId, { teamMemberId: memberId, startDate, endDate: endDate || undefined, allocationPercentage: pct });
            setStart(""); setEnd(""); setPct(100);
            onRefresh();
        } catch (e: any) {
            setError(e.message || "Failed to add allocation");
        } finally {
            setAdding(false);
        }
    };

    const pctColor = (p: number) => p >= 80 ? "red" : p >= 50 ? "yellow" : "green";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "var(--surface-3)", borderRadius: 8, padding: 16, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 12 }}>Add Allocation Window</div>
                {members.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--text-3)" }}>Add team members first before setting allocations.</div>
                ) : (
                    <>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 80px", gap: 10, marginBottom: 10 }}>
                            <Field title="Member">
                                <select style={input} value={memberId} onChange={e => setMemberId(e.target.value)}>
                                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </Field>
                            <Field title="Start date">
                                <input type="date" style={input} value={startDate} onChange={e => setStart(e.target.value)} />
                            </Field>
                            <Field title="End date (optional)">
                                <input type="date" style={input} value={endDate} onChange={e => setEnd(e.target.value)} />
                            </Field>
                            <Field title="% alloc">
                                <input type="number" min={1} max={100} style={input} value={pct} onChange={e => setPct(Number(e.target.value))} />
                            </Field>
                        </div>
                        {error && <div style={{ fontSize: 12, color: "var(--red)", marginBottom: 8 }}>{error}</div>}
                        <Button variant="secondary" onClick={add} disabled={adding || !startDate}>
                            {adding ? "Adding…" : "Add Allocation"}
                        </Button>
                    </>
                )}
            </div>

            {allocations.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-3)", fontSize: 13 }}>No allocations yet</div>
            ) : (
                <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: "var(--surface-3)", borderBottom: "1px solid var(--border)" }}>
                                {["Member", "From", "To", "Allocation"].map(h => (
                                    <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-3)" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {allocations.map(a => {
                                const m = members.find(x => x.id === a.teamMemberId);
                                return (
                                    <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                        <td style={{ padding: "10px 14px", color: "var(--text)", fontWeight: 500 }}>{m?.name || "—"}</td>
                                        <td style={{ padding: "10px 14px", color: "var(--text-2)" }}>{a.startDate}</td>
                                        <td style={{ padding: "10px 14px", color: "var(--text-2)" }}>{a.endDate || "Open"}</td>
                                        <td style={{ padding: "10px 14px" }}><Badge variant={pctColor(a.allocationPercentage) as any}>{a.allocationPercentage}%</Badge></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ── Tab: GitHub ───────────────────────────────────────────────────────────────

function GithubTab({ projectId, onSaved }: { projectId: string; onSaved: () => void }) {
    const [repo, setRepo]         = useState("");
    const [token, setToken]       = useState("");
    const [username, setUsername] = useState("");
    const [saved, setSaved]       = useState(false);
    const [saving, setSaving]     = useState(false);
    const [error, setError]       = useState("");

    useEffect(() => {
        api.projects.getConfig(projectId).then(c => {
            setRepo(c.githubRepo || "");
            setToken(c.githubToken || "");
            setUsername(c.githubUsername || "");
        }).catch(() => {});
    }, [projectId]);

    const save = async () => {
        setSaving(true); setError("");
        try {
            await api.projects.updateConfig(projectId, { githubRepo: repo, githubToken: token, githubUsername: username });
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
            onSaved();
        } catch (e: any) {
            setError(e.message || "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>
                Link a GitHub repository to automatically pull commit and PR activity into your sprint timeline.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field title="Repository (owner/repo)">
                    <input style={input} value={repo} onChange={e => setRepo(e.target.value)} placeholder="org/repository" />
                </Field>
                <Field title="GitHub username">
                    <input style={input} value={username} onChange={e => setUsername(e.target.value)} placeholder="your-handle" />
                </Field>
                <div style={{ gridColumn: "1 / -1" }}>
                    <Field title="Personal access token">
                        <input type="password" style={input} value={token} onChange={e => setToken(e.target.value)} placeholder="ghp_…" />
                    </Field>
                </div>
            </div>
            {error && <div style={{ fontSize: 12, color: "var(--red)" }}>{error}</div>}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Button variant="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                <SavedBadge show={saved} />
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProjectConfig() {
    const [projects, setProjects]   = useState<ProjectDefinition[]>([]);
    const [projectId, setProjectId] = useState("");
    const [tab, setTab]             = useState<Tab>("overview");
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState("");

    // per-project detail
    const [members, setMembers]         = useState<ProjectMember[]>([]);
    const [contacts, setContacts]       = useState<ProjectContact[]>([]);
    const [allocations, setAllocations] = useState<TeamAllocation[]>([]);

    // create project
    const [showWizard, setShowWizard]   = useState(false);
    const [showCreate, setShowCreate]   = useState(false);
    const [newName, setNewName]         = useState("");
    const [newDesc, setNewDesc]         = useState("");
    const [creating, setCreating]       = useState(false);

    const selectedProject = useMemo(() => projects.find(p => p.id === projectId) || null, [projects, projectId]);

    const loadScoped = async (id: string) => {
        const [membersRes, contactsRes, allocRes] = await Promise.all([
            api.projects.listMembers(id),
            api.projects.listContacts(id),
            api.projects.listAllocations(id),
        ]);
        setMembers(membersRes.items || []);
        setContacts(contactsRes.items || []);
        setAllocations(allocRes.items || []);
    };

    const load = async (selectId?: string) => {
        setLoading(true); setError("");
        try {
            const res = await api.projects.list();
            const items = res.items || [];
            setProjects(items);
            const target = selectId || projectId || items[0]?.id || "";
            setProjectId(target);
            if (target) await loadScoped(target);
        } catch (e: any) {
            setError(e.message || "Failed to load projects");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const switchProject = async (id: string) => {
        setProjectId(id);
        try { await loadScoped(id); } catch {}
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            const created = await api.projects.create({ name: newName.trim(), description: newDesc });
            setNewName(""); setNewDesc(""); setShowCreate(false);
            await load(created.id);
        } catch (e: any) {
            setError(e.message || "Failed to create project");
        } finally {
            setCreating(false);
        }
    };

    if (loading) return <Loading text="Loading projects…" />;

    return (
        <>
        <div style={{ display: "flex", height: "calc(100vh - 0px)", overflow: "hidden" }}>

            {/* ── Left panel: project list ── */}
            <div
                style={{
                    width: 220,
                    flexShrink: 0,
                    borderRight: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    background: "var(--surface)",
                    overflow: "hidden",
                }}
            >
                {/* header */}
                <div style={{ padding: "16px 14px 10px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Projects</span>
                    <button
                        onClick={() => setShowWizard(true)}
                        title="Add project"
                        style={{
                            width: 24, height: 24, borderRadius: 4, border: "1px solid var(--border)",
                            background: "transparent", color: "var(--text-3)",
                            cursor: "pointer", fontSize: 16, lineHeight: 1,
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                    >+</button>
                </div>

                {/* create form */}
                {showCreate && (
                    <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                        <input
                            style={{ ...input, marginBottom: 6 }}
                            placeholder="Project name"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleCreate()}
                            autoFocus
                        />
                        <input
                            style={{ ...input, marginBottom: 8 }}
                            placeholder="Description (optional)"
                            value={newDesc}
                            onChange={e => setNewDesc(e.target.value)}
                        />
                        <div style={{ display: "flex", gap: 6 }}>
                            <button
                                onClick={handleCreate}
                                disabled={creating || !newName.trim()}
                                style={{
                                    flex: 1, padding: "5px 0", borderRadius: 5, fontSize: 12,
                                    background: "var(--accent)", color: "#fff", border: "none",
                                    cursor: creating || !newName.trim() ? "not-allowed" : "pointer",
                                    opacity: creating || !newName.trim() ? 0.5 : 1, fontFamily: "inherit",
                                }}
                            >{creating ? "…" : "Create"}</button>
                            <button
                                onClick={() => { setShowCreate(false); setNewName(""); setNewDesc(""); }}
                                style={{ padding: "5px 8px", borderRadius: 5, fontSize: 12, background: "var(--surface-3)", color: "var(--text-2)", border: "1px solid var(--border)", cursor: "pointer", fontFamily: "inherit" }}
                            >✕</button>
                        </div>
                    </div>
                )}

                {/* project list */}
                <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
                    {projects.length === 0 && (
                        <div style={{ padding: "20px 14px", fontSize: 12, color: "var(--text-3)", textAlign: "center" }}>No projects yet</div>
                    )}
                    {projects.map(p => {
                        const active = p.id === projectId;
                        return (
                            <button
                                key={p.id}
                                onClick={() => switchProject(p.id)}
                                style={{
                                    width: "100%", textAlign: "left", padding: "8px 14px",
                                    background: active ? "var(--accent-bg)" : "transparent",
                                    border: "none", borderLeft: `2px solid ${active ? "var(--accent)" : "transparent"}`,
                                    cursor: "pointer", fontFamily: "inherit",
                                }}
                            >
                                <div style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "var(--text)" : "var(--text-2)", lineHeight: 1.3 }}>{p.name}</div>
                                {p.description && (
                                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.description}</div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Right panel: tabs + content ── */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {!selectedProject ? (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", fontSize: 13 }}>
                        Select a project or create one
                    </div>
                ) : (
                    <>
                        {/* project title + tab bar */}
                        <div style={{ borderBottom: "1px solid var(--border)", padding: "0 28px", flexShrink: 0 }}>
                            <div style={{ paddingTop: 20, paddingBottom: 4 }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{selectedProject.name}</div>
                                {selectedProject.description && (
                                    <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{selectedProject.description}</div>
                                )}
                            </div>
                            <div style={{ display: "flex", gap: 0, marginTop: 8 }}>
                                {TABS.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTab(t.id)}
                                        style={{
                                            padding: "8px 14px",
                                            fontSize: 13,
                                            fontWeight: tab === t.id ? 600 : 400,
                                            color: tab === t.id ? "var(--text)" : "var(--text-3)",
                                            background: "transparent",
                                            border: "none",
                                            borderBottom: tab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
                                            cursor: "pointer",
                                            fontFamily: "inherit",
                                            transition: "color 0.1s",
                                            marginBottom: -1,
                                        }}
                                    >{t.label}</button>
                                ))}
                            </div>
                        </div>

                        {/* tab content */}
                        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
                            {error && (
                                <div style={{ background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)", color: "var(--red)", padding: "10px 14px", borderRadius: 7, fontSize: 13, marginBottom: 16 }}>
                                    {error}
                                </div>
                            )}

                            {tab === "overview" && (
                                <OverviewTab projectId={projectId} project={selectedProject} onSaved={() => load(projectId)} />
                            )}
                            {tab === "team" && (
                                <TeamTab projectId={projectId} members={members} onRefresh={() => loadScoped(projectId)} />
                            )}
                            {tab === "contacts" && (
                                <ContactsTab projectId={projectId} contacts={contacts} onRefresh={() => loadScoped(projectId)} />
                            )}
                            {tab === "allocation" && (
                                <AllocationTab projectId={projectId} members={members} allocations={allocations} onRefresh={() => loadScoped(projectId)} />
                            )}
                            {tab === "github" && (
                                <GithubTab projectId={projectId} onSaved={() => {}} />
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>

        {showWizard && (
            <ProjectWizard
                onClose={() => setShowWizard(false)}
                onCreated={(p) => { setShowWizard(false); load(p.id); }}
            />
        )}
    </>
    );
}
