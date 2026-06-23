import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function ProjectsDashboard() {
    const [dashboards, setDashboards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.reports.getProjectsDashboard()
            .then(res => setDashboards(res.items))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-4 text-center">Loading Projects...</div>;

    return (
        <div className="p-4 max-w-4xl mx-auto space-y-8">
            <header className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Projects Dashboard</h1>
                <Link to="/project" className="text-sm border px-3 py-1 rounded hover:bg-gray-100">
                    Manage Projects
                </Link>
            </header>

            {dashboards.length === 0 ? (
                <div className="text-center text-gray-500 py-10 border rounded bg-gray-50">
                    No active projects found.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dashboards.map(p => (
                        <div key={p.id} className="border p-6 rounded-lg shadow-sm hover:shadow-md transition">
                            <h2 className="text-xl font-bold mb-1">{p.name}</h2>
                            {p.description && <p className="text-gray-500 text-sm mb-4 line-clamp-2">{p.description}</p>}
                            
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-blue-50 p-3 rounded">
                                    <div className="text-xs text-blue-600 uppercase font-semibold">Total Focus</div>
                                    <div className="text-2xl font-bold">{p.metrics.focusBlocks} <span className="text-sm font-normal text-gray-500">blocks</span></div>
                                </div>
                                <div className="bg-gray-50 p-3 rounded">
                                    <div className="text-xs text-gray-600 uppercase font-semibold">Active Time</div>
                                    <div className="text-2xl font-bold">{p.metrics.totalActiveLabel || "~0 mins"}</div>
                                </div>
                                <div className="bg-gray-50 p-3 rounded">
                                    <div className="text-xs text-gray-600 uppercase font-semibold">Blocks</div>
                                    <div className="text-2xl font-bold">{p.metrics.totalBlocks}</div>
                                </div>
                                <div className="bg-red-50 p-3 rounded">
                                    <div className="text-xs text-red-600 uppercase font-semibold">Fragmentation</div>
                                    <div className="text-2xl font-bold">
                                        {Math.round(p.metrics.fragmentationRate * 100)}<span className="text-sm font-normal text-gray-500">%</span>
                                    </div>
                                </div>
                            </div>

                            <Link 
                                to={`/projects/${p.id}/data`}
                                className="inline-block w-full text-center bg-gray-900 text-white py-2 rounded font-medium hover:bg-black transition-colors"
                            >
                                View Data Deep Dive
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
