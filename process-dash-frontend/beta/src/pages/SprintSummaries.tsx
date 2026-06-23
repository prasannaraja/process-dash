import { useEffect, useMemo, useState } from "react";
import { api, type SprintDefinition, type SprintSummaryItem } from "../api/client";
import {
    Badge,
    Button,
    Card,
    Divider,
    EmptyState,
    Input,
    Loading,
    MetricCard,
    PageHeader,
    Section,
    Select,
} from "../components/ui";

export default function SprintSummaries() {
    const [sprints, setSprints] = useState<SprintDefinition[]>([]);
    const [items, setItems] = useState<SprintSummaryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedWeek, setSelectedWeek] = useState("");

    const [newName, setNewName] = useState("");
    const [newStartDate, setNewStartDate] = useState("");
    const [newDurationDays, setNewDurationDays] = useState(7);

    const [editSprintId, setEditSprintId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editStartDate, setEditStartDate] = useState("");
    const [editDurationDays, setEditDurationDays] = useState(7);
    const [editWarning, setEditWarning] = useState("");

    useEffect(() => {
        const load = async (keepSelection = false) => {
            setLoading(true);
            setError("");
            try {
                const [sprintsRes, summariesRes] = await Promise.all([
                    api.sprints.list(),
                    api.sprints.getSummaries(),
                ]);

                setSprints(sprintsRes.items || []);
                setItems(summariesRes.items || []);

                if (!keepSelection) {
                    const first = (summariesRes.items || [])[0];
                    if (first?.sprintId) {
                        setSelectedWeek(first.sprintId);
                    }
                }
            } catch (e: any) {
                setError(e.message || "Failed to load sprint summaries");
            } finally {
                setLoading(false);
            }
        };

        load(false);
    }, []);

    const selected = useMemo(
        () => items.find((x) => x.sprintId === selectedWeek) || null,
        [items, selectedWeek]
    );

    const selectedDefinition = useMemo(
        () => sprints.find((x) => x.id === selectedWeek) || null,
        [sprints, selectedWeek]
    );

    const refresh = async (keepSelection = true) => {
        const [sprintsRes, summariesRes] = await Promise.all([
            api.sprints.list(),
            api.sprints.getSummaries(),
        ]);
        setSprints(sprintsRes.items || []);
        setItems(summariesRes.items || []);

        if (!keepSelection) {
            const first = (summariesRes.items || [])[0];
            setSelectedWeek(first?.sprintId || "");
        }
    };

    const handleCreateSprint = async () => {
        setError("");
        if (!newName.trim() || !newStartDate) {
            setError("Sprint name and start date are required.");
            return;
        }
        try {
            const created = await api.sprints.create(newName.trim(), newStartDate, Number(newDurationDays));
            setNewName("");
            setNewStartDate("");
            setNewDurationDays(7);
            await refresh(true);
            setSelectedWeek(created.id);
        } catch (e: any) {
            setError(e.message || "Failed to create sprint");
        }
    };

    const openEdit = (sprint: SprintDefinition) => {
        setEditSprintId(sprint.id);
        setEditName(sprint.name);
        setEditStartDate(sprint.startDate);
        setEditDurationDays(sprint.durationDays);
        setEditWarning("");
    };

    const handleUpdateSprint = async (forceRecalculate = false) => {
        if (!editSprintId) return;

        try {
            const response = await api.sprints.update(editSprintId, {
                name: editName.trim(),
                startDate: editStartDate,
                durationDays: Number(editDurationDays),
                forceRecalculate,
            });

            if (!response.ok && response.requiresConfirmation) {
                setEditWarning(response.warning || "This update needs confirmation.");
                return;
            }

            setEditSprintId(null);
            setEditWarning("");
            await refresh(true);
        } catch (e: any) {
            setEditWarning(e.message || "Failed to update sprint");
        }
    };

    if (loading) return <Loading text="Loading sprint summaries…" />;

    return (
        <div style={{ padding: "28px 32px", maxWidth: 960, margin: "0 auto", paddingBottom: 64 }}>
            <PageHeader
                title="Sprint Summaries"
                sub="Review all saved sprint reflections and compare progress over time."
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
                        marginBottom: 20,
                    }}
                >
                    {error}
                </div>
            )}

            {/* Create Sprint */}
            <Section title="Create Sprint">
                <Card style={{ padding: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10 }}>
                        <input
                            placeholder="Sprint name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            style={{
                                background: "var(--surface-2)",
                                border: "1px solid var(--border)",
                                color: "var(--text)",
                                borderRadius: 6,
                                padding: "7px 10px",
                                fontSize: 13,
                                fontFamily: "inherit",
                            }}
                        />
                        <input
                            type="date"
                            value={newStartDate}
                            onChange={(e) => setNewStartDate(e.target.value)}
                            style={{
                                background: "var(--surface-2)",
                                border: "1px solid var(--border)",
                                color: "var(--text)",
                                borderRadius: 6,
                                padding: "7px 10px",
                                fontSize: 13,
                                fontFamily: "inherit",
                            }}
                        />
                        <select
                            value={newDurationDays}
                            onChange={(e) => setNewDurationDays(Number(e.target.value))}
                            style={{
                                background: "var(--surface-2)",
                                border: "1px solid var(--border)",
                                color: "var(--text)",
                                borderRadius: 6,
                                padding: "7px 10px",
                                fontSize: 13,
                                fontFamily: "inherit",
                            }}
                        >
                            <option value={7}>7 days</option>
                            <option value={14}>14 days</option>
                            <option value={21}>21 days</option>
                            <option value={28}>28 days</option>
                        </select>
                        <Button variant="primary" onClick={handleCreateSprint}>
                            Create
                        </Button>
                    </div>
                </Card>
            </Section>

            {/* Configured Sprints */}
            <Section title="Configured Sprints">
                <Card style={{ padding: 16 }}>
                    {sprints.length === 0 ? (
                        <span style={{ fontSize: 13, color: "var(--text-3)" }}>
                            No sprint definitions yet.
                        </span>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {sprints.map((s) => (
                                <div
                                    key={s.id}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        border: "1px solid var(--border)",
                                        borderRadius: 6,
                                        padding: "10px 14px",
                                        background: "var(--surface-2)",
                                    }}
                                >
                                    <div>
                                        <div
                                            style={{
                                                fontSize: 13,
                                                fontWeight: 500,
                                                color: "var(--text)",
                                            }}
                                        >
                                            {s.name}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 11,
                                                color: "var(--text-3)",
                                                marginTop: 2,
                                            }}
                                        >
                                            {s.startDate} to {s.endDate} ({s.durationDays} days)
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                                        Edit
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </Section>

            {/* Summaries Table */}
            {items.length === 0 ? (
                <EmptyState
                    icon="·"
                    title="No sprint summaries yet"
                    sub='Save one from the Week Report page to start tracking progress.'
                />
            ) : (
                <>
                    <Section title="Sprint History">
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
                                        {["Sprint", "Blocks", "Interrupted", "Fragmentation", "Saved"].map(
                                            (h, i) => (
                                                <th
                                                    key={h}
                                                    style={{
                                                        padding: "10px 14px",
                                                        textAlign: i > 0 && i < 4 ? "right" : "left",
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        letterSpacing: "0.06em",
                                                        textTransform: "uppercase",
                                                        color: "var(--text-3)",
                                                    }}
                                                >
                                                    {h}
                                                </th>
                                            )
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item) => (
                                        <tr
                                            key={item.sprintId}
                                            onClick={() => setSelectedWeek(item.sprintId)}
                                            style={{
                                                borderBottom: "1px solid var(--border)",
                                                cursor: "pointer",
                                                background:
                                                    selectedWeek === item.sprintId
                                                        ? "var(--accent-bg)"
                                                        : "transparent",
                                                transition: "background 0.1s",
                                            }}
                                            onMouseEnter={(e) => {
                                                if (selectedWeek !== item.sprintId)
                                                    e.currentTarget.style.background = "var(--surface-2)";
                                            }}
                                            onMouseLeave={(e) => {
                                                if (selectedWeek !== item.sprintId)
                                                    e.currentTarget.style.background = "transparent";
                                            }}
                                        >
                                            <td
                                                style={{
                                                    padding: "10px 14px",
                                                    fontWeight: 500,
                                                    color:
                                                        selectedWeek === item.sprintId
                                                            ? "var(--accent)"
                                                            : "var(--text)",
                                                }}
                                            >
                                                {item.name || item.sprintId}
                                            </td>
                                            <td
                                                className="mono"
                                                style={{
                                                    padding: "10px 14px",
                                                    textAlign: "right",
                                                    color: "var(--text-2)",
                                                }}
                                            >
                                                {item.metrics.totalBlocks}
                                            </td>
                                            <td
                                                className="mono"
                                                style={{
                                                    padding: "10px 14px",
                                                    textAlign: "right",
                                                    color:
                                                        item.metrics.interruptedBlocks > 0
                                                            ? "var(--red)"
                                                            : "var(--text-2)",
                                                }}
                                            >
                                                {item.metrics.interruptedBlocks}
                                            </td>
                                            <td
                                                className="mono"
                                                style={{
                                                    padding: "10px 14px",
                                                    textAlign: "right",
                                                    color: "var(--text-2)",
                                                }}
                                            >
                                                {Math.round((item.metrics.fragmentationRate || 0) * 100)}%
                                            </td>
                                            <td
                                                style={{
                                                    padding: "10px 14px",
                                                    color: "var(--text-3)",
                                                    fontSize: 12,
                                                }}
                                            >
                                                {formatSavedAt(item.savedAt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Section>

                    {selected && (
                        <Section title={`${selected.name || selected.sprintId} — Detail`}>
                            <Card style={{ padding: 20 }}>
                                <div
                                    style={{
                                        fontSize: 12,
                                        color: "var(--text-3)",
                                        marginBottom: 16,
                                    }}
                                >
                                    {selected.startDate || selectedDefinition?.startDate || "-"} to{" "}
                                    {selected.endDate || selectedDefinition?.endDate || "-"}
                                </div>

                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                                        gap: 10,
                                        marginBottom: 20,
                                    }}
                                >
                                    <MetricCard label="Active" value={selected.metrics.totalActiveLabel || "-"} accent />
                                    <MetricCard label="Recovery" value={selected.metrics.totalRecoveryLabel || "-"} warn />
                                    <MetricCard label="Blocks" value={selected.metrics.totalBlocks} />
                                    <MetricCard label="Interrupted" value={selected.metrics.interruptedBlocks} danger={selected.metrics.interruptedBlocks > 0} />
                                    <MetricCard label="Focus" value={selected.metrics.focusBlocks} />
                                </div>

                                <Divider />

                                <div style={{ marginBottom: 16 }}>
                                    <div
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: "var(--text-2)",
                                            marginBottom: 8,
                                        }}
                                    >
                                        Top Fragmenters
                                    </div>
                                    {selected.topFragmenters.length === 0 ? (
                                        <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                                            No fragmenters recorded.
                                        </span>
                                    ) : (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                            {selected.topFragmenters.map((f) => (
                                                <Badge key={f} variant="red">
                                                    {f}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div style={{ marginBottom: 16 }}>
                                    <div
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: "var(--text-2)",
                                            marginBottom: 6,
                                        }}
                                    >
                                        Not Performance Issues
                                    </div>
                                    {selected.notPerformanceIssues.length === 0 ? (
                                        <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                                            None documented.
                                        </span>
                                    ) : (
                                        <ul
                                            style={{
                                                margin: 0,
                                                paddingLeft: 18,
                                                fontSize: 13,
                                                color: "var(--text-2)",
                                                lineHeight: 1.7,
                                            }}
                                        >
                                            {selected.notPerformanceIssues.map((issue, idx) => (
                                                <li key={idx}>{issue}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div>
                                    <div
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: "var(--text-2)",
                                            marginBottom: 4,
                                        }}
                                    >
                                        One Change Next Week
                                    </div>
                                    <div style={{ fontSize: 13, color: "var(--text)" }}>
                                        {selected.oneChangeNextWeek || (
                                            <span style={{ color: "var(--text-3)" }}>Not set</span>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        </Section>
                    )}
                </>
            )}

            {/* Edit Sprint Modal */}
            {editSprintId && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 16,
                        zIndex: 50,
                    }}
                >
                    <Card style={{ padding: 20, width: "100%", maxWidth: 480 }}>
                        <div
                            style={{
                                fontSize: 15,
                                fontWeight: 600,
                                color: "var(--text)",
                                marginBottom: 16,
                            }}
                        >
                            Edit Sprint
                        </div>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr 1fr",
                                gap: 10,
                                marginBottom: 12,
                            }}
                        >
                            <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                style={{
                                    background: "var(--surface-2)",
                                    border: "1px solid var(--border)",
                                    color: "var(--text)",
                                    borderRadius: 6,
                                    padding: "7px 10px",
                                    fontSize: 13,
                                    fontFamily: "inherit",
                                }}
                            />
                            <input
                                type="date"
                                value={editStartDate}
                                onChange={(e) => setEditStartDate(e.target.value)}
                                style={{
                                    background: "var(--surface-2)",
                                    border: "1px solid var(--border)",
                                    color: "var(--text)",
                                    borderRadius: 6,
                                    padding: "7px 10px",
                                    fontSize: 13,
                                    fontFamily: "inherit",
                                }}
                            />
                            <input
                                type="number"
                                min={1}
                                max={60}
                                value={editDurationDays}
                                onChange={(e) => setEditDurationDays(Number(e.target.value))}
                                style={{
                                    background: "var(--surface-2)",
                                    border: "1px solid var(--border)",
                                    color: "var(--text)",
                                    borderRadius: 6,
                                    padding: "7px 10px",
                                    fontSize: 13,
                                    fontFamily: "inherit",
                                }}
                            />
                        </div>

                        {editWarning && (
                            <div
                                style={{
                                    background: "var(--yellow-bg)",
                                    border: "1px solid rgba(251,191,36,0.2)",
                                    color: "var(--yellow)",
                                    padding: "10px 14px",
                                    borderRadius: 6,
                                    fontSize: 12,
                                    marginBottom: 12,
                                }}
                            >
                                {editWarning}
                            </div>
                        )}

                        <div
                            style={{
                                display: "flex",
                                gap: 8,
                                justifyContent: "flex-end",
                            }}
                        >
                            <Button variant="ghost" onClick={() => setEditSprintId(null)}>
                                Cancel
                            </Button>
                            <Button variant="secondary" onClick={() => handleUpdateSprint(false)}>
                                Save
                            </Button>
                            <Button variant="danger" onClick={() => handleUpdateSprint(true)}>
                                Confirm Recalculate
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}

function formatSavedAt(savedAt?: string | null) {
    if (!savedAt) return "-";
    const d = new Date(savedAt);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString();
}
