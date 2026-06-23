import { useState, useEffect } from "react";
import { api, type SprintDefinition, type SprintRollup, type WeeklySummaryRequest } from "../api/client";
import {
    Badge,
    Button,
    Card,
    EmptyState,
    Loading,
    MetricCard,
    PageHeader,
    Section,
    Select,
    Textarea,
    Input,
    Divider,
} from "../components/ui";

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

    if (loading && !data) return <Loading text="Loading sprint report…" />;

    return (
        <div style={{ padding: "28px 32px", maxWidth: 960, margin: "0 auto", paddingBottom: 80 }}>
            <PageHeader
                title="Sprint Report"
                right={
                    <select
                        value={selectedSprintId}
                        onChange={(e) => setSelectedSprintId(e.target.value)}
                        style={{
                            background: "var(--surface-2)",
                            border: "1px solid var(--border)",
                            color: "var(--text)",
                            borderRadius: 6,
                            padding: "6px 10px",
                            fontSize: 13,
                            fontFamily: "inherit",
                            minWidth: 260,
                        }}
                    >
                        {sprints.length === 0 && <option value="">No sprints</option>}
                        {sprints.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name} ({s.startDate} to {s.endDate})
                            </option>
                        ))}
                    </select>
                }
            />

            {error && (
                <div
                    style={{
                        background: "var(--red-bg)",
                        border: "1px solid rgba(248,113,113,0.2)",
                        color: "var(--red)",
                        padding: "12px 16px",
                        borderRadius: 8,
                        fontSize: 13,
                        marginBottom: 24,
                    }}
                >
                    Error: {error}
                </div>
            )}

            {data && (
                <>
                    {/* Metrics Grid */}
                    <Section title="Sprint Metrics">
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                                gap: 12,
                            }}
                        >
                            <MetricCard label="Active Work" value={data?.metrics?.totalActiveLabel || "-"} accent />
                            <MetricCard label="Total Blocks" value={data?.metrics?.totalBlocks || 0} />
                            <MetricCard
                                label="Interrupted"
                                value={data?.metrics?.interruptedBlocks || 0}
                                sub={`${Math.round((data?.metrics?.fragmentationRate || 0) * 100)}% Rate`}
                                danger={(data?.metrics?.interruptedBlocks || 0) > 0}
                            />
                            <MetricCard label="Focus Blocks" value={data?.metrics?.focusBlocks || 0} />
                            <MetricCard label="Recovery" value={data?.metrics?.totalRecoveryLabel || "-"} warn />
                            {data?.metrics?.todosCompleted !== undefined && (
                                <MetricCard label="Todos Done" value={data.metrics.todosCompleted} sub="this sprint" />
                            )}
                        </div>
                    </Section>

                    {/* Fragmenters Table */}
                    <Section title="Top Sources of Fragmentation">
                        {(!data?.metrics?.topFragmenters || data.metrics.topFragmenters.length === 0) ? (
                            <EmptyState
                                icon="✓"
                                title="No interruptions recorded"
                                sub="Clean sprint — no fragmentation sources found."
                            />
                        ) : (
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
                                            <th
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
                                                Code
                                            </th>
                                            <th
                                                style={{
                                                    padding: "10px 14px",
                                                    textAlign: "right",
                                                    width: 96,
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    letterSpacing: "0.06em",
                                                    textTransform: "uppercase",
                                                    color: "var(--text-3)",
                                                }}
                                            >
                                                Count
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.metrics.topFragmenters.map(f => (
                                            <tr
                                                key={f.code}
                                                style={{ borderBottom: "1px solid var(--border)" }}
                                            >
                                                <td style={{ padding: "10px 14px", color: "var(--text)" }}>
                                                    <Badge variant="red">{f.code}</Badge>
                                                </td>
                                                <td
                                                    className="mono"
                                                    style={{
                                                        padding: "10px 14px",
                                                        textAlign: "right",
                                                        color: "var(--text-2)",
                                                    }}
                                                >
                                                    {f.count}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Section>

                    {/* Reflection Form */}
                    <Section title="Weekly Reflection">
                        <Card style={{ padding: 24 }}>
                            {/* Fragmenter tags */}
                            <div style={{ marginBottom: 20 }}>
                                <div
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 500,
                                        color: "var(--text-2)",
                                        marginBottom: 8,
                                    }}
                                >
                                    Which fragmenters were systemic issues?
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
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
                                            style={{
                                                padding: "4px 10px",
                                                borderRadius: 4,
                                                fontSize: 12,
                                                fontWeight: 600,
                                                cursor: "pointer",
                                                fontFamily: "inherit",
                                                border: selectedFrag.includes(f.code)
                                                    ? "1px solid rgba(248,113,113,0.4)"
                                                    : "1px solid var(--border-2)",
                                                background: selectedFrag.includes(f.code)
                                                    ? "var(--red-bg)"
                                                    : "var(--surface-3)",
                                                color: selectedFrag.includes(f.code)
                                                    ? "var(--red)"
                                                    : "var(--text-2)",
                                                transition: "all 0.15s",
                                            }}
                                        >
                                            {f.code}
                                        </button>
                                    ))}
                                </div>
                                {data.metrics.topFragmenters.length === 0 && (
                                    <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                                        No fragmenters to select.
                                    </span>
                                )}
                            </div>

                            <Divider />

                            {/* Non-performance issues */}
                            <div style={{ marginBottom: 20 }}>
                                <Textarea
                                    label="What slowed you down but was NOT a performance issue?"
                                    rows={4}
                                    value={notPerfIssues}
                                    onChange={e => setNotPerfIssues(e.target.value)}
                                    placeholder="- Staging environment down for 2h..."
                                />
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: "var(--text-3)",
                                        marginTop: 4,
                                    }}
                                >
                                    E.g. environment instability, lack of clarity, waiting on reviews. One per line.
                                </div>
                            </div>

                            {/* Structural change */}
                            <div style={{ marginBottom: 20 }}>
                                <Input
                                    label="One structural change for next sprint?"
                                    type="text"
                                    value={oneChange}
                                    onChange={e => setOneChange(e.target.value)}
                                    placeholder="e.g. Block calendars Tue/Thu morning…"
                                />
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <Button variant="primary" onClick={handleSave}>
                                    Save Summary
                                </Button>
                                {saved && (
                                    <span style={{ fontSize: 13, color: "var(--green)", fontWeight: 600 }}>
                                        Saved successfully!
                                    </span>
                                )}
                            </div>
                        </Card>
                    </Section>
                </>
            )}

            {data && (data.metrics?.totalBlocks || 0) === 0 && !error && (
                <EmptyState
                    icon="·"
                    title="No blocks recorded for this sprint"
                    sub='Go to "Today" to start tracking your work.'
                />
            )}
        </div>
    );
}
