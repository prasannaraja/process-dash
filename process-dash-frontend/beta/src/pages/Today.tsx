import { useState, useEffect, useCallback } from "react";
import { api, type DayRollup, type ProjectDefinition } from "../api/client";
import { useDataRefresh } from "../hooks/useDataRefresh";
import {
    Badge,
    Button,
    Card,
    Divider,
    EmptyState,
    Loading,
    MetricCard,
    PageHeader,
    Section,
} from "../components/ui";

// Bucket options for dropdown
const DURATION_BUCKETS = [
    { label: "~15 mins", value: 15 },
    { label: "~30 mins", value: 30 },
    { label: "~1 hour", value: 60 },
    { label: "~2 hours", value: 120 },
    { label: "~½ day (3h)", value: 180 },
    { label: "~1 day (6h)", value: 360 },
];

// Shared input style
const inputStyle: React.CSSProperties = {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: 6,
    padding: "7px 10px",
    fontSize: 13,
    fontFamily: "inherit",
    width: "100%",
};

const selectStyle: React.CSSProperties = {
    ...inputStyle,
};

export default function Today() {
    const [date] = useState(() => new Date().toISOString().split("T")[0]);
    const [data, setData] = useState<DayRollup | null>(null);
    const [intentsInput, setIntentsInput] = useState("");

    // Block Form State
    const [newIntent, setNewIntent] = useState("");
    const [newNotes, setNewNotes] = useState("");
    const [projects, setProjects] = useState<ProjectDefinition[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");

    // Action State
    const [interruptReason, setInterruptReason] = useState("MEETING");
    const [endOutcome, setEndOutcome] = useState("");

    // Recovery State
    const [recoveryMode, setRecoveryMode] = useState(false);
    const [recoveryKind, setRecoveryKind] = useState<"COFFEE" | "LUNCH" | null>(null);
    const [currentRecoveryId, setCurrentRecoveryId] = useState<string | null>(null);

    // Soft Timer State
    const [startedAt, setStartedAt] = useState<Date | null>(null);
    const [suggestedMinutes, setSuggestedMinutes] = useState<number>(0);
    const [selectedDuration, setSelectedDuration] = useState<number>(30); // Default to ~30m
    const [useExact, setUseExact] = useState(false);
    const [exactDuration, setExactDuration] = useState<string>("");

    const refresh = useCallback(() => {
        api.reports.getDay(date).then(setData).catch(console.error);
    }, [date]);

    // Re-fetch when copilot makes changes
    useDataRefresh(refresh);

    useEffect(() => {
        refresh();
        api.projects.list().then(res => {
            const activeProjects = res.items.filter(p => p.isActive);
            setProjects(activeProjects);
            if (activeProjects.length > 0 && !selectedProjectId) {
                setSelectedProjectId(activeProjects[0].id);
            }
        }).catch(console.error);
    }, [date]);

    const handleSetIntents = async () => {
        const intents = intentsInput.split("\n").filter((s) => s.trim());
        await api.intents.setDaily(date, intents);
        refresh();
    };

    const handleStartBlock = async () => {
        if (!newIntent) return;
        await api.blocks.start(date, newIntent, newNotes, selectedProjectId || undefined);
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
        if ((activeBlock || recoveryMode) && startedAt) {
            interval = setInterval(() => {
                const diff = Math.round((new Date().getTime() - startedAt.getTime()) / 60000);
                setSuggestedMinutes(Math.max(1, diff));
            }, 60000);

            // Initial calc
            const diff = Math.round((new Date().getTime() - startedAt.getTime()) / 60000);
            setSuggestedMinutes(Math.max(1, diff));
        }
        return () => clearInterval(interval);
    }, [activeBlock, recoveryMode, startedAt]);

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

    const handleStartRecovery = async (kind: "COFFEE" | "LUNCH") => {
        const res = await api.recovery.start(kind, date);
        setRecoveryMode(true);
        setRecoveryKind(kind);
        setCurrentRecoveryId(res.blockId);
        setStartedAt(new Date());
    };

    const handleEndRecovery = async () => {
        if (!currentRecoveryId) return;

        // Determine minutes
        let finalMinutes = selectedDuration;
        if (useExact && exactDuration) {
            finalMinutes = parseInt(exactDuration);
        }

        await api.recovery.end(currentRecoveryId, finalMinutes);

        // Reset
        setRecoveryMode(false);
        setRecoveryKind(null);
        setCurrentRecoveryId(null);
        setStartedAt(null);
        setUseExact(false);
        refresh();
    };

    const [exportSuccess, setExportSuccess] = useState(false);

    const handleExport = async () => {
        try {
            const blob = await api.export.day(date);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `daily-${date}.md`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setExportSuccess(true);
            setTimeout(() => setExportSuccess(false), 3000);
        } catch (e) {
            console.error(e);
            alert("Export failed");
        }
    };

    if (!data) return <Loading text="Loading today's dashboard…" />;

    return (
        <div style={{ padding: "28px 32px", maxWidth: 800, margin: "0 auto" }}>
            <PageHeader
                title={`Today — ${date}`}
                right={
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {exportSuccess && (
                            <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }}>
                                Exported!
                            </span>
                        )}
                        <Button variant="ghost" size="sm" onClick={handleExport}>
                            Export MD
                        </Button>
                    </div>
                }
            />

            {/* Intents Section */}
            <Section title="Daily Intents">
                <Card style={{ padding: 16 }}>
                    {data.intents.length === 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <textarea
                                rows={5}
                                placeholder="List up to 5 intents (one per line)..."
                                value={intentsInput}
                                onChange={(e) => setIntentsInput(e.target.value)}
                                style={{
                                    ...inputStyle,
                                    resize: "vertical",
                                }}
                            />
                            <Button variant="primary" onClick={handleSetIntents} style={{ alignSelf: "flex-start" }}>
                                Set Intents
                            </Button>
                        </div>
                    ) : (
                        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
                            {data.intents.map((i, idx) => (
                                <li key={idx} style={{ fontSize: 13, color: "var(--text-2)" }}>
                                    {i}
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </Section>

            {/* Active Work / Recovery Section */}
            <Section title={activeBlock ? "Active Block" : recoveryMode ? "Break In Progress" : "Start Work"}>
                {activeBlock ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {/* Active block header */}
                        <Card
                            style={{
                                padding: 16,
                                background: "var(--green-bg)",
                                border: "1px solid rgba(74,222,128,0.2)",
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div>
                                    <div
                                        style={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            letterSpacing: "0.08em",
                                            textTransform: "uppercase",
                                            color: "var(--green)",
                                            marginBottom: 4,
                                        }}
                                    >
                                        Now Focusing On
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 18,
                                            fontWeight: 500,
                                            color: "var(--text)",
                                        }}
                                    >
                                        {activeBlock.intent}
                                    </div>
                                </div>
                                {startedAt && (
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                                            Started at{" "}
                                            {startedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </div>
                                        <div
                                            className="mono"
                                            style={{
                                                fontSize: 22,
                                                fontWeight: 700,
                                                color: "var(--green)",
                                            }}
                                        >
                                            ~{suggestedMinutes}m
                                        </div>
                                    </div>
                                )}
                            </div>
                            {activeBlock.notes && (
                                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 8 }}>
                                    {activeBlock.notes}
                                </div>
                            )}
                        </Card>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            {/* Interrupt Panel */}
                            <Card style={{ padding: 16 }}>
                                <div
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: "var(--text-2)",
                                        marginBottom: 10,
                                    }}
                                >
                                    Interrupt
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    <select
                                        style={selectStyle}
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
                                    <Button variant="danger" onClick={handleInterrupt} style={{ width: "100%", justifyContent: "center" }}>
                                        Log Interruption
                                    </Button>
                                </div>
                            </Card>

                            {/* Complete Panel */}
                            <Card style={{ padding: 16 }}>
                                <div
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: "var(--text-2)",
                                        marginBottom: 10,
                                    }}
                                >
                                    Complete
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    <input
                                        type="text"
                                        placeholder="Outcome (optional)"
                                        style={inputStyle}
                                        value={endOutcome}
                                        onChange={(e) => setEndOutcome(e.target.value)}
                                    />

                                    <div>
                                        <div
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 500,
                                                color: "var(--text-3)",
                                                marginBottom: 4,
                                            }}
                                        >
                                            Duration
                                        </div>
                                        <select
                                            style={selectStyle}
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
                                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                            <input
                                                type="number"
                                                placeholder="Mins"
                                                style={{ ...inputStyle, flex: 1 }}
                                                value={exactDuration}
                                                onChange={(e) => setExactDuration(e.target.value)}
                                            />
                                            <button
                                                style={{
                                                    background: "none",
                                                    border: "none",
                                                    color: "var(--accent)",
                                                    cursor: "pointer",
                                                    fontSize: 12,
                                                    fontFamily: "inherit",
                                                    textDecoration: "underline",
                                                    whiteSpace: "nowrap",
                                                    padding: 0,
                                                }}
                                                onClick={() => setExactDuration(String(suggestedMinutes))}
                                            >
                                                Use {suggestedMinutes}m
                                            </button>
                                        </div>
                                    )}

                                    <Button variant="primary" onClick={handleEnd} style={{ width: "100%", justifyContent: "center" }}>
                                        Finish Block
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    </div>
                ) : recoveryMode ? (
                    <Card
                        style={{
                            padding: 20,
                            background: "var(--yellow-bg)",
                            border: "1px solid rgba(251,191,36,0.2)",
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                            <div>
                                <div
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        letterSpacing: "0.08em",
                                        textTransform: "uppercase",
                                        color: "var(--yellow)",
                                        marginBottom: 4,
                                    }}
                                >
                                    Recovery In Progress
                                </div>
                                <div style={{ fontSize: 18, fontWeight: 500, color: "var(--text)" }}>
                                    {recoveryKind === "COFFEE" ? "Coffee Break" : "Lunch Break"}
                                </div>
                            </div>
                            {startedAt && (
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                                        Started at{" "}
                                        {startedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </div>
                                    <div
                                        className="mono"
                                        style={{
                                            fontSize: 22,
                                            fontWeight: 700,
                                            color: "var(--yellow)",
                                        }}
                                    >
                                        ~{suggestedMinutes}m
                                    </div>
                                </div>
                            )}
                        </div>

                        <Divider style={{ borderColor: "rgba(251,191,36,0.2)" }} />

                        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 12 }}>
                            <div>
                                <div
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 500,
                                        color: "var(--text-3)",
                                        marginBottom: 4,
                                    }}
                                >
                                    Duration
                                </div>
                                <select
                                    style={selectStyle}
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
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <input
                                        type="number"
                                        placeholder="Mins"
                                        style={{ ...inputStyle, flex: 1 }}
                                        value={exactDuration}
                                        onChange={(e) => setExactDuration(e.target.value)}
                                    />
                                    <button
                                        style={{
                                            background: "none",
                                            border: "none",
                                            color: "var(--accent)",
                                            cursor: "pointer",
                                            fontSize: 12,
                                            fontFamily: "inherit",
                                            textDecoration: "underline",
                                            whiteSpace: "nowrap",
                                            padding: 0,
                                        }}
                                        onClick={() => setExactDuration(String(suggestedMinutes))}
                                    >
                                        Use {suggestedMinutes}m
                                    </button>
                                </div>
                            )}

                            <Button
                                variant="secondary"
                                onClick={handleEndRecovery}
                                style={{ width: "100%", justifyContent: "center" }}
                            >
                                Finish Break
                            </Button>
                        </div>
                    </Card>
                ) : (
                    <Card style={{ padding: 16 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <input
                                style={inputStyle}
                                placeholder="What are you focusing on?"
                                value={newIntent}
                                onChange={(e) => setNewIntent(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && newIntent) handleStartBlock();
                                }}
                            />
                            {projects.length > 0 && (
                                <select
                                    style={selectStyle}
                                    value={selectedProjectId}
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                >
                                    <option value="" disabled>Select Project...</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            )}
                            <input
                                style={inputStyle}
                                placeholder="Notes (optional)"
                                value={newNotes}
                                onChange={(e) => setNewNotes(e.target.value)}
                            />
                            <div style={{ display: "flex", gap: 8 }}>
                                <Button
                                    variant="primary"
                                    onClick={handleStartBlock}
                                    disabled={!newIntent}
                                    style={{ flex: 1, justifyContent: "center" }}
                                >
                                    Start Focus
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => handleStartRecovery("COFFEE")}
                                    style={{
                                        background: "var(--yellow-bg)",
                                        border: "1px solid rgba(251,191,36,0.2)",
                                        color: "var(--yellow)",
                                    }}
                                >
                                    Coffee
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => handleStartRecovery("LUNCH")}
                                    style={{
                                        background: "var(--yellow-bg)",
                                        border: "1px solid rgba(251,191,36,0.2)",
                                        color: "var(--yellow)",
                                    }}
                                >
                                    Lunch
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}
            </Section>

            {/* Metrics Summary */}
            <Section title="Today's Stats">
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
                        danger={data.metrics.interruptedBlocks > 0}
                    />
                    <MetricCard label="Active Time" value={data.metrics.totalActiveLabel || "-"} />
                    <MetricCard label="Recovery" value={data.metrics.totalRecoveryLabel || "-"} warn />
                </div>
            </Section>

            {/* Today's Log Table */}
            <Section title="Today's Log">
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
                            {data.blocks.map((b) => (
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
                                    <td style={{ padding: "10px 14px", color: "var(--text-2)" }}>
                                        {b.actualOutcome || "-"}
                                    </td>
                                    <td
                                        className="mono"
                                        style={{ padding: "10px 14px", color: "var(--text-2)" }}
                                    >
                                        {b.durationLabel || "-"}
                                    </td>
                                    <td style={{ padding: "10px 14px" }}>
                                        {b.interrupted ? (
                                            <Badge variant="red">{b.reasonCode}</Badge>
                                        ) : b.durationMinutes ? (
                                            <Badge variant="green">Done</Badge>
                                        ) : (
                                            <Badge variant="accent">Active</Badge>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {(data as any).recoveryBlocks?.map((b: any) => (
                                <tr
                                    key={b.blockId}
                                    style={{
                                        borderBottom: "1px solid var(--border)",
                                        background: "rgba(251,191,36,0.04)",
                                    }}
                                    onMouseEnter={(e) =>
                                        (e.currentTarget.style.background = "var(--surface-2)")
                                    }
                                    onMouseLeave={(e) =>
                                        (e.currentTarget.style.background = "rgba(251,191,36,0.04)")
                                    }
                                >
                                    <td
                                        style={{
                                            padding: "10px 14px",
                                            fontWeight: 500,
                                            color: "var(--yellow)",
                                        }}
                                    >
                                        {b.kind === "COFFEE" ? "Coffee Break" : "Lunch Break"}
                                    </td>
                                    <td style={{ padding: "10px 14px", color: "var(--text-3)", fontStyle: "italic" }}>
                                        Recovery
                                    </td>
                                    <td
                                        className="mono"
                                        style={{
                                            padding: "10px 14px",
                                            color: "var(--yellow)",
                                            fontWeight: 500,
                                        }}
                                    >
                                        {b.durationLabel || "-"}
                                    </td>
                                    <td style={{ padding: "10px 14px" }}>
                                        <Badge variant="yellow">Rest</Badge>
                                    </td>
                                </tr>
                            ))}
                            {data.blocks.length === 0 && !(data as any).recoveryBlocks?.length && (
                                <tr>
                                    <td colSpan={4}>
                                        <EmptyState
                                            icon="·"
                                            title="No blocks logged yet"
                                            sub="Start a focus block above to begin tracking."
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
