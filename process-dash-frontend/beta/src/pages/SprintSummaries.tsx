import { useEffect, useMemo, useState } from "react";
import { api, type SprintDefinition, type SprintSummaryItem } from "../api/client";

export default function SprintSummaries() {
    const [sprints, setSprints] = useState<SprintDefinition[]>([]);
    const [items, setItems] = useState<SprintSummaryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedWeek, setSelectedWeek] = useState("");

    const [newName, setNewName] = useState("");
    const [newStartDate, setNewStartDate] = useState("");
    const [newDurationDays, setNewDurationDays] = useState(7);

    const [editSprintId, setEditSprintId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editStartDate, setEditStartDate] = useState("");
    const [editDurationDays, setEditDurationDays] = useState(7);
    const [editWarning, setEditWarning] = useState("");

    useEffect(() => {
        const load = async (keepSelection = false) => {
            setLoading(true);
            setError("");
            try {
                const [sprintsRes, summariesRes] = await Promise.all([
                    api.sprints.list(),
                    api.sprints.getSummaries(),
                ]);

                setSprints(sprintsRes.items || []);
                setItems(summariesRes.items || []);

                if (!keepSelection) {
                    const first = (summariesRes.items || [])[0];
                    if (first?.sprintId) {
                        setSelectedWeek(first.sprintId);
                    }
                }
            } catch (e: any) {
                setError(e.message || "Failed to load sprint summaries");
            } finally {
                setLoading(false);
            }
        };

        load(false);
    }, []);

    const selected = useMemo(
        () => items.find((x) => x.sprintId === selectedWeek) || null,
        [items, selectedWeek]
    );

    const selectedDefinition = useMemo(
        () => sprints.find((x) => x.id === selectedWeek) || null,
        [sprints, selectedWeek]
    );

    const refresh = async (keepSelection = true) => {
        const [sprintsRes, summariesRes] = await Promise.all([
            api.sprints.list(),
            api.sprints.getSummaries(),
        ]);
        setSprints(sprintsRes.items || []);
        setItems(summariesRes.items || []);

        if (!keepSelection) {
            const first = (summariesRes.items || [])[0];
            setSelectedWeek(first?.sprintId || "");
        }
    };

    const handleCreateSprint = async () => {
        setError("");
        if (!newName.trim() || !newStartDate) {
            setError("Sprint name and start date are required.");
            return;
        }
        try {
            const created = await api.sprints.create(newName.trim(), newStartDate, Number(newDurationDays));
            setNewName("");
            setNewStartDate("");
            setNewDurationDays(7);
            await refresh(true);
            setSelectedWeek(created.id);
        } catch (e: any) {
            setError(e.message || "Failed to create sprint");
        }
    };

    const openEdit = (sprint: SprintDefinition) => {
        setEditSprintId(sprint.id);
        setEditName(sprint.name);
        setEditStartDate(sprint.startDate);
        setEditDurationDays(sprint.durationDays);
        setEditWarning("");
    };

    const handleUpdateSprint = async (forceRecalculate = false) => {
        if (!editSprintId) return;

        try {
            const response = await api.sprints.update(editSprintId, {
                name: editName.trim(),
                startDate: editStartDate,
                durationDays: Number(editDurationDays),
                forceRecalculate,
            });

            if (!response.ok && response.requiresConfirmation) {
                setEditWarning(response.warning || "This update needs confirmation.");
                return;
            }

            setEditSprintId(null);
            setEditWarning("");
            await refresh(true);
        } catch (e: any) {
            setEditWarning(e.message || "Failed to update sprint");
        }
    };

    if (loading) {
        return <div className="p-8">Loading sprint summaries...</div>;
    }

    return (
        <div className="p-4 max-w-5xl mx-auto space-y-6 pb-16">
            <header className="space-y-2">
                <h1 className="text-2xl font-bold">Sprint Summaries</h1>
                <p className="text-gray-600 text-sm">
                    Review all saved sprint reflections and compare progress over time.
                </p>
            </header>

            {error && <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded">{error}</div>}

            <section className="bg-gray-50 border rounded p-4 space-y-3">
                <h2 className="font-semibold">Create Sprint</h2>
                <div className="grid md:grid-cols-4 gap-3">
                    <input
                        className="border p-2 rounded"
                        placeholder="Sprint name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                    />
                    <input
                        type="date"
                        className="border p-2 rounded"
                        value={newStartDate}
                        onChange={(e) => setNewStartDate(e.target.value)}
                    />
                    <select
                        className="border p-2 rounded"
                        value={newDurationDays}
                        onChange={(e) => setNewDurationDays(Number(e.target.value))}
                    >
                        <option value={7}>7 days</option>
                        <option value={14}>14 days</option>
                        <option value={21}>21 days</option>
                        <option value={28}>28 days</option>
                    </select>
                    <button onClick={handleCreateSprint} className="bg-blue-600 text-white px-3 py-2 rounded">
                        Create
                    </button>
                </div>
            </section>

            <section className="bg-white border rounded p-4 space-y-3">
                <h2 className="font-semibold">Configured Sprints</h2>
                {sprints.length === 0 ? (
                    <p className="text-sm text-gray-500">No sprint definitions yet.</p>
                ) : (
                    <div className="space-y-2">
                        {sprints.map((s) => (
                            <div key={s.id} className="border rounded p-3 flex justify-between items-center">
                                <div>
                                    <div className="font-semibold">{s.name}</div>
                                    <div className="text-xs text-gray-500">{s.startDate} to {s.endDate} ({s.durationDays} days)</div>
                                </div>
                                <button onClick={() => openEdit(s)} className="text-sm underline text-blue-600">Edit</button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {items.length === 0 ? (
                <div className="bg-gray-50 border p-6 rounded text-gray-600">
                    No sprint summaries yet. Save one from the Week Report page to start tracking progress.
                </div>
            ) : (
                <>
                    <div className="border rounded overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-3 text-left">Sprint</th>
                                    <th className="p-3 text-right">Blocks</th>
                                    <th className="p-3 text-right">Interrupted</th>
                                    <th className="p-3 text-right">Fragmentation</th>
                                    <th className="p-3 text-left">Saved</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr
                                        key={item.sprintId}
                                        onClick={() => setSelectedWeek(item.sprintId)}
                                        className={`border-b cursor-pointer hover:bg-blue-50 ${selectedWeek === item.sprintId ? "bg-blue-50" : ""}`}
                                    >
                                        <td className="p-3 font-semibold">{item.name || item.sprintId}</td>
                                        <td className="p-3 text-right">{item.metrics.totalBlocks}</td>
                                        <td className="p-3 text-right">{item.metrics.interruptedBlocks}</td>
                                        <td className="p-3 text-right">{Math.round((item.metrics.fragmentationRate || 0) * 100)}%</td>
                                        <td className="p-3 text-gray-500">{formatSavedAt(item.savedAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {selected && (
                        <section className="bg-white border rounded p-5 space-y-4">
                            <h2 className="text-xl font-bold">{selected.name || selected.sprintId} Summary</h2>
                            <p className="text-sm text-gray-500">{selected.startDate || selectedDefinition?.startDate || "-"} to {selected.endDate || selectedDefinition?.endDate || "-"}</p>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <MetricCard label="Active" value={selected.metrics.totalActiveLabel || "-"} />
                                <MetricCard label="Recovery" value={selected.metrics.totalRecoveryLabel || "-"} />
                                <MetricCard label="Blocks" value={selected.metrics.totalBlocks} />
                                <MetricCard label="Interrupted" value={selected.metrics.interruptedBlocks} />
                                <MetricCard label="Focus" value={selected.metrics.focusBlocks} />
                            </div>

                            <div>
                                <h3 className="font-semibold">Top Fragmenters</h3>
                                {selected.topFragmenters.length === 0 ? (
                                    <p className="text-gray-500 text-sm">No fragmenters recorded.</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {selected.topFragmenters.map((f) => (
                                            <span key={f} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded">
                                                {f}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <h3 className="font-semibold">Not Performance Issues</h3>
                                {selected.notPerformanceIssues.length === 0 ? (
                                    <p className="text-gray-500 text-sm">None documented.</p>
                                ) : (
                                    <ul className="list-disc pl-5 text-sm mt-1">
                                        {selected.notPerformanceIssues.map((issue, idx) => (
                                            <li key={idx}>{issue}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div>
                                <h3 className="font-semibold">One Change Next Week</h3>
                                <p className="text-sm text-gray-700 mt-1">{selected.oneChangeNextWeek || "Not set"}</p>
                            </div>
                        </section>
                    )}
                </>
            )}

            {editSprintId && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg border p-5 w-full max-w-lg space-y-4">
                        <h3 className="text-lg font-bold">Edit Sprint</h3>
                        <div className="grid md:grid-cols-3 gap-3">
                            <input className="border p-2 rounded" value={editName} onChange={(e) => setEditName(e.target.value)} />
                            <input type="date" className="border p-2 rounded" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} />
                            <input
                                type="number"
                                min={1}
                                max={60}
                                className="border p-2 rounded"
                                value={editDurationDays}
                                onChange={(e) => setEditDurationDays(Number(e.target.value))}
                            />
                        </div>

                        {editWarning && <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2 rounded text-sm">{editWarning}</div>}

                        <div className="flex gap-2 justify-end">
                            <button className="px-3 py-2 border rounded" onClick={() => setEditSprintId(null)}>Cancel</button>
                            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => handleUpdateSprint(false)}>Save</button>
                            <button className="px-3 py-2 bg-amber-600 text-white rounded" onClick={() => handleUpdateSprint(true)}>Confirm Recalculate</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="border rounded p-3 bg-gray-50">
            <div className="text-lg font-bold">{value}</div>
            <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
        </div>
    );
}

function formatSavedAt(savedAt?: string | null) {
    if (!savedAt) return "-";
    const d = new Date(savedAt);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString();
}
