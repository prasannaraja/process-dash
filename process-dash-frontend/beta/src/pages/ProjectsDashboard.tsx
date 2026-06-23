import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import {
    Badge,
    Button,
    Card,
    EmptyState,
    Loading,
    MetricCard,
    PageHeader,
    Section,
} from "../components/ui";

export default function ProjectsDashboard() {
    const [dashboards, setDashboards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.reports.getProjectsDashboard()
            .then(res => setDashboards(res.items))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Loading text="Loading projects…" />;

    return (
        <div style={{ padding: "28px 32px", maxWidth: 960, margin: "0 auto" }}>
            <PageHeader
                title="Projects Dashboard"
                right={
                    <Link to="/project" style={{ textDecoration: "none" }}>
                        <Button variant="secondary" size="sm">
                            Manage Projects
                        </Button>
                    </Link>
                }
            />

            {dashboards.length === 0 ? (
                <EmptyState
                    icon="·"
                    title="No active projects found"
                    sub="Create a project in the project settings to get started."
                />
            ) : (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
                        gap: 16,
                    }}
                >
                    {dashboards.map(p => (
                        <Card key={p.id} style={{ padding: 20 }}>
                            <div style={{ marginBottom: 4 }}>
                                <div
                                    style={{
                                        fontSize: 15,
                                        fontWeight: 600,
                                        color: "var(--text)",
                                    }}
                                >
                                    {p.name}
                                </div>
                                {p.description && (
                                    <div
                                        style={{
                                            fontSize: 12,
                                            color: "var(--text-3)",
                                            marginTop: 4,
                                            marginBottom: 16,
                                            overflow: "hidden",
                                            display: "-webkit-box",
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: "vertical",
                                        } as React.CSSProperties}
                                    >
                                        {p.description}
                                    </div>
                                )}
                            </div>

                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: 10,
                                    marginBottom: 16,
                                    marginTop: 12,
                                }}
                            >
                                <MetricCard
                                    label="Focus Blocks"
                                    value={p.metrics.focusBlocks}
                                    accent
                                />
                                <MetricCard
                                    label="Active Time"
                                    value={p.metrics.totalActiveLabel || "~0 mins"}
                                />
                                <MetricCard
                                    label="Total Blocks"
                                    value={p.metrics.totalBlocks}
                                />
                                <MetricCard
                                    label="Fragmentation"
                                    value={`${Math.round(p.metrics.fragmentationRate * 100)}%`}
                                    danger={p.metrics.fragmentationRate > 0.3}
                                    warn={p.metrics.fragmentationRate > 0.15 && p.metrics.fragmentationRate <= 0.3}
                                />
                            </div>

                            <Link to={`/projects/${p.id}/data`} style={{ textDecoration: "none" }}>
                                <Button variant="primary" style={{ width: "100%", justifyContent: "center" }}>
                                    View Data Deep Dive
                                </Button>
                            </Link>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
