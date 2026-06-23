import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api, type Block } from "../api/client";
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

    if (loading) return <Loading text="Loading project data…" />;
    if (!data || !data.id) return (
        <div style={{ padding: "28px 32px", maxWidth: 960, margin: "0 auto" }}>
            <div style={{ color: "var(--red)", fontSize: 13 }}>Project data not found.</div>
        </div>
    );

    // Group blocks by date
    const blocksByDate = data.blocks.reduce((acc: any, b: Block) => {
        if (!acc[b.date]) acc[b.date] = [];
        acc[b.date].push(b);
        return acc;
    }, {});

    // Sort dates descending
    const datesDesc = Object.keys(blocksByDate).sort((a, b) => b.localeCompare(a));

    return (
        <div style={{ padding: "28px 32px", maxWidth: 960, margin: "0 auto" }}>
            <PageHeader
                title={`Data View: ${data.name}`}
                right={
                    <Link to="/projects/dashboard" style={{ textDecoration: "none" }}>
                        <Button variant="ghost" size="sm">
                            &larr; Back
                        </Button>
                    </Link>
                }
            />

            {/* Lifetime Metrics */}
            <Section title="Lifetime Metrics">
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                        gap: 12,
                    }}
                >
                    <MetricCard label="Total Blocks" value={data.metrics.totalBlocks} />
                    <MetricCard label="Focus Blocks" value={data.metrics.focusBlocks} accent />
                    <MetricCard label="Active Time" value={data.metrics.totalActiveLabel || "-"} />
                    <MetricCard
                        label="Fragmentation"
                        value={`${Math.round(data.metrics.fragmentationRate * 100)}%`}
                        danger={data.metrics.fragmentationRate > 0.3}
                        warn={data.metrics.fragmentationRate > 0.15 && data.metrics.fragmentationRate <= 0.3}
                    />
                </div>
            </Section>

            {/* Event Timeline */}
            <Section title="Event Timeline">
                {datesDesc.length === 0 ? (
                    <EmptyState
                        icon="·"
                        title="No blocks logged yet"
                        sub="No blocks have been logged for this project yet."
                    />
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        {datesDesc.map(d => (
                            <div key={d}>
                                <div
                                    style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: "var(--text-2)",
                                        marginBottom: 8,
                                        paddingBottom: 6,
                                        borderBottom: "1px solid var(--border)",
                                        position: "sticky",
                                        top: 0,
                                        background: "var(--bg)",
                                        zIndex: 1,
                                    }}
                                >
                                    {d}
                                </div>
                                <div
                                    style={{
                                        border: "1px solid var(--border)",
                                        borderRadius: 8,
                                        overflow: "hidden",
                                    }}
                                >
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                        <thead>
                                            <tr
                                                style={{
                                                    background: "var(--surface-2)",
                                                    borderBottom: "1px solid var(--border)",
                                                }}
                                            >
                                                {["Intent", "Outcome", "Duration", "Status"].map((h) => (
                                                    <th
                                                        key={h}
                                                        style={{
                                                            padding: "10px 14px",
                                                            textAlign: "left",
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            letterSpacing: "0.06em",
                                                            textTransform: "uppercase",
                                                            color: "var(--text-3)",
                                                        }}
                                                    >
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {blocksByDate[d].map((b: Block) => (
                                                <tr
                                                    key={b.blockId}
                                                    style={{ borderBottom: "1px solid var(--border)" }}
                                                    onMouseEnter={(e) =>
                                                        (e.currentTarget.style.background = "var(--surface-2)")
                                                    }
                                                    onMouseLeave={(e) =>
                                                        (e.currentTarget.style.background = "transparent")
                                                    }
                                                >
                                                    <td
                                                        style={{
                                                            padding: "10px 14px",
                                                            fontWeight: 500,
                                                            color: "var(--text)",
                                                        }}
                                                    >
                                                        {b.intent}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: "10px 14px",
                                                            color: "var(--text-2)",
                                                        }}
                                                    >
                                                        {b.actualOutcome || "-"}
                                                    </td>
                                                    <td
                                                        className="mono"
                                                        style={{
                                                            padding: "10px 14px",
                                                            color: "var(--text-2)",
                                                        }}
                                                    >
                                                        {b.durationLabel || "-"}
                                                    </td>
                                                    <td style={{ padding: "10px 14px" }}>
                                                        {b.interrupted ? (
                                                            <Badge variant="red">{b.reasonCode}</Badge>
                                                        ) : (
                                                            <Badge variant="green">Done</Badge>
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
            </Section>
        </div>
    );
}
