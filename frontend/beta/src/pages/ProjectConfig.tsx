import { useEffect, useMemo, useState } from "react";
import { api, type ProjectContact, type ProjectDefinition, type ProjectMember, type TeamAllocation } from "../api/client";

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
            await api.projects.updateConfig(projectId, { defaultSprintDurationDays });
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

    if (loading) return <div className="p-8">Loading project configuration...</div>;

    return (
        <div className="max-w-5xl mx-auto p-4 space-y-6 pb-20">
            <header className="space-y-2">
                <h1 className="text-2xl font-bold">Project Configuration</h1>
                <p className="text-sm text-gray-600">Project details, point of contacts, team members, and allocation windows.</p>
            </header>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">{error}</div>}

            <section className="bg-gray-50 border rounded p-4 space-y-3">
                <h2 className="font-semibold">Create Project</h2>
                <div className="grid md:grid-cols-3 gap-3">
                    <input className="border p-2 rounded" placeholder="Project name" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} />
                    <input className="border p-2 rounded" placeholder="Description" value={newProjectDescription} onChange={(e) => setNewProjectDescription(e.target.value)} />
                    <button className="bg-blue-600 text-white px-3 py-2 rounded" onClick={handleCreateProject}>Create</button>
                </div>
            </section>

            <section className="bg-white border rounded p-4 space-y-4">
                <h2 className="font-semibold">Selected Project</h2>
                <select className="border p-2 rounded w-full" value={projectId} onChange={(e) => onProjectChange(e.target.value)}>
                    {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>

                {selectedProject && (
                    <div className="grid md:grid-cols-2 gap-3">
                        <input className="border p-2 rounded" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Project name" />
                        <input className="border p-2 rounded" value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} placeholder="Description" />
                        <input type="date" className="border p-2 rounded" value={allocationStartDate} onChange={(e) => setAllocationStartDate(e.target.value)} />
                        <input type="date" className="border p-2 rounded" value={allocationEndDate} onChange={(e) => setAllocationEndDate(e.target.value)} />
                        <input type="number" min={1} max={60} className="border p-2 rounded" value={defaultSprintDurationDays} onChange={(e) => setDefaultSprintDurationDays(Number(e.target.value))} />
                        <button className="bg-blue-600 text-white px-3 py-2 rounded" onClick={handleSaveProject}>Save Project Details</button>
                    </div>
                )}
            </section>

            <section className="grid md:grid-cols-2 gap-4">
                <div className="bg-white border rounded p-4 space-y-3">
                    <h2 className="font-semibold">Team Members</h2>
                    <div className="grid grid-cols-1 gap-2">
                        <input className="border p-2 rounded" placeholder="Name" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} />
                        <input className="border p-2 rounded" placeholder="Email" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} />
                        <select className="border p-2 rounded" value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value)}>
                            <option value="CONTRIBUTOR">CONTRIBUTOR</option>
                            <option value="LEAD">LEAD</option>
                            <option value="OBSERVER">OBSERVER</option>
                        </select>
                        <button className="bg-slate-800 text-white px-3 py-2 rounded" onClick={handleAddMember}>Add Member</button>
                    </div>
                    <ul className="text-sm divide-y">
                        {members.map((m) => (
                            <li key={m.id} className="py-2">{m.name} ({m.role}) {m.email ? `- ${m.email}` : ""}</li>
                        ))}
                    </ul>
                </div>

                <div className="bg-white border rounded p-4 space-y-3">
                    <h2 className="font-semibold">Point of Contacts</h2>
                    <div className="grid grid-cols-1 gap-2">
                        <input className="border p-2 rounded" placeholder="Name" value={newContactName} onChange={(e) => setNewContactName(e.target.value)} />
                        <input className="border p-2 rounded" placeholder="Email" value={newContactEmail} onChange={(e) => setNewContactEmail(e.target.value)} />
                        <select className="border p-2 rounded" value={newContactRole} onChange={(e) => setNewContactRole(e.target.value)}>
                            <option value="STAKEHOLDER">STAKEHOLDER</option>
                            <option value="MANAGER">MANAGER</option>
                            <option value="TECH_LEAD">TECH_LEAD</option>
                        </select>
                        <label className="text-sm">
                            <input type="checkbox" checked={newContactPrimary} onChange={(e) => setNewContactPrimary(e.target.checked)} className="mr-2" />
                            Primary Contact
                        </label>
                        <button className="bg-slate-800 text-white px-3 py-2 rounded" onClick={handleAddContact}>Add Contact</button>
                    </div>
                    <ul className="text-sm divide-y">
                        {contacts.map((c) => (
                            <li key={c.id} className="py-2">{c.name} ({c.contactRole}) {c.isPrimary ? "- Primary" : ""}</li>
                        ))}
                    </ul>
                </div>
            </section>

            <section className="bg-white border rounded p-4 space-y-3">
                <h2 className="font-semibold">Allocation Windows</h2>
                <div className="grid md:grid-cols-4 gap-2">
                    <select className="border p-2 rounded" value={allocMemberId} onChange={(e) => setAllocMemberId(e.target.value)}>
                        <option value="">Select member</option>
                        {members.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                    <input type="date" className="border p-2 rounded" value={allocStartDate} onChange={(e) => setAllocStartDate(e.target.value)} />
                    <input type="date" className="border p-2 rounded" value={allocEndDate} onChange={(e) => setAllocEndDate(e.target.value)} />
                    <input type="number" min={1} max={100} className="border p-2 rounded" value={allocPct} onChange={(e) => setAllocPct(Number(e.target.value))} />
                    <button className="bg-blue-600 text-white px-3 py-2 rounded md:col-span-4" onClick={handleAddAllocation}>Add Allocation</button>
                </div>
                <ul className="text-sm divide-y">
                    {allocations.map((a) => {
                        const member = members.find((m) => m.id === a.teamMemberId);
                        return (
                            <li key={a.id} className="py-2">
                                {member?.name || a.teamMemberId}: {a.startDate} to {a.endDate || "open"} ({a.allocationPercentage}%)
                            </li>
                        );
                    })}
                </ul>
            </section>
        </div>
    );
}
