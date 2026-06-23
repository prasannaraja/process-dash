import { useEffect, useMemo, useState } from "react";
import { api, type ProjectContact, type ProjectDefinition, type ProjectMember, type TeamAllocation } from "../api/client";
import {
    Button,
    Card,
    Divider,
    Input,
    Loading,
    PageHeader,
    Section,
    Select,
    Textarea,
} from "../components/ui";

export default function ProjectConfig() {
    const [projects, setProjects] = useState<ProjectDefinition[]>([]);
    const [projectId, setProjectId] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [projectName, setProjectName] = useState("");
    const [projectDescription, setProjectDescription] = useState("");
    const [allocationStartDate, setAllocationStartDate] = useState("");
    const [allocationEndDate, setAllocationEndDate] = useState("");
    const [defaultSprintDurationDays, setDefaultSprintDurationDays] = useState(14);
    const [githubRepo, setGithubRepo] = useState("");
    const [githubToken, setGithubToken] = useState("");
    const [githubUsername, setGithubUsername] = useState("");

    const [members, setMembers] = useState<ProjectMember[]>([]);
    const [contacts, setContacts] = useState<ProjectContact[]>([]);
    const [allocations, setAllocations] = useState<TeamAllocation[]>([]);

    const [newProjectName, setNewProjectName] = useState("");
    const [newProjectDescription, setNewProjectDescription] = useState("");

    const [newMemberName, setNewMemberName] = useState("");
    const [newMemberEmail, setNewMemberEmail] = useState("");
    const [newMemberRole, setNewMemberRole] = useState("CONTRIBUTOR");

    const [newContactName, setNewContactName] = useState("");
    const [newContactEmail, setNewContactEmail] = useState("");
    const [newContactRole, setNewContactRole] = useState("STAKEHOLDER");
    const [newContactPrimary, setNewContactPrimary] = useState(false);

    const [allocMemberId, setAllocMemberId] = useState("");
    const [allocStartDate, setAllocStartDate] = useState("");
    const [allocEndDate, setAllocEndDate] = useState("");
    const [allocPct, setAllocPct] = useState(100);

    const selectedProject = useMemo(() => projects.find((p) => p.id === projectId) || null, [projects, projectId]);

    const loadProjectScoped = async (id: string) => {
        const [project, config, membersRes, contactsRes, allocationsRes] = await Promise.all([
            api.projects.get(id),
            api.projects.getConfig(id),
            api.projects.listMembers(id),
            api.projects.listContacts(id),
            api.projects.listAllocations(id),
        ]);

        setProjectName(project.name || "");
        setProjectDescription(project.description || "");
        setAllocationStartDate(project.allocationStartDate || "");
        setAllocationEndDate(project.allocationEndDate || "");
        setDefaultSprintDurationDays(config.defaultSprintDurationDays || 14);
        setGithubRepo(config.githubRepo || "");
        setGithubToken(config.githubToken || "");
        setGithubUsername(config.githubUsername || "");
        setMembers(membersRes.items || []);
        setContacts(contactsRes.items || []);
        setAllocations(allocationsRes.items || []);

        if (!allocMemberId && (membersRes.items || []).length > 0) {
            setAllocMemberId(membersRes.items[0].id);
        }
    };

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await api.projects.list();
            const items = res.items || [];
            setProjects(items);
            const selected = projectId || items[0]?.id || "";
            setProjectId(selected);
            if (selected) {
                await loadProjectScoped(selected);
            }
        } catch (e: any) {
            setError(e.message || "Failed to load project configuration");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const onProjectChange = async (id: string) => {
        setProjectId(id);
        if (!id) return;
        setLoading(true);
        try {
            await loadProjectScoped(id);
        } catch (e: any) {
            setError(e.message || "Failed to load project details");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async () => {
        try {
            const created = await api.projects.create({
                name: newProjectName,
                description: newProjectDescription,
            });
            setNewProjectName("");
            setNewProjectDescription("");
            await load();
            setProjectId(created.id);
            await onProjectChange(created.id);
        } catch (e: any) {
            setError(e.message || "Failed to create project");
        }
    };

    const handleSaveProject = async () => {
        if (!projectId) return;
        try {
            await api.projects.update(projectId, {
                name: projectName,
                description: projectDescription,
                allocationStartDate,
                allocationEndDate,
            });
            await api.projects.updateConfig(projectId, {
                defaultSprintDurationDays,
                githubRepo,
                githubToken,
                githubUsername,
            });
            await load();
        } catch (e: any) {
            setError(e.message || "Failed to save project details");
        }
    };

    const handleAddMember = async () => {
        if (!projectId) return;
        try {
            await api.projects.createMember(projectId, {
                name: newMemberName,
                email: newMemberEmail,
                role: newMemberRole,
            });
            setNewMemberName("");
            setNewMemberEmail("");
            setNewMemberRole("CONTRIBUTOR");
            await onProjectChange(projectId);
        } catch (e: any) {
            setError(e.message || "Failed to add team member");
        }
    };

    const handleAddContact = async () => {
        if (!projectId) return;
        try {
            await api.projects.createContact(projectId, {
                name: newContactName,
                email: newContactEmail,
                contactRole: newContactRole,
                isPrimary: newContactPrimary,
            });
            setNewContactName("");
            setNewContactEmail("");
            setNewContactRole("STAKEHOLDER");
            setNewContactPrimary(false);
            await onProjectChange(projectId);
        } catch (e: any) {
            setError(e.message || "Failed to add contact");
        }
    };

    const handleAddAllocation = async () => {
        if (!projectId || !allocMemberId) return;
        try {
            await api.projects.createAllocation(projectId, {
                teamMemberId: allocMemberId,
                startDate: allocStartDate,
                endDate: allocEndDate || undefined,
                allocationPercentage: allocPct,
            });
            setAllocStartDate("");
            setAllocEndDate("");
            setAllocPct(100);
            await onProjectChange(projectId);
        } catch (e: any) {
            setError(e.message || "Failed to add allocation");
        }
    };

    if (loading) return <Loading text="Loading project configuration…" />;

    // Shared inline input style
    const inputStyle: React.CSSProperties = {
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        color: "var(--text)",
        borderRadius: 6,
        padding: "7px 10px",
        fontSize: 13,
        fontFamily: "inherit",
        width: "100%",
    };

    const labelStyle: React.CSSProperties = {
        fontSize: 12,
        fontWeight: 500,
        color: "var(--text-2)",
        display: "block",
        marginBottom: 4,
    };

    return (
        <div style={{ padding: "28px 32px", maxWidth: 960, margin: "0 auto", paddingBottom: 80 }}>
            <PageHeader
                title="Project Configuration"
                sub="Project details, point of contacts, team members, and allocation windows."
            />

            {error && (
                <div
                    style={{
                        background: "var(--red-bg)",
                        border: "1px solid rgba(248,113,113,0.2)",
                        color: "var(--red)",
                        padding: "12px 16px",
                        borderRadius: 8,
                        fontSize: 13,
                        marginBottom: 20,
                    }}
                >
                    {error}
                </div>
            )}

            {/* Create Project */}
            <Section title="Create Project">
                <Card style={{ padding: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10 }}>
                        <input
                            placeholder="Project name"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            style={inputStyle}
                        />
                        <input
                            placeholder="Description"
                            value={newProjectDescription}
                            onChange={(e) => setNewProjectDescription(e.target.value)}
                            style={inputStyle}
                        />
                        <Button variant="primary" onClick={handleCreateProject}>
                            Create
                        </Button>
                    </div>
                </Card>
            </Section>

            {/* Selected Project */}
            <Section title="Selected Project">
                <Card style={{ padding: 20 }}>
                    <div style={{ marginBottom: 16 }}>
                        <label style={labelStyle}>Active Project</label>
                        <select
                            style={{ ...inputStyle }}
                            value={projectId}
                            onChange={(e) => onProjectChange(e.target.value)}
                        >
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {selectedProject && (
                        <>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: 12,
                                    marginBottom: 16,
                                }}
                            >
                                <div>
                                    <label style={labelStyle}>Project Name</label>
                                    <input
                                        style={inputStyle}
                                        value={projectName}
                                        onChange={(e) => setProjectName(e.target.value)}
                                        placeholder="Project name"
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Description</label>
                                    <input
                                        style={inputStyle}
                                        value={projectDescription}
                                        onChange={(e) => setProjectDescription(e.target.value)}
                                        placeholder="Description"
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Allocation Start</label>
                                    <input
                                        type="date"
                                        style={inputStyle}
                                        value={allocationStartDate}
                                        onChange={(e) => setAllocationStartDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Allocation End</label>
                                    <input
                                        type="date"
                                        style={inputStyle}
                                        value={allocationEndDate}
                                        onChange={(e) => setAllocationEndDate(e.target.value)}
                                    />
                                </div>
                                <div style={{ gridColumn: "1 / -1" }}>
                                    <label style={labelStyle}>Default Sprint Duration (Days)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={60}
                                        style={inputStyle}
                                        value={defaultSprintDurationDays}
                                        onChange={(e) =>
                                            setDefaultSprintDurationDays(Number(e.target.value))
                                        }
                                    />
                                </div>
                            </div>

                            <Divider />

                            {/* GitHub Integration */}
                            <div style={{ marginBottom: 16 }}>
                                <div
                                    style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: "var(--text-2)",
                                        marginBottom: 4,
                                    }}
                                >
                                    GitHub Integration
                                </div>
                                <div
                                    style={{
                                        fontSize: 12,
                                        color: "var(--text-3)",
                                        marginBottom: 12,
                                        lineHeight: 1.5,
                                    }}
                                >
                                    Configure a GitHub repository to automatically link commits, pull requests, and review contributions inside your daily/sprint activity timelines.
                                </div>
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr 1fr",
                                        gap: 12,
                                    }}
                                >
                                    <div>
                                        <label style={labelStyle}>Repository Name (owner/repo)</label>
                                        <input
                                            className="mono"
                                            style={inputStyle}
                                            value={githubRepo}
                                            onChange={(e) => setGithubRepo(e.target.value)}
                                            placeholder="e.g. facebook/react"
                                        />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>GitHub Username</label>
                                        <input
                                            className="mono"
                                            style={inputStyle}
                                            value={githubUsername}
                                            onChange={(e) => setGithubUsername(e.target.value)}
                                            placeholder="e.g. gaearon"
                                        />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Personal Access Token (PAT)</label>
                                        <input
                                            type="password"
                                            className="mono"
                                            style={inputStyle}
                                            value={githubToken}
                                            onChange={(e) => setGithubToken(e.target.value)}
                                            placeholder="ghp_..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                <Button variant="primary" onClick={handleSaveProject}>
                                    Save Details & Integration
                                </Button>
                            </div>
                        </>
                    )}
                </Card>
            </Section>

            {/* Team Members & Contacts */}
            <Section>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {/* Team Members */}
                    <Card style={{ padding: 16 }}>
                        <div
                            style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "var(--text)",
                                marginBottom: 12,
                            }}
                        >
                            Team Members
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                            <input
                                placeholder="Name"
                                value={newMemberName}
                                onChange={(e) => setNewMemberName(e.target.value)}
                                style={inputStyle}
                            />
                            <input
                                placeholder="Email"
                                value={newMemberEmail}
                                onChange={(e) => setNewMemberEmail(e.target.value)}
                                style={inputStyle}
                            />
                            <select
                                style={inputStyle}
                                value={newMemberRole}
                                onChange={(e) => setNewMemberRole(e.target.value)}
                            >
                                <option value="CONTRIBUTOR">CONTRIBUTOR</option>
                                <option value="LEAD">LEAD</option>
                                <option value="OBSERVER">OBSERVER</option>
                            </select>
                            <Button variant="secondary" onClick={handleAddMember} style={{ width: "100%", justifyContent: "center" }}>
                                Add Member
                            </Button>
                        </div>
                        <div
                            style={{
                                borderTop: "1px solid var(--border)",
                                paddingTop: 10,
                                display: "flex",
                                flexDirection: "column",
                                gap: 0,
                            }}
                        >
                            {members.map((m) => (
                                <div
                                    key={m.id}
                                    style={{
                                        fontSize: 12,
                                        color: "var(--text-2)",
                                        padding: "8px 0",
                                        borderBottom: "1px solid var(--border)",
                                    }}
                                >
                                    {m.name}{" "}
                                    <span style={{ color: "var(--text-3)" }}>
                                        ({m.role}){m.email ? ` — ${m.email}` : ""}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Point of Contacts */}
                    <Card style={{ padding: 16 }}>
                        <div
                            style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "var(--text)",
                                marginBottom: 12,
                            }}
                        >
                            Point of Contacts
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                            <input
                                placeholder="Name"
                                value={newContactName}
                                onChange={(e) => setNewContactName(e.target.value)}
                                style={inputStyle}
                            />
                            <input
                                placeholder="Email"
                                value={newContactEmail}
                                onChange={(e) => setNewContactEmail(e.target.value)}
                                style={inputStyle}
                            />
                            <select
                                style={inputStyle}
                                value={newContactRole}
                                onChange={(e) => setNewContactRole(e.target.value)}
                            >
                                <option value="STAKEHOLDER">STAKEHOLDER</option>
                                <option value="MANAGER">MANAGER</option>
                                <option value="TECH_LEAD">TECH_LEAD</option>
                            </select>
                            <label
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    fontSize: 12,
                                    color: "var(--text-2)",
                                    cursor: "pointer",
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={newContactPrimary}
                                    onChange={(e) => setNewContactPrimary(e.target.checked)}
                                    style={{ width: 14, height: 14 }}
                                />
                                Primary Contact
                            </label>
                            <Button variant="secondary" onClick={handleAddContact} style={{ width: "100%", justifyContent: "center" }}>
                                Add Contact
                            </Button>
                        </div>
                        <div
                            style={{
                                borderTop: "1px solid var(--border)",
                                paddingTop: 10,
                                display: "flex",
                                flexDirection: "column",
                                gap: 0,
                            }}
                        >
                            {contacts.map((c) => (
                                <div
                                    key={c.id}
                                    style={{
                                        fontSize: 12,
                                        color: "var(--text-2)",
                                        padding: "8px 0",
                                        borderBottom: "1px solid var(--border)",
                                    }}
                                >
                                    {c.name}{" "}
                                    <span style={{ color: "var(--text-3)" }}>
                                        ({c.contactRole}){c.isPrimary ? " — Primary" : ""}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </Section>

            {/* Allocation Windows */}
            <Section title="Allocation Windows">
                <Card style={{ padding: 16 }}>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr 80px",
                            gap: 10,
                            marginBottom: 10,
                        }}
                    >
                        <select
                            style={inputStyle}
                            value={allocMemberId}
                            onChange={(e) => setAllocMemberId(e.target.value)}
                        >
                            <option value="">Select member</option>
                            {members.map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                        <input
                            type="date"
                            style={inputStyle}
                            value={allocStartDate}
                            onChange={(e) => setAllocStartDate(e.target.value)}
                        />
                        <input
                            type="date"
                            style={inputStyle}
                            value={allocEndDate}
                            onChange={(e) => setAllocEndDate(e.target.value)}
                        />
                        <input
                            type="number"
                            min={1}
                            max={100}
                            style={inputStyle}
                            value={allocPct}
                            onChange={(e) => setAllocPct(Number(e.target.value))}
                        />
                    </div>
                    <Button variant="primary" onClick={handleAddAllocation} style={{ width: "100%", justifyContent: "center", marginBottom: 12 }}>
                        Add Allocation
                    </Button>
                    <div
                        style={{
                            borderTop: "1px solid var(--border)",
                            paddingTop: 10,
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        {allocations.map((a) => {
                            const member = members.find((m) => m.id === a.teamMemberId);
                            return (
                                <div
                                    key={a.id}
                                    style={{
                                        fontSize: 12,
                                        color: "var(--text-2)",
                                        padding: "8px 0",
                                        borderBottom: "1px solid var(--border)",
                                    }}
                                >
                                    <span style={{ fontWeight: 500 }}>
                                        {member?.name || a.teamMemberId}
                                    </span>
                                    <span style={{ color: "var(--text-3)" }}>
                                        : {a.startDate} to {a.endDate || "open"} ({a.allocationPercentage}%)
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </Section>
        </div>
    );
}
