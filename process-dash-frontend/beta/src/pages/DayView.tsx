import { useState, useEffect, useCallback } from "react";
import { api, type DayRollup } from "../api/client";
import { useDataRefresh } from "../hooks/useDataRefresh";
import {
    Badge,
    EmptyState,
    Loading,
    MetricCard,
    PageHeader,
    Section,
} from "../components/ui";

export default function DayView() {
    const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [data, setData] = useState<DayRollup | null>(null);

    const refresh = useCallback(() => {
        api.reports.getDay(date).then(setData).catch(console.error);
    }, [date]);

    useDataRefresh(refresh);

    useEffect(() => {
        refresh();
    }, [refresh]);

    if (!data) return <Loading text="Loading daily report…" />;

    return (
        <div style={{ padding: "28px 32px", maxWidth: 960, margin: "0 auto" }}>
            <PageHeader
                title="Daily Report"
                sub={date}
                right={
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        style={{
                            background: "var(--surface-2)",
                            border: "1px solid var(--border)",
                            color: "var(--text)",
                            borderRadius: 6,
                            padding: "6px 10px",
                            fontSize: 13,
                            fontFamily: "inherit",
                        }}
                    />
                }
            />

            {/* Metrics Grid */}
            <Section title="Metrics">
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                        gap: 12,
                    }}
                >
                    <MetricCard label="Total Blocks" value={data.metrics.totalBlocks} />
                    <MetricCard label="Focus Blocks" value={data.metrics.focusBlocks} accent />
                    <MetricCard
                        label="Interrupted"
                        value={data.metrics.interruptedBlocks}
                        sub={`${Math.round(data.metrics.fragmentationRate * 100)}% Rate`}
                        danger={data.metrics.interruptedBlocks > 0}
                    />
                    <MetricCard label="Active Time" value={data.metrics.totalActiveLabel || "-"} />
                    <MetricCard label="Recovery" value={data.metrics.totalRecoveryLabel || "-"} warn />
                    {data.metrics.todosCompleted !== undefined && (
                        <MetricCard
                            label="Todos Done"
                            value={`${data.metrics.todosCompleted} / ${data.metrics.todosAdded ?? 0}`}
                            sub="completed today"
                        />
                    )}
                </div>
            </Section>

            {/* Blocks Table */}
            <Section title="Work Blocks">
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
                                {["Intent", "Notes", "Outcome", "Duration", "Status"].map((h, i) => (
                                    <th
                                        key={h}
                                        style={{
                                            padding: "10px 14px",
                                            textAlign: i === 3 ? "right" : "left",
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
                            {data.blocks.map((b) => (
                                <tr
                                    key={b.blockId}
                                    style={{
                                        borderBottom: "1px solid var(--border)",
                                        transition: "background 0.1s",
                                    }}
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
                                            color: "var(--text-3)",
                                            maxWidth: 200,
                                        }}
                                    >
                                        {b.notes || "-"}
                                    </td>
                                    <td style={{ padding: "10px 14px", color: "var(--text-2)" }}>
                                        {b.actualOutcome || "-"}
                                    </td>
                                    <td
                                        className="mono"
                                        style={{
                                            padding: "10px 14px",
                                            textAlign: "right",
                                            color: "var(--text-2)",
                                        }}
                                    >
                                        {b.durationLabel || "-"}
                                    </td>
                                    <td style={{ padding: "10px 14px" }}>
                                        {b.interrupted ? (
                                            <Badge variant="red">{b.reasonCode}</Badge>
                                        ) : (
                                            <span style={{ color: "var(--text-3)" }}>—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {data.blocks.length === 0 && (
                                <tr>
                                    <td colSpan={5}>
                                        <EmptyState
                                            icon="·"
                                            title="No activity recorded"
                                            sub={`Nothing logged for ${date}`}
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Section>
        </div>
    );
}
