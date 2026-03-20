import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api, type Block } from "../api/client";

export default function ProjectDataView() {
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        api.reports.getProjectData(id)
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="p-4 text-center">Loading Data...</div>;
    if (!data || !data.id) return <div className="p-4 text-center text-red-500">Project data not found.</div>;

    // Group blocks by date
    const blocksByDate = data.blocks.reduce((acc: any, b: Block) => {
        if (!acc[b.date]) acc[b.date] = [];
        acc[b.date].push(b);
        return acc;
    }, {});
    
    // Sort dates descending
    const datesDesc = Object.keys(blocksByDate).sort((a, b) => b.localeCompare(a));

    return (
        <div className="p-4 max-w-4xl mx-auto space-y-8">
            <header className="flex items-center gap-4">
                <Link to="/projects/dashboard" className="text-gray-500 hover:text-black">
                    &larr; Back
                </Link>
                <h1 className="text-2xl font-bold">Data View: {data.name}</h1>
            </header>

            <section className="bg-gray-50 p-6 rounded-lg border">
                <h2 className="text-lg font-bold mb-4">Lifetime Metrics</h2>
                <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="bg-white p-3 rounded shadow-sm">
                        <div className="text-xs text-gray-500 uppercase">Total Blocks</div>
                        <div className="text-2xl font-bold">{data.metrics.totalBlocks}</div>
                    </div>
                    <div className="bg-white p-3 rounded shadow-sm">
                        <div className="text-xs text-gray-500 uppercase">Focus</div>
                        <div className="text-2xl font-bold text-blue-600">{data.metrics.focusBlocks}</div>
                    </div>
                    <div className="bg-white p-3 rounded shadow-sm">
                        <div className="text-xs text-gray-500 uppercase">Active Time</div>
                        <div className="text-xl font-bold pt-1">{data.metrics.totalActiveLabel || "-"}</div>
                    </div>
                    <div className="bg-white p-3 rounded shadow-sm text-red-700">
                        <div className="text-xs uppercase font-medium">Fragmentation</div>
                        <div className="text-2xl font-bold">{Math.round(data.metrics.fragmentationRate * 100)}%</div>
                    </div>
                </div>
            </section>

            <section>
                <h2 className="text-xl font-bold mb-4 border-b pb-2">Event Timeline</h2>
                {datesDesc.length === 0 ? (
                    <div className="text-center text-gray-500 py-8 bg-gray-50 rounded">
                        No blocks have been logged for this project yet.
                    </div>
                ) : (
                    <div className="space-y-8">
                        {datesDesc.map(d => (
                            <div key={d} className="space-y-3">
                                <h3 className="font-semibold text-lg sticky top-0 bg-white py-1">{d}</h3>
                                <div className="bg-white border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-600">
                                            <tr>
                                                <th className="p-3">Intent</th>
                                                <th className="p-3">Outcome</th>
                                                <th className="p-3">Duration</th>
                                                <th className="p-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {blocksByDate[d].map((b: Block) => (
                                                <tr key={b.blockId} className="border-t">
                                                    <td className="p-3 font-medium">{b.intent}</td>
                                                    <td className="p-3 text-gray-600">{b.actualOutcome || "-"}</td>
                                                    <td className="p-3">{b.durationLabel || "-"}</td>
                                                    <td className="p-3">
                                                        {b.interrupted ? (
                                                            <span className="text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded text-xs">
                                                                {b.reasonCode}
                                                            </span>
                                                        ) : (
                                                            <span className="text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded text-xs">
                                                                Done
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
