import { useState, useEffect } from "react";
import { api, type SprintDefinition, type SprintRollup, type DayRollup } from "../api/client";
import {
    Badge,
    Card,
    EmptyState,
    Loading,
    MetricCard,
    PageHeader,
    Section,
    Divider,
} from "../components/ui";

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
    const [sprints, setSprints] = useState<SprintDefinition[]>([]);
    const [selectedSprintId, setSelectedSprintId] = useState("");
    const [weekData, setWeekData] = useState<SprintRollup | null>(null);
    const [daysData, setDaysData] = useState<DayRollup[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedImprovements, setSelectedImprovements] = useState<string[]>([]);

    useEffect(() => {
        const loadSprints = async () => {
            setLoading(true);
            try {
                const sprintsRes = await api.sprints.list();
                const items = sprintsRes.items || [];
                setSprints(items);
                if (items.length > 0) {
                    setSelectedSprintId(items[0].id);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        loadSprints();
    }, []);

    useEffect(() => {
        if (!selectedSprintId) return;
        loadData(selectedSprintId);
    }, [selectedSprintId]);

    const loadData = async (sprintId: string) => {
        setLoading(true);
        try {
            const weekRes = await api.sprints.getRollup(sprintId);
            setWeekData(weekRes);

            const dates = getDatesInRange(weekRes.startDate, weekRes.endDate);
            const dayPromises = dates.map(d => api.reports.getDay(d).catch(() => null));
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

    if (loading) return <Loading text="Loading retrospective…" />;
    if (!weekData) return (
        <div style={{ padding: "28px 32px", maxWidth: 960, margin: "0 auto" }}>
            <EmptyState icon="·" title="No data found" sub="Select a sprint to view the weekend summary." />
        </div>
    );

    return (
        <div style={{ padding: "28px 32px", maxWidth: 720, margin: "0 auto", paddingBottom: 80 }}>
            <PageHeader
                title="Weekend Summary"
                sub={`${weekData?.startDate} to ${weekData?.endDate} — Designing a better next week, not judging the last one.`}
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
                        }}
                    >
                        {sprints.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                }
            />

            {/* 1. Week at a Glance */}
            <Section title="Week at a Glance">
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                        gap: 12,
                        marginBottom: 8,
                    }}
                >
                    <MetricCard label="Active Work" value={weekData?.metrics?.totalActiveLabel || "~0 mins"} accent />
                    <MetricCard label="Total Blocks" value={weekData?.metrics?.totalBlocks || 0} />
                    <MetricCard label="Recovery" value={weekData?.metrics?.totalRecoveryLabel || "~0 mins"} warn />
                    <MetricCard label="Fragmentation" value={`${Math.round((weekData?.metrics?.fragmentationRate || 0) * 100)}%`} danger={(weekData?.metrics?.fragmentationRate || 0) > 0.3} />
                </div>
                <div style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center", fontStyle: "italic" }}>
                    Approximation of cognitive effort, not hours worked.
                </div>
            </Section>

            {/* 2. Where Energy Went */}
            <Section title="Where Energy Went">
                <Card style={{ padding: 0, overflow: "hidden" }}>
                    {sortedIntents.length === 0 ? (
                        <div style={{ padding: "24px 20px", color: "var(--text-3)", fontStyle: "italic", fontSize: 13 }}>
                            No work recorded.
                        </div>
                    ) : (
                        sortedIntents.map((i, idx) => (
                            <div
                                key={i.name}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "12px 16px",
                                    borderBottom: idx < sortedIntents.length - 1 ? "1px solid var(--border)" : "none",
                                }}
                            >
                                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
                                    {i.name}
                                </span>
                                <div style={{ fontSize: 12, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 8 }}>
                                    <span className="mono">{i.count}</span>
                                    <span style={{ color: "var(--border-2)" }}>·</span>
                                    <span
                                        className="mono"
                                        style={{
                                            background: "var(--surface-3)",
                                            padding: "2px 8px",
                                            borderRadius: 4,
                                            color: "var(--text-2)",
                                        }}
                                    >
                                        {bucketMinutes(i.totalMinutes)}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </Card>
            </Section>

            {/* Recovery Reality */}
            <Section title="Recovery Reality">
                <Card style={{ padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <div
                                className="mono"
                                style={{
                                    fontSize: 24,
                                    fontWeight: 700,
                                    color: "var(--yellow)",
                                }}
                            >
                                {weekData?.metrics?.totalRecoveryLabel || "~0 mins"}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
                                spent on intentional breaks
                            </div>
                        </div>
                        {(weekData?.metrics?.totalRecoveryMinutes || 0) > 0 ? (
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--green)" }}>
                                    Good Job.
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                                    Breaks protect long-term pace.
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--yellow)" }}>
                                    No breaks logged.
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                                    Consider tracking coffee/lunch to normalize rest.
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            </Section>

            {/* 3. Fragmentation Pattern */}
            <Section title="Fragmentation Pattern">
                {weekData?.metrics?.topFragmenters?.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {weekData.metrics.topFragmenters.map((f, i) => (
                            <div
                                key={f.code}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    padding: "12px 16px",
                                    background: "var(--red-bg)",
                                    border: "1px solid rgba(248,113,113,0.15)",
                                    borderRadius: 8,
                                }}
                            >
                                <div
                                    className="mono"
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: "var(--red)",
                                        width: 24,
                                        height: 24,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        background: "var(--surface)",
                                        borderRadius: "50%",
                                        flexShrink: 0,
                                    }}
                                >
                                    {i + 1}
                                </div>
                                <div style={{ fontSize: 13, color: "var(--text)" }}>
                                    <span style={{ fontWeight: 600 }}>{f.code}</span>
                                    <span style={{ color: "var(--text-3)" }}> interrupted {f.count} blocks.</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div
                        style={{
                            background: "var(--green-bg)",
                            border: "1px solid rgba(74,222,128,0.15)",
                            borderRadius: 8,
                            padding: "12px 16px",
                            fontSize: 13,
                            color: "var(--green)",
                        }}
                    >
                        Zero major interruptions recorded. Smooth sailing?
                    </div>
                )}
            </Section>

            {/* 4. Focus Reality Check */}
            <Section title="Focus Reality Check">
                <Card style={{ padding: 20 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                        <div>
                            <div
                                className="mono"
                                style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}
                            >
                                {focusDays.length}{" "}
                                <span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-3)" }}>
                                    days
                                </span>
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                                Allowed deeper focus blocks (30m+)
                            </div>
                        </div>
                        <div>
                            <div
                                className="mono"
                                style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}
                            >
                                {longestBlockMins > 0 ? bucketMinutes(longestBlockMins) : "—"}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                                Longest uninterrupted flow state
                            </div>
                        </div>
                    </div>
                </Card>
            </Section>

            {/* 5. Not A Performance Issue */}
            <Section title="Not A Performance Issue">
                <Card style={{ padding: 20 }}>
                    {weekData?.reflection?.notPerformanceIssues?.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--text-2)", lineHeight: 1.8 }}>
                            {weekData.reflection.notPerformanceIssues.map((issue, i) => (
                                <li key={i}>{issue}</li>
                            ))}
                        </ul>
                    ) : (
                        <div style={{ fontSize: 13, color: "var(--text-3)", fontStyle: "italic" }}>
                            No external blockers logged in weekly reflection.
                        </div>
                    )}
                </Card>
            </Section>

            {/* 6. Structural Wins */}
            <Section title="Structural Wins">
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {wins.map((w, i) => (
                        <div
                            key={i}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                fontSize: 13,
                                color: "var(--text)",
                            }}
                        >
                            <span style={{ color: "var(--green)", fontSize: 16, flexShrink: 0 }}>✓</span>
                            {w}
                        </div>
                    ))}
                </div>
            </Section>

            <Divider style={{ margin: "32px 0 24px" }} />

            {/* 7. Design Next Week */}
            <Section title="Design Next Week">
                <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 16 }}>
                    Pick 1–3 structural changes to try. Don't rely on willpower.
                </div>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                    }}
                >
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
                            style={{
                                textAlign: "left",
                                padding: "14px 16px",
                                borderRadius: 8,
                                fontSize: 13,
                                fontFamily: "inherit",
                                cursor: "pointer",
                                transition: "all 0.15s",
                                border: selectedImprovements.includes(opt)
                                    ? "1px solid rgba(129,140,248,0.4)"
                                    : "1px solid var(--border)",
                                background: selectedImprovements.includes(opt)
                                    ? "var(--accent-bg)"
                                    : "var(--surface)",
                                color: selectedImprovements.includes(opt)
                                    ? "var(--accent)"
                                    : "var(--text-2)",
                            }}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </Section>
        </div>
    );
}

function getDatesInRange(startDate: string, endDate: string): string[] {
    const result: string[] = [];
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
        return result;
    }

    const d = new Date(start);
    while (d <= end) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        result.push(`${y}-${m}-${day}`);
        d.setDate(d.getDate() + 1);
    }

    return result;
}
