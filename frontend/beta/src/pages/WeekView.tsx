import { useState, useEffect, KeyboardEvent } from "react";
import { api, WeekRollup, WeeklySummaryRequest } from "../api/client";

// Helper to get current ISO week YYYY-Www
function getCurrentWeek() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    // Thursday in current week decides the year.
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    var week1 = new Date(d.getFullYear(), 0, 4);
    var week = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export default function WeekView() {
    const [yearWeek, setYearWeek] = useState(getCurrentWeek);
    const [data, setData] = useState<WeekRollup | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Reflection State
    const [notPerfIssues, setNotPerfIssues] = useState("");
    const [oneChange, setOneChange] = useState("");
    const [selectedFrag, setSelectedFrag] = useState<string[]>([]);
    const [saved, setSaved] = useState(false);

    const fetchWeek = async () => {
        setLoading(true);
        setError("");
        setSaved(false);
        try {
            const res = await api.reports.getWeek(yearWeek);
            setData(res);
            // Hydrate forms
            setNotPerfIssues(res.reflection.notPerformanceIssues.join("\n"));
            setOneChange(res.reflection.oneChangeNextWeek);
            setSelectedFrag(res.reflection.topFragmenters);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWeek();
    }, []); // Run once on mount, verify if we should run on yearWeek change? Usually yes.

    // Allow enter key to load
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") fetchWeek();
    };

    const handleSave = async () => {
        if (!data) return;
        try {
            const payload: WeeklySummaryRequest = {
                topFragmenters: selectedFrag,
                notPerformanceIssues: notPerfIssues.split("\n").filter(s => s.trim()),
                oneChangeNextWeek: oneChange
            };
            await api.reports.saveWeeklySummary(yearWeek, payload);
            setSaved(true);
            fetchWeek(); // Reload to confirm persistence
        } catch (e: any) {
            alert("Failed to save: " + e.message);
        }
    };

    if (loading && !data) return <div className="p-8">Loading weekly report...</div>;

    return (
        <div className="p-4 max-w-4xl mx-auto space-y-8 pb-20">
            <header className="flex items-center gap-4 border-b pb-4">
                <h1 className="text-2xl font-bold">Weekly Report</h1>
                <div className="flex gap-2">
                    <input
                        type="week"
                        className="border p-1 rounded"
                        value={yearWeek}
                        onChange={e => setYearWeek(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <button
                        onClick={fetchWeek}
                        className="bg-slate-800 text-white px-3 py-1 rounded hover:bg-slate-700"
                    >
                        Load
                    </button>
                </div>
            </header>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded">
                    Error: {error} <button onClick={fetchWeek} className="underline ml-2">Retry</button>
                </div>
            )}

            {data && (
                <>
                    {/* Metrics Grid */}
                    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard label="Active Work" value={data.metrics.totalActiveLabel || "-"} />
                        <MetricCard label="Total Blocks" value={data.metrics.totalBlocks} />
                        <MetricCard
                            label="Interrupted"
                            value={data.metrics.interruptedBlocks}
                            sub={`${Math.round(data.metrics.fragmentationRate * 100)}% Rate`}
                        />
                        <MetricCard label="Focus Blocks" value={data.metrics.focusBlocks} />
                    </section>

                    {/* Fragmenters Table */}
                    <section className="space-y-4">
                        <h3 className="font-bold text-lg">Top Sources of Fragmentation</h3>
                        {data.metrics.topFragmenters.length === 0 ? (
                            <p className="text-gray-500 italic">No interruptions recorded this week.</p>
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
                                One structural change for next week?
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

            {data && data.metrics.totalBlocks === 0 && !error && (
                <div className="text-center py-20 text-gray-400">
                    <h3 className="text-lg font-medium text-gray-500">No blocks recorded for this week.</h3>
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
