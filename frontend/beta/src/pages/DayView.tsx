import { useState, useEffect } from "react";
import { api, DayRollup } from "../api/client";

export default function DayView() {
    const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [data, setData] = useState<DayRollup | null>(null);

    useEffect(() => {
        api.reports.getDay(date).then(setData).catch(console.error);
    }, [date]);

    if (!data) return <div>Loading...</div>;

    return (
        <div className="p-4 max-w-4xl mx-auto space-y-6">
            <header className="flex items-center gap-4">
                <h1 className="text-2xl font-bold">Daily Report</h1>
                <input
                    type="date"
                    className="border p-1 rounded"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                />
            </header>

            {/* Metrics Row */}
            <div className="grid grid-cols-4 gap-4">
                <MetricCard label="Total Blocks" value={data.metrics.totalBlocks} />
                <MetricCard label="Focus Blocks" value={data.metrics.focusBlocks} />
                <MetricCard
                    label="Interrupted"
                    value={data.metrics.interruptedBlocks}
                    sub={`${Math.round(data.metrics.fragmentationRate * 100)}% Rate`}
                />
                <MetricCard label="Active Time" value={data.metrics.totalActiveLabel || "-"} />
            </div>

            {/* Table */}
            <div className="border rounded overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b">
                        <tr>
                            <th className="p-3 text-left">Intent</th>
                            <th className="p-3 text-left">Notes</th>
                            <th className="p-3 text-left">Outcome</th>
                            <th className="p-3 text-right">Duration</th>
                            <th className="p-3 text-left">Interrupted?</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {data.blocks.map((b) => (
                            <tr key={b.blockId} className="hover:bg-gray-50">
                                <td className="p-3 font-medium">{b.intent}</td>
                                <td className="p-3 text-gray-500">{b.notes || "-"}</td>
                                <td className="p-3">{b.actualOutcome || "-"}</td>
                                <td className="p-3 text-right">
                                    {b.durationLabel || "-"}
                                </td>
                                <td className="p-3">
                                    {b.interrupted ? (
                                        <span className="text-red-700 font-semibold text-xs border border-red-200 bg-red-50 px-2 py-1 rounded">
                                            {b.reasonCode}
                                        </span>
                                    ) : (
                                        <span className="text-gray-300">-</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {data.blocks.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500">
                                    No activity recorded for this date.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function MetricCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
    return (
        <div className="border p-4 rounded shadow-sm">
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</div>
            {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
        </div>
    );
}
