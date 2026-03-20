import { useState, useEffect } from "react";
import { api, type SprintDefinition, type SprintRollup, type WeeklySummaryRequest } from "../api/client";

function getTodayIsoDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export default function WeekView() {
    const [sprints, setSprints] = useState<SprintDefinition[]>([]);
    const [selectedSprintId, setSelectedSprintId] = useState("");
    const [data, setData] = useState<SprintRollup | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Reflection State
    const [notPerfIssues, setNotPerfIssues] = useState("");
    const [oneChange, setOneChange] = useState("");
    const [selectedFrag, setSelectedFrag] = useState<string[]>([]);
    const [saved, setSaved] = useState(false);

    const fetchSprint = async (sprintId: string) => {
        if (!sprintId) return;
        setLoading(true);
        setError("");
        setSaved(false);
        try {
            const res = await api.sprints.getRollup(sprintId);
            setData(res);
            setNotPerfIssues((res.reflection?.notPerformanceIssues || []).join("\n"));
            setOneChange(res.reflection?.oneChangeNextWeek || "");
            setSelectedFrag(res.reflection?.topFragmenters || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const loadSprints = async () => {
            setLoading(true);
            setError("");
            try {
                const res = await api.sprints.list();
                const items = res.items || [];
                setSprints(items);
                if (items.length > 0) {
                    const today = getTodayIsoDate();
                    const current = items.find((s) => s.startDate <= today && s.endDate >= today);
                    const target = current || items[0];
                    setSelectedSprintId(target.id);
                } else {
                    setData(null);
                }
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        loadSprints();
    }, []);

    useEffect(() => {
        if (!selectedSprintId) return;
        fetchSprint(selectedSprintId);
    }, [selectedSprintId]);

    const handleSave = async () => {
        if (!data || !selectedSprintId) return;
        try {
            const payload: WeeklySummaryRequest = {
                topFragmenters: selectedFrag,
                notPerformanceIssues: notPerfIssues.split("\n").filter(s => s.trim()),
                oneChangeNextWeek: oneChange
            };
            await api.sprints.saveSummary(selectedSprintId, payload);
            setSaved(true);
            fetchSprint(selectedSprintId);
        } catch (e: any) {
            alert("Failed to save: " + e.message);
        }
    };

    if (loading && !data) return <div className="p-8">Loading sprint report...</div>;

    return (
        <div className="p-4 max-w-4xl mx-auto space-y-8 pb-20">
            <header className="flex items-center gap-4 border-b pb-4">
                <h1 className="text-2xl font-bold">Sprint Report</h1>
                <div className="flex gap-2">
                    <select
                        className="border p-2 rounded min-w-64"
                        value={selectedSprintId}
                        onChange={(e) => setSelectedSprintId(e.target.value)}
                    >
                        {sprints.length === 0 && <option value="">No sprints</option>}
                        {sprints.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name} ({s.startDate} to {s.endDate})
                            </option>
                        ))}
                    </select>
                </div>
            </header>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded">
                    Error: {error}
                </div>
            )}

            {data && (
                <>
                    {/* Metrics Grid */}
                    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard label="Active Work" value={data?.metrics?.totalActiveLabel || "-"} />
                        <MetricCard label="Total Blocks" value={data?.metrics?.totalBlocks || 0} />
                        <MetricCard
                            label="Interrupted"
                            value={data?.metrics?.interruptedBlocks || 0}
                            sub={`${Math.round((data?.metrics?.fragmentationRate || 0) * 100)}% Rate`}
                        />
                        <MetricCard label="Focus Blocks" value={data?.metrics?.focusBlocks || 0} />
                        <MetricCard label="Recovery" value={data?.metrics?.totalRecoveryLabel || "-"} />
                    </section>

                    {/* Fragmenters Table */}
                    <section className="space-y-4">
                        <h3 className="font-bold text-lg">Top Sources of Fragmentation</h3>
                        {(!data?.metrics?.topFragmenters || data.metrics.topFragmenters.length === 0) ? (
                            <p className="text-gray-500 italic">No interruptions recorded for this sprint.</p>
                        ) : (
                            <div className="border rounded overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="p-3 text-left">Code</th>
                                            <th className="p-3 text-right w-24">Count</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.metrics.topFragmenters.map(f => (
                                            <tr key={f.code} className="border-t">
                                                <td className="p-3">{f.code}</td>
                                                <td className="p-3 text-right font-mono">{f.count}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* Reflection Form */}
                    <section className="bg-slate-50 p-6 rounded-lg border space-y-6">
                        <h2 className="text-xl font-bold">Weekly Reflection</h2>

                        {/* 1. Identify Top Fragmenters */}
                        <div className="space-y-2">
                            <label className="block font-semibold text-sm">Which fragmenters were systemic issues?</label>
                            <div className="flex flex-wrap gap-2">
                                {data.metrics.topFragmenters.map(f => (
                                    <button
                                        key={f.code}
                                        onClick={() => {
                                            if (selectedFrag.includes(f.code)) {
                                                setSelectedFrag(selectedFrag.filter(x => x !== f.code));
                                            } else {
                                                setSelectedFrag([...selectedFrag, f.code]);
                                            }
                                        }}
                                        className={`px-3 py-1 rounded text-sm border ${selectedFrag.includes(f.code)
                                            ? "bg-red-100 border-red-300 text-red-800"
                                            : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
                                            }`}
                                    >
                                        {f.code}
                                    </button>
                                ))}
                            </div>
                            {data.metrics.topFragmenters.length === 0 && (
                                <p className="text-xs text-gray-400">No fragmenters to select.</p>
                            )}
                        </div>

                        {/* 2. Non-Performance Issues */}
                        <div className="space-y-2">
                            <label className="block font-semibold text-sm">
                                What slowed you down but was <span className="underline">not</span> a performance issue?
                            </label>
                            <p className="text-xs text-gray-500">
                                E.g. environment instability, lack of clarity, waiting on reviews. One per line.
                            </p>
                            <textarea
                                className="w-full border p-3 rounded h-32"
                                value={notPerfIssues}
                                onChange={e => setNotPerfIssues(e.target.value)}
                                placeholder="- Staging environment down for 2h..."
                            />
                        </div>

                        {/* 3. Structural Change */}
                        <div className="space-y-2">
                            <label className="block font-semibold text-sm">
                                One structural change for next sprint?
                            </label>
                            <input
                                type="text"
                                className="w-full border p-3 rounded"
                                value={oneChange}
                                onChange={e => setOneChange(e.target.value)}
                                placeholder="e.g. Block calendars Tue/Thu morning..."
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleSave}
                                className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700"
                            >
                                Save Summary
                            </button>
                            {saved && <span className="text-green-600 font-bold animate-pulse">Saved successfully!</span>}
                        </div>
                    </section>
                </>
            )}

            {data && (data.metrics?.totalBlocks || 0) === 0 && !error && (
                <div className="text-center py-20 text-gray-400">
                    <h3 className="text-lg font-medium text-gray-500">No blocks recorded for this sprint.</h3>
                    <p>Go to "Today" to start tracking your work.</p>
                </div>
            )}
        </div>
    );
}

function MetricCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
    return (
        <div className="border p-4 rounded shadow-sm bg-white">
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</div>
            {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
        </div>
    );
}
