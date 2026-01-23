import { useState, useEffect } from "react";
import { api, WeekRollup, DayRollup } from "../api/client";
import { getCurrentWeek, getDatesInWeek } from "../utils/dateUtils";

interface IntentSummary {
    name: string;
    count: number;
    totalMinutes: number;
}

// Simple bucketer helper for frontend aggregations
function bucketMinutes(m: number): string {
    if (m <= 15) return "~15 mins";
    if (m <= 30) return "~30 mins";
    if (m <= 60) return "~1 hour";
    if (m <= 120) return "~2 hours";
    if (m <= 180) return "~½ day";
    if (m <= 360) return "~1 day";
    return "> 1 day";
}

export default function WeekendSummary() {
    const [yearWeek, setYearWeek] = useState(getCurrentWeek);
    const [weekData, setWeekData] = useState<WeekRollup | null>(null);
    const [daysData, setDaysData] = useState<DayRollup[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedImprovements, setSelectedImprovements] = useState<string[]>([]);

    useEffect(() => {
        loadData();
    }, [yearWeek]); // Reload when week changes

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Week Aggregate
            const weekRes = await api.reports.getWeek(yearWeek);
            setWeekData(weekRes);

            // 2. Fetch All Days in Week (to build granular views)
            const dates = getDatesInWeek(yearWeek);
            const dayPromises = dates.map(d => api.reports.getDay(d).catch(() => null));
            // silently fail for future days or errors
            const days = (await Promise.all(dayPromises)).filter(d => d !== null) as DayRollup[];
            setDaysData(days);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // --- Derived Data ---

    // 1. Grouped Intents
    const intentMap = new Map<string, IntentSummary>();
    daysData.forEach(d => {
        d.blocks.forEach(b => {
            const existing = intentMap.get(b.intent || "Unknown") || { name: b.intent || "Unknown", count: 0, totalMinutes: 0 };
            existing.count++;
            existing.totalMinutes += (b.durationMinutes || 0);
            intentMap.set(b.intent || "Unknown", existing);
        });
    });
    const sortedIntents = Array.from(intentMap.values()).sort((a, b) => b.totalMinutes - a.totalMinutes);

    // 2. Focus Reality Check
    const focusDays = daysData.filter(d => d.metrics.focusBlocks > 0);
    const totalDaysRecorded = daysData.filter(d => d.blocks.length > 0).length;
    // Longest block?
    let longestBlockMins = 0;
    daysData.forEach(d => d.blocks.forEach(b => {
        if (!b.interrupted && (b.durationMinutes || 0) > longestBlockMins) {
            longestBlockMins = b.durationMinutes || 0;
        }
    }));

    // 3. Structural Wins
    const wins: string[] = [];
    if (focusDays.length >= 2) wins.push("You had 2+ days with deep focus blocks");

    // Add safety check before accessing metrics
    if (weekData && weekData.metrics) {
        if (weekData.metrics.fragmentationRate < 0.3 && weekData.metrics.totalBlocks > 5) wins.push("Fragmentation was kept lower than 30%");
        if (weekData.metrics.interruptedBlocks === 0 && weekData.metrics.totalBlocks > 0) wins.push("Zero interruptions recorded!");
    }

    if (wins.length === 0) wins.push("You tracked your work, which is the first step to checking reality.");

    const improvementsOptions = [
        "Block mornings for deep work on Tue/Thu.",
        "Decline meetings without a clear agenda.",
        "Break tasks down into 30m chunks.",
        "Turn off Slack notifications during focus.",
        "Clarify dependencies before starting a block.",
        "Take a real lunch break away from screens."
    ];

    if (loading) return <div className="p-10 text-center text-gray-500">Loading retrospective...</div>;
    if (!weekData) return <div className="p-10 text-center">No data found.</div>;

    return (
        <div className="max-w-3xl mx-auto p-6 pb-20 space-y-12 font-sans bg-stone-50 min-h-screen">
            <header className="space-y-2 border-b-2 border-stone-200 pb-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-serif text-stone-800">Weekend Summary</h1>
                    <input
                        type="week"
                        value={yearWeek}
                        onChange={e => setYearWeek(e.target.value)}
                        className="bg-transparent border-none text-stone-400 text-sm"
                    />
                </div>
                <p className="text-stone-500 italic">Designing a better next week, not judging the last one.</p>
            </header>

            {/* 1. Week at a Glance */}
            <section className="space-y-4">
                <h2 className="text-xl font-bold text-stone-700">Week at a Glance</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <SummaryCard label="Active Work" value={weekData?.metrics?.totalActiveLabel || "~0 mins"} />
                    <SummaryCard label="Total Blocks" value={weekData?.metrics?.totalBlocks || 0} />
                    <SummaryCard label="Focus Blocks" value={weekData?.metrics?.focusBlocks || 0} />
                    <SummaryCard label="Fragmentation" value={`${Math.round((weekData?.metrics?.fragmentationRate || 0) * 100)}%`} />
                </div>
                <p className="text-xs text-stone-400 italic text-center">This is an approximation of cognitive effort, not hours worked.</p>
            </section>

            {/* 2. What You Actually Worked On */}
            <section className="space-y-4">
                <h2 className="text-xl font-bold text-stone-700">Where Energy Went</h2>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-100 divide-y">
                    {sortedIntents.length === 0 ? <p className="text-gray-400 italic">No work recorded.</p> :
                        sortedIntents.map(i => (
                            <div key={i.name} className="py-3 flex justify-between items-center">
                                <span className="font-medium text-stone-800">{i.name}</span>
                                <div className="text-sm text-stone-500">
                                    {i.count} blocks <span className="mx-1">·</span> <span className="font-mono bg-stone-100 px-2 rounded text-stone-600">{bucketMinutes(i.totalMinutes)}</span>
                                </div>
                            </div>
                        ))}
                </div>
            </section>

            {/* 3. Fragmentation Pattern */}
            <section className="space-y-4">
                <h2 className="text-xl font-bold text-stone-700">Fragmentation Pattern</h2>
                {weekData?.metrics?.topFragmenters?.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                        {weekData.metrics.topFragmenters.map((f, i) => (
                            <div key={f.code} className="flex items-center gap-3 p-3 bg-red-50/50 rounded border border-red-100">
                                <div className="font-bold text-red-800 w-8 h-8 flex items-center justify-center bg-white rounded-full border border-red-100">{i + 1}</div>
                                <div>
                                    <span className="font-bold text-stone-700">{f.code}</span> interrupted {f.count} blocks.
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-stone-500 bg-green-50 p-4 rounded border border-green-100">Zero major interruptions recorded. Smooth sailing?</p>
                )}
            </section>

            {/* 4. Focus Reality Check */}
            <section className="space-y-4">
                <h2 className="text-xl font-bold text-stone-700">Focus Reality Check</h2>
                <div className="bg-white p-6 rounded-lg border border-stone-100 grid md:grid-cols-2 gap-8">
                    <div>
                        <div className="text-4xl font-serif text-stone-800 mb-1">{focusDays.length} <span className="text-base text-stone-400 sans-serif">days</span></div>
                        <div className="text-sm text-stone-500">Allowed deeper focus blocks (30m+)</div>
                    </div>
                    <div>
                        <div className="text-4xl font-serif text-stone-800 mb-1">{longestBlockMins > 0 ? bucketMinutes(longestBlockMins) : "-"}</div>
                        <div className="text-sm text-stone-500">Longest uninterrupted flow state</div>
                    </div>
                </div>
            </section>

            {/* 5. What Was NOT a Performance Issue */}
            <section className="space-y-4 opacity-75">
                <h2 className="text-xl font-bold text-stone-700">Not A Performance Issue</h2>
                <div className="bg-stone-100 p-6 rounded-lg text-stone-600 italic">
                    {weekData?.reflection?.notPerformanceIssues?.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1">
                            {weekData.reflection.notPerformanceIssues.map((issue, i) => (
                                <li key={i}>{issue}</li>
                            ))}
                        </ul>
                    ) : (
                        <p>No external blockers logged in weekly reflection.</p>
                    )}
                </div>
            </section>

            {/* 6. Structural Wins */}
            <section className="space-y-4">
                <h2 className="text-xl font-bold text-stone-700 text-green-700">Structural Wins</h2>
                <ul className="space-y-2">
                    {wins.map((w, i) => (
                        <li key={i} className="flex gap-2 items-center text-stone-700">
                            <span className="text-green-500 text-xl">✓</span> {w}
                        </li>
                    ))}
                </ul>
            </section>

            {/* 7. Next Week Improvements */}
            <section className="space-y-6 pt-6 border-t border-stone-200">
                <h2 className="text-2xl font-serif font-bold text-stone-900">Design Next Week</h2>
                <p className="text-stone-600">Pick 1-3 structural changes to try. Don't rely on willpower.</p>

                <div className="grid md:grid-cols-2 gap-3">
                    {improvementsOptions.map(opt => (
                        <button
                            key={opt}
                            onClick={() => {
                                if (selectedImprovements.includes(opt)) {
                                    setSelectedImprovements(selectedImprovements.filter(x => x !== opt));
                                } else if (selectedImprovements.length < 3) {
                                    setSelectedImprovements([...selectedImprovements, opt]);
                                }
                            }}
                            className={`text-left p-4 rounded border transition-all ${selectedImprovements.includes(opt)
                                ? "bg-blue-50 border-blue-400 ring-1 ring-blue-400"
                                : "bg-white border-stone-200 hover:border-blue-300"
                                }`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>

                {/* Custom entry could go here, but omitted for simplicity per specs */}
            </section>

        </div>
    );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="bg-white p-4 rounded border border-stone-100 text-center">
            <div className="text-2xl font-bold text-stone-800">{value}</div>
            <div className="text-xs text-stone-400 uppercase tracking-wider mt-1">{label}</div>
        </div>
    );
}
