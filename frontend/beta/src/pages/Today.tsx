import { useState, useEffect } from "react";
import { api, DayRollup } from "../api/client";

// Bucket options for dropdown
const DURATION_BUCKETS = [
    { label: "~15 mins", value: 15 },
    { label: "~30 mins", value: 30 },
    { label: "~1 hour", value: 60 },
    { label: "~2 hours", value: 120 },
    { label: "~½ day (3h)", value: 180 },
    { label: "~1 day (6h)", value: 360 },
];

export default function Today() {
    const [date] = useState(() => new Date().toISOString().split("T")[0]);
    const [data, setData] = useState<DayRollup | null>(null);
    const [intentsInput, setIntentsInput] = useState("");

    // Block Form State
    const [newIntent, setNewIntent] = useState("");
    const [newNotes, setNewNotes] = useState("");

    // Action State
    const [interruptReason, setInterruptReason] = useState("MEETING");
    const [endOutcome, setEndOutcome] = useState("");

    // Soft Timer State
    const [startedAt, setStartedAt] = useState<Date | null>(null);
    const [suggestedMinutes, setSuggestedMinutes] = useState<number>(0);
    const [selectedDuration, setSelectedDuration] = useState<number>(30); // Default to ~30m
    const [useExact, setUseExact] = useState(false);
    const [exactDuration, setExactDuration] = useState<string>("");

    const refresh = () => {
        api.reports.getDay(date).then(setData).catch(console.error);
    };

    useEffect(() => {
        refresh();
    }, [date]);

    // If there's an active block but no local startedAt, we can't recover the exact start time 
    // without fetching it from backend (which we aren't storing on block yet in MVP, only event log).
    // For MVP, we'll just let the "Suggested" be 0 or manual input if page reloaded.
    // Ideally, we'd fetch start time from backend.

    const handleSetIntents = async () => {
        const intents = intentsInput.split("\n").filter((s) => s.trim());
        await api.intents.setDaily(date, intents);
        refresh();
    };

    const handleStartBlock = async () => {
        if (!newIntent) return;
        await api.blocks.start(date, newIntent, newNotes);
        setNewIntent("");
        setNewNotes("");
        setStartedAt(new Date()); // Start soft timer
        refresh();
    };

    const activeBlock = data?.blocks.find(
        (b) => !b.interrupted && b.actualOutcome === null && b.durationMinutes === null
    );

    // Update suggested timer UI when active
    useEffect(() => {
        let interval: any;
        if (activeBlock && startedAt) {
            interval = setInterval(() => {
                const diff = Math.round((new Date().getTime() - startedAt.getTime()) / 60000);
                setSuggestedMinutes(Math.max(1, diff));
            }, 60000);

            // Initial calc
            const diff = Math.round((new Date().getTime() - startedAt.getTime()) / 60000);
            setSuggestedMinutes(Math.max(1, diff));
        }
        return () => clearInterval(interval);
    }, [activeBlock, startedAt]);

    const handleInterrupt = async () => {
        if (!activeBlock) return;
        await api.blocks.interrupt(activeBlock.blockId, interruptReason);
        setStartedAt(null);
        refresh();
    };

    const handleEnd = async () => {
        if (!activeBlock) return;

        // Determine minutes to send
        let finalMinutes = selectedDuration;
        if (useExact && exactDuration) {
            finalMinutes = parseInt(exactDuration);
        }

        await api.blocks.end(activeBlock.blockId, endOutcome, finalMinutes);

        // Reset state
        setEndOutcome("");
        setExactDuration("");
        setStartedAt(null);
        setUseExact(false);
        refresh();
    };

    const handleExport = async () => {
        const res = await api.export.day(date);
        alert(`Exported to: ${res.path}`);
    };

    if (!data) return <div>Loading...</div>;

    return (
        <div className="p-4 max-w-2xl mx-auto space-y-8">
            <header className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Today: {date}</h1>
                <button onClick={handleExport} className="text-sm underline">Export MD</button>
            </header>

            {/* Intents Section */}
            <section className="bg-gray-50 p-4 rounded">
                <h2 className="font-semibold mb-2">Daily Intents</h2>
                {data.intents.length === 0 ? (
                    <div className="space-y-2">
                        <textarea
                            className="w-full border p-2"
                            rows={5}
                            placeholder="List up to 5 intents (one per line)..."
                            value={intentsInput}
                            onChange={(e) => setIntentsInput(e.target.value)}
                        />
                        <button
                            onClick={handleSetIntents}
                            className="bg-blue-600 text-white px-4 py-1 rounded"
                        >
                            Set Intents
                        </button>
                    </div>
                ) : (
                    <ul className="list-disc pl-5">
                        {data.intents.map((i, idx) => (
                            <li key={idx}>{i}</li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Active Work Section */}
            <section className="border-2 border-slate-200 p-6 rounded-lg">
                {activeBlock ? (
                    <div className="space-y-4">
                        <div className="bg-green-50 p-4 rounded border border-green-200">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-green-800 font-bold uppercase text-xs tracking-wider">
                                        Now Focusing On
                                    </h3>
                                    <p className="text-xl font-medium mt-1">{activeBlock.intent}</p>
                                </div>
                                {startedAt && (
                                    <div className="text-right">
                                        <span className="text-sm text-gray-500">Started at {startedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <div className="text-2xl font-bold text-green-700">~{suggestedMinutes}m</div>
                                    </div>
                                )}
                            </div>

                            {activeBlock.notes && (
                                <p className="text-gray-500 text-sm mt-1">{activeBlock.notes}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="border p-4 rounded space-y-2">
                                <h4 className="font-semibold text-sm">Interrupt</h4>
                                <select
                                    className="w-full border p-1"
                                    value={interruptReason}
                                    onChange={(e) => setInterruptReason(e.target.value)}
                                >
                                    <option value="MEETING">Meeting</option>
                                    <option value="DEPENDENCY">Dependency</option>
                                    <option value="CONTEXT_SWITCH">Context Switch</option>
                                    <option value="FAMILY">Family</option>
                                    <option value="EMOTIONAL_LOAD">Emotional Load</option>
                                    <option value="TECH_ISSUE">Tech Issue</option>
                                    <option value="UNPLANNED_REQUEST">Unplanned Request</option>
                                </select>
                                <button
                                    onClick={handleInterrupt}
                                    className="w-full bg-red-100 text-red-700 py-1 rounded hover:bg-red-200"
                                >
                                    Log Interruption
                                </button>
                            </div>

                            <div className="border p-4 rounded space-y-3">
                                <h4 className="font-semibold text-sm">Complete</h4>
                                <input
                                    type="text"
                                    placeholder="Outcome (optional)"
                                    className="w-full border p-1"
                                    value={endOutcome}
                                    onChange={(e) => setEndOutcome(e.target.value)}
                                />

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500">Duration</label>
                                    <select
                                        className="w-full border p-1 bg-white"
                                        value={useExact ? "exact" : selectedDuration}
                                        onChange={(e) => {
                                            if (e.target.value === "exact") setUseExact(true);
                                            else {
                                                setUseExact(false);
                                                setSelectedDuration(Number(e.target.value));
                                            }
                                        }}
                                    >
                                        <option disabled>-- Select Approximate --</option>
                                        {DURATION_BUCKETS.map(b => (
                                            <option key={b.value} value={b.value}>{b.label}</option>
                                        ))}
                                        <option disabled>-- OR --</option>
                                        <option value="exact">Exact / Use Suggested</option>
                                    </select>
                                </div>

                                {useExact && (
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            placeholder="Mins"
                                            className="w-full border p-1"
                                            value={exactDuration}
                                            onChange={(e) => setExactDuration(e.target.value)}
                                        />
                                        <button
                                            className="text-xs underline text-blue-600 whitespace-nowrap"
                                            onClick={() => setExactDuration(String(suggestedMinutes))}
                                        >
                                            Use {suggestedMinutes}m
                                        </button>
                                    </div>
                                )}

                                <button
                                    onClick={handleEnd}
                                    className="w-full bg-blue-600 text-white py-1 rounded hover:bg-blue-700"
                                >
                                    Finish Block
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <h3 className="font-semibold">Start New Block</h3>
                        <div className="space-y-2">
                            <input
                                className="w-full border p-2"
                                placeholder="What are you focusing on?"
                                value={newIntent}
                                onChange={(e) => setNewIntent(e.target.value)}
                            />
                            <input
                                className="w-full border p-2"
                                placeholder="Notes (optional)"
                                value={newNotes}
                                onChange={(e) => setNewNotes(e.target.value)}
                            />
                            <button
                                onClick={handleStartBlock}
                                disabled={!newIntent}
                                className="bg-slate-800 text-white px-6 py-2 rounded hover:bg-slate-700 disabled:opacity-50"
                            >
                                Start Focus
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* Metrics Summary */}
            <section className="grid grid-cols-4 gap-4 text-center">
                <div className="bg-gray-100 p-2 rounded">
                    <div className="text-2xl font-bold">{data.metrics.totalBlocks}</div>
                    <div className="text-xs text-gray-500 uppercase">Total Blocks</div>
                </div>
                <div className="bg-gray-100 p-2 rounded">
                    <div className="text-2xl font-bold">{data.metrics.focusBlocks}</div>
                    <div className="text-xs text-gray-500 uppercase">Focus</div>
                </div>
                <div className="bg-gray-100 p-2 rounded">
                    <div className="text-2xl font-bold">{data.metrics.interruptedBlocks}</div>
                    <div className="text-xs text-gray-500 uppercase">Interrupted</div>
                </div>
                <div className="bg-gray-100 p-2 rounded">
                    <div className="text-lg font-bold truncate px-1">
                        {data.metrics.totalActiveLabel || "-"}
                    </div>
                    <div className="text-xs text-gray-500 uppercase">Active Time</div>
                </div>
            </section>

            {/* Recent Blocks Table */}
            <section>
                <h3 className="font-bold mb-2">Today's Log</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                            <tr>
                                <th className="p-2">Intent</th>
                                <th className="p-2">Outcome</th>
                                <th className="p-2">Duration</th>
                                <th className="p-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.blocks.map((b) => (
                                <tr key={b.blockId} className="border-b">
                                    <td className="p-2 font-medium">{b.intent}</td>
                                    <td className="p-2 text-gray-600">{b.actualOutcome || "-"}</td>
                                    <td className="p-2">
                                        {b.durationLabel || "-"}
                                    </td>
                                    <td className="p-2">
                                        {b.interrupted ? (
                                            <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs">
                                                {b.reasonCode}
                                            </span>
                                        ) : b.durationMinutes ? (
                                            <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs">
                                                Done
                                            </span>
                                        ) : (
                                            <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs animate-pulse">
                                                Active
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {data.blocks.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-4 text-center text-gray-400">
                                        No blocks logged yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
