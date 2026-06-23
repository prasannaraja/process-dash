import { useState, useEffect, useMemo } from "react";
import { api, type ProjectDefinition, type SprintDefinition } from "../api/client";
import {
    Badge,
    Button,
    Card,
    EmptyState,
    Loading,
    PageHeader,
    Section,
} from "../components/ui";

function getTodayIsoDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getDaysArray(startStr: string, endStr: string): string[] {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const arr: string[] = [];
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
        arr.push(new Date(dt).toISOString().split("T")[0]);
    }
    return arr.reverse(); // Newest days first
}

export default function Activity() {
    const [projects, setProjects] = useState<ProjectDefinition[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [sprints, setSprints] = useState<SprintDefinition[]>([]);
    const [dateRangePreset, setDateRangePreset] = useState("sprint"); // "7d", "14d", "sprint", "custom"
    const [selectedSprintId, setSelectedSprintId] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    // Activity Data State
    const [githubData, setGithubData] = useState<any>(null);
    const [dayRollups, setDayRollups] = useState<Record<string, any>>({});

    // Load projects and sprints on mount
    useEffect(() => {
        const loadMetadata = async () => {
            try {
                const [projectsRes, sprintsRes] = await Promise.all([
                    api.projects.list(),
                    api.sprints.list(),
                ]);

                const projList = projectsRes.items || [];
                setProjects(projList);
                if (projList.length > 0) {
                    setSelectedProjectId(projList[0].id);
                }

                const sprintList = sprintsRes.items || [];
                setSprints(sprintList);
                if (sprintList.length > 0) {
                    const today = getTodayIsoDate();
                    const current = sprintList.find((s) => s.startDate <= today && s.endDate >= today);
                    const target = current || sprintList[0];
                    setSelectedSprintId(target.id);
                    setStartDate(target.startDate);
                    setEndDate(target.endDate);
                } else {
                    // Fallback to last 7 days if no sprints exist
                    setDateRangePreset("7d");
                    const end = getTodayIsoDate();
                    const startObj = new Date();
                    startObj.setDate(startObj.getDate() - 7);
                    const start = startObj.toISOString().split("T")[0];
                    setStartDate(start);
                    setEndDate(end);
                }
            } catch (e: any) {
                setError(e.message || "Failed to load projects/sprints.");
            }
        };
        loadMetadata();
    }, []);

    // Monitor Date Range changes based on Presets
    useEffect(() => {
        if (dateRangePreset === "7d") {
            const end = getTodayIsoDate();
            const startObj = new Date();
            startObj.setDate(startObj.getDate() - 6);
            setStartDate(startObj.toISOString().split("T")[0]);
            setEndDate(end);
        } else if (dateRangePreset === "14d") {
            const end = getTodayIsoDate();
            const startObj = new Date();
            startObj.setDate(startObj.getDate() - 13);
            setStartDate(startObj.toISOString().split("T")[0]);
            setEndDate(end);
        } else if (dateRangePreset === "sprint") {
            const sprint = sprints.find(s => s.id === selectedSprintId);
            if (sprint) {
                setStartDate(sprint.startDate);
                setEndDate(sprint.endDate);
            }
        }
    }, [dateRangePreset, selectedSprintId, sprints]);

    // Main Fetch logic
    const fetchData = async () => {
        if (!selectedProjectId || !startDate || !endDate) return;
        setLoading(true);
        setError("");
        setGithubData(null);
        setDayRollups({});

        try {
            const dates = getDaysArray(startDate, endDate);

            // Fetch GitHub activity & daily rollups in parallel
            const [gitRes, ...rollupsRes] = await Promise.all([
                api.projects.getGithubActivity(selectedProjectId, startDate, endDate),
                ...dates.map(d => api.reports.getDay(d).catch(() => null))
            ]);

            setGithubData(gitRes);

            const rollupMap: Record<string, any> = {};
            dates.forEach((d, idx) => {
                if (rollupsRes[idx]) {
                    rollupMap[d] = rollupsRes[idx];
                }
            });
            setDayRollups(rollupMap);

            if (gitRes.error) {
                setError(gitRes.error);
            }
        } catch (e: any) {
            setError(e.message || "Failed to fetch activity reports.");
        } finally {
            setLoading(false);
        }
    };

    // Trigger fetch on Project selection or Date range change
    useEffect(() => {
        fetchData();
    }, [selectedProjectId, startDate, endDate]);

    const activeDays = useMemo(() => {
        if (!startDate || !endDate) return [];
        return getDaysArray(startDate, endDate);
    }, [startDate, endDate]);

    const copyMarkdownSummary = () => {
        let md = `# Sprint Activity Summary (${startDate} to ${endDate})\n\n`;

        activeDays.forEach(d => {
            const rollup = dayRollups[d];
            const git = githubData?.activity?.[d];

            const hasLocal = rollup && (rollup.blocks.length > 0 || rollup.todos.length > 0);
            const hasGit = git && (git.commits.length > 0 || git.prs.length > 0 || git.reviews.length > 0);

            if (!hasLocal && !hasGit) return;

            const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const formattedDate = new Date(d + 'T00:00:00').toLocaleDateString('en-US', options);
            md += `### ${formattedDate}\n`;

            if (rollup) {
                if (rollup.intents && rollup.intents.length > 0) {
                    md += `- **Daily Intents**: ${rollup.intents.join(', ')}\n`;
                }
                if (rollup.metrics) {
                    md += `- **Focus & Telemetry**: ${rollup.metrics.totalActiveLabel || '0m'} Active | ${rollup.metrics.focusBlocks || 0} Focus Blocks\n`;
                }
                const completedTodos = rollup.todos?.filter((t: any) => t.completed) || [];
                if (completedTodos.length > 0) {
                    md += `- **Completed Todos**:\n`;
                    completedTodos.forEach((t: any) => {
                        md += `  - [x] ${t.text}\n`;
                    });
                }
            }

            if (git) {
                if (git.commits.length > 0 || git.prs.length > 0 || git.reviews.length > 0) {
                    md += `- **Engineering Contributions**:\n`;
                }
                git.commits.forEach((c: any) => {
                    md += `  - [Commit] ${c.message} (${c.sha})\n`;
                });
                git.prs.forEach((pr: any) => {
                    md += `  - [PR Author] #${pr.number} - ${pr.title} (${pr.state.toUpperCase()})\n`;
                });
                git.reviews.forEach((rev: any) => {
                    md += `  - [PR Review] #${rev.number} - ${rev.title} (${rev.state.toUpperCase()})\n`;
                });
            }
            md += `\n`;
        });

        navigator.clipboard.writeText(md).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(err => {
            alert("Could not copy clipboard: " + err);
        });
    };

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

    return (
        <div style={{ padding: "28px 32px", maxWidth: 960, margin: "0 auto", paddingBottom: 80 }}>
            <PageHeader
                title="Unified Activity Timeline"
                sub="Synthesize focus hours and GitHub contributions side-by-side for sprint standups."
                right={
                    <Button
                        variant="secondary"
                        onClick={copyMarkdownSummary}
                    >
                        {copied ? "Copied!" : "Copy Sprint Summary (MD)"}
                    </Button>
                }
            />

            {/* Filter Panel */}
            <Section title="Filters">
                <Card style={{ padding: 16 }}>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                            gap: 12,
                        }}
                    >
                        <div>
                            <div
                                style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    letterSpacing: "0.06em",
                                    textTransform: "uppercase",
                                    color: "var(--text-3)",
                                    marginBottom: 6,
                                }}
                            >
                                Project
                            </div>
                            <select
                                style={inputStyle}
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                            >
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <div
                                style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    letterSpacing: "0.06em",
                                    textTransform: "uppercase",
                                    color: "var(--text-3)",
                                    marginBottom: 6,
                                }}
                            >
                                Date Preset
                            </div>
                            <select
                                style={inputStyle}
                                value={dateRangePreset}
                                onChange={(e) => setDateRangePreset(e.target.value)}
                            >
                                {sprints.length > 0 && <option value="sprint">Current Sprint Range</option>}
                                <option value="7d">Last 7 Days</option>
                                <option value="14d">Last 14 Days</option>
                                <option value="custom">Custom Date Range</option>
                            </select>
                        </div>

                        {dateRangePreset === "sprint" && sprints.length > 0 && (
                            <div>
                                <div
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        letterSpacing: "0.06em",
                                        textTransform: "uppercase",
                                        color: "var(--text-3)",
                                        marginBottom: 6,
                                    }}
                                >
                                    Select Sprint
                                </div>
                                <select
                                    style={inputStyle}
                                    value={selectedSprintId}
                                    onChange={(e) => setSelectedSprintId(e.target.value)}
                                >
                                    {sprints.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.startDate} to {s.endDate})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {dateRangePreset === "custom" && (
                            <>
                                <div>
                                    <div
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            letterSpacing: "0.06em",
                                            textTransform: "uppercase",
                                            color: "var(--text-3)",
                                            marginBottom: 6,
                                        }}
                                    >
                                        Start Date
                                    </div>
                                    <input
                                        type="date"
                                        style={inputStyle}
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <div
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            letterSpacing: "0.06em",
                                            textTransform: "uppercase",
                                            color: "var(--text-3)",
                                            marginBottom: 6,
                                        }}
                                    >
                                        End Date
                                    </div>
                                    <input
                                        type="date"
                                        style={inputStyle}
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </Card>
            </Section>

            {error && (
                <div
                    style={{
                        background: "var(--yellow-bg)",
                        border: "1px solid rgba(251,191,36,0.2)",
                        color: "var(--yellow)",
                        padding: "12px 16px",
                        borderRadius: 8,
                        fontSize: 13,
                        marginBottom: 20,
                    }}
                >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Note regarding GitHub integration:</div>
                    <div>{error}</div>
                    {error.includes("configured") && (
                        <a
                            href="/project"
                            style={{
                                color: "var(--accent)",
                                textDecoration: "underline",
                                fontSize: 12,
                                display: "inline-block",
                                marginTop: 6,
                            }}
                        >
                            Configure GitHub parameters in settings &rarr;
                        </a>
                    )}
                </div>
            )}

            {loading ? (
                <Loading text="Fetching timeline activity & GitHub check-ins…" />
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    {githubData?.configured === false && (
                        <Card style={{ padding: 32, textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
                            <div style={{ fontSize: 28, marginBottom: 12 }}>⚙</div>
                            <div
                                style={{
                                    fontSize: 15,
                                    fontWeight: 600,
                                    color: "var(--text)",
                                    marginBottom: 8,
                                }}
                            >
                                GitHub Activity Not Integrated
                            </div>
                            <p
                                style={{
                                    fontSize: 13,
                                    color: "var(--text-2)",
                                    lineHeight: 1.6,
                                    marginBottom: 16,
                                }}
                            >
                                Link this project to a GitHub repository to automatically visualize your commits, pull requests, and review comments side-by-side with your time-tracking logs.
                            </p>
                            <a href="/project">
                                <Button variant="primary">Setup GitHub Settings</Button>
                            </a>
                        </Card>
                    )}

                    {activeDays.length > 0 ? (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 16,
                                position: "relative",
                            }}
                        >
                            {/* Timeline line */}
                            <div
                                style={{
                                    position: "absolute",
                                    left: 20,
                                    top: 16,
                                    bottom: 16,
                                    width: 2,
                                    background: "var(--border)",
                                }}
                            />

                            {activeDays.map((d) => {
                                const rollup = dayRollups[d];
                                const git = githubData?.activity?.[d];

                                const hasLocal = rollup && (rollup.blocks?.length > 0 || rollup.todos?.length > 0);
                                const hasGit = git && (git.commits?.length > 0 || git.prs?.length > 0 || git.reviews?.length > 0);

                                if (!hasLocal && !hasGit) return null;

                                const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
                                const formattedDate = new Date(d + 'T00:00:00').toLocaleDateString('en-US', options);

                                return (
                                    <div
                                        key={d}
                                        style={{ position: "relative", paddingLeft: 44 }}
                                    >
                                        {/* Timeline node */}
                                        <div
                                            style={{
                                                position: "absolute",
                                                left: 14,
                                                top: 16,
                                                width: 12,
                                                height: 12,
                                                borderRadius: "50%",
                                                background: "var(--accent)",
                                                border: "2px solid var(--bg)",
                                                boxShadow: "0 0 0 2px var(--border)",
                                            }}
                                        />

                                        <Card>
                                            {/* Date Banner */}
                                            <div
                                                style={{
                                                    background: "var(--surface-2)",
                                                    borderBottom: "1px solid var(--border)",
                                                    padding: "10px 16px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    borderRadius: "8px 8px 0 0",
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: 13,
                                                        fontWeight: 600,
                                                        color: "var(--text)",
                                                    }}
                                                >
                                                    {formattedDate}
                                                </span>
                                                <span
                                                    className="mono"
                                                    style={{ fontSize: 11, color: "var(--text-3)" }}
                                                >
                                                    {d}
                                                </span>
                                            </div>

                                            {/* Split View */}
                                            <div
                                                style={{
                                                    display: "grid",
                                                    gridTemplateColumns: "1fr 1fr",
                                                }}
                                            >
                                                {/* Left: Focus Log */}
                                                <div
                                                    style={{
                                                        padding: 16,
                                                        borderRight: "1px solid var(--border)",
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        gap: 12,
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            letterSpacing: "0.06em",
                                                            textTransform: "uppercase",
                                                            color: "var(--text-3)",
                                                        }}
                                                    >
                                                        Daily Focus Log
                                                    </div>

                                                    {rollup ? (
                                                        <>
                                                            {rollup.intents && rollup.intents.length > 0 && (
                                                                <div>
                                                                    <div
                                                                        style={{
                                                                            fontSize: 11,
                                                                            color: "var(--text-3)",
                                                                            marginBottom: 6,
                                                                        }}
                                                                    >
                                                                        Daily Intents:
                                                                    </div>
                                                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                                                        {rollup.intents.map((intent: string, i: number) => (
                                                                            <Badge key={i} variant="default">
                                                                                {intent}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div
                                                                style={{
                                                                    display: "grid",
                                                                    gridTemplateColumns: "1fr 1fr 1fr",
                                                                    gap: 6,
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        background: "var(--accent-bg)",
                                                                        border: "1px solid rgba(129,140,248,0.15)",
                                                                        borderRadius: 6,
                                                                        padding: "8px 6px",
                                                                        textAlign: "center",
                                                                    }}
                                                                >
                                                                    <div
                                                                        className="mono"
                                                                        style={{
                                                                            fontSize: 13,
                                                                            fontWeight: 700,
                                                                            color: "var(--accent)",
                                                                        }}
                                                                    >
                                                                        {rollup.metrics?.totalActiveLabel || "0m"}
                                                                    </div>
                                                                    <div
                                                                        style={{
                                                                            fontSize: 10,
                                                                            textTransform: "uppercase",
                                                                            color: "var(--text-3)",
                                                                            marginTop: 2,
                                                                        }}
                                                                    >
                                                                        Active
                                                                    </div>
                                                                </div>
                                                                <div
                                                                    style={{
                                                                        background: "var(--green-bg)",
                                                                        border: "1px solid rgba(74,222,128,0.15)",
                                                                        borderRadius: 6,
                                                                        padding: "8px 6px",
                                                                        textAlign: "center",
                                                                    }}
                                                                >
                                                                    <div
                                                                        className="mono"
                                                                        style={{
                                                                            fontSize: 13,
                                                                            fontWeight: 700,
                                                                            color: "var(--green)",
                                                                        }}
                                                                    >
                                                                        {rollup.metrics?.focusBlocks || 0}
                                                                    </div>
                                                                    <div
                                                                        style={{
                                                                            fontSize: 10,
                                                                            textTransform: "uppercase",
                                                                            color: "var(--text-3)",
                                                                            marginTop: 2,
                                                                        }}
                                                                    >
                                                                        Focus
                                                                    </div>
                                                                </div>
                                                                <div
                                                                    style={{
                                                                        background: "var(--red-bg)",
                                                                        border: "1px solid rgba(248,113,113,0.15)",
                                                                        borderRadius: 6,
                                                                        padding: "8px 6px",
                                                                        textAlign: "center",
                                                                    }}
                                                                >
                                                                    <div
                                                                        className="mono"
                                                                        style={{
                                                                            fontSize: 13,
                                                                            fontWeight: 700,
                                                                            color: "var(--red)",
                                                                        }}
                                                                    >
                                                                        {rollup.metrics?.interruptedBlocks || 0}
                                                                    </div>
                                                                    <div
                                                                        style={{
                                                                            fontSize: 10,
                                                                            textTransform: "uppercase",
                                                                            color: "var(--text-3)",
                                                                            marginTop: 2,
                                                                        }}
                                                                    >
                                                                        Intr.
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {rollup.todos && rollup.todos.filter((t: any) => t.completed).length > 0 ? (
                                                                <div>
                                                                    <div
                                                                        style={{
                                                                            fontSize: 11,
                                                                            color: "var(--text-3)",
                                                                            marginBottom: 4,
                                                                        }}
                                                                    >
                                                                        Completed Todos:
                                                                    </div>
                                                                    <ul
                                                                        style={{
                                                                            margin: 0,
                                                                            paddingLeft: 16,
                                                                            fontSize: 12,
                                                                            color: "var(--text-2)",
                                                                            lineHeight: 1.7,
                                                                        }}
                                                                    >
                                                                        {rollup.todos
                                                                            .filter((t: any) => t.completed)
                                                                            .map((todo: any) => (
                                                                                <li key={todo.todoId}>{todo.text}</li>
                                                                            ))}
                                                                    </ul>
                                                                </div>
                                                            ) : (
                                                                <div
                                                                    style={{
                                                                        fontSize: 12,
                                                                        color: "var(--text-3)",
                                                                        fontStyle: "italic",
                                                                    }}
                                                                >
                                                                    No todos completed this day.
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div
                                                            style={{
                                                                fontSize: 12,
                                                                color: "var(--text-3)",
                                                                fontStyle: "italic",
                                                            }}
                                                        >
                                                            No daily logs recorded.
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right: GitHub */}
                                                <div
                                                    style={{
                                                        padding: 16,
                                                        background: "rgba(255,255,255,0.01)",
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        gap: 12,
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            letterSpacing: "0.06em",
                                                            textTransform: "uppercase",
                                                            color: "var(--text-3)",
                                                        }}
                                                    >
                                                        Engineering Contributions
                                                    </div>

                                                    {hasGit ? (
                                                        <>
                                                            {/* Commits */}
                                                            {git.commits?.length > 0 && (
                                                                <div>
                                                                    <div
                                                                        style={{
                                                                            fontSize: 11,
                                                                            color: "var(--text-3)",
                                                                            marginBottom: 6,
                                                                        }}
                                                                    >
                                                                        Commits authored:
                                                                    </div>
                                                                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                                        {git.commits.map((c: any, ci: number) => (
                                                                            <div
                                                                                key={ci}
                                                                                style={{
                                                                                    display: "flex",
                                                                                    alignItems: "flex-start",
                                                                                    gap: 8,
                                                                                    background: "var(--surface-2)",
                                                                                    border: "1px solid var(--border)",
                                                                                    borderRadius: 6,
                                                                                    padding: "6px 10px",
                                                                                    fontSize: 12,
                                                                                }}
                                                                            >
                                                                                <a
                                                                                    href={c.url}
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    className="mono"
                                                                                    style={{
                                                                                        background: "var(--surface-3)",
                                                                                        color: "var(--accent)",
                                                                                        padding: "1px 6px",
                                                                                        borderRadius: 3,
                                                                                        fontSize: 10,
                                                                                        fontWeight: 700,
                                                                                        flexShrink: 0,
                                                                                        textDecoration: "none",
                                                                                    }}
                                                                                >
                                                                                    {c.sha}
                                                                                </a>
                                                                                <span
                                                                                    style={{
                                                                                        color: "var(--text-2)",
                                                                                        overflow: "hidden",
                                                                                        textOverflow: "ellipsis",
                                                                                        whiteSpace: "nowrap",
                                                                                    }}
                                                                                    title={c.message}
                                                                                >
                                                                                    {c.message}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Pull Requests */}
                                                            {git.prs?.length > 0 && (
                                                                <div>
                                                                    <div
                                                                        style={{
                                                                            fontSize: 11,
                                                                            color: "var(--text-3)",
                                                                            marginBottom: 6,
                                                                        }}
                                                                    >
                                                                        PRs authored:
                                                                    </div>
                                                                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                                        {git.prs.map((pr: any, pi: number) => (
                                                                            <div
                                                                                key={pi}
                                                                                style={{
                                                                                    display: "flex",
                                                                                    alignItems: "center",
                                                                                    justifyContent: "space-between",
                                                                                    gap: 8,
                                                                                    background: "var(--surface-2)",
                                                                                    border: "1px solid var(--border)",
                                                                                    borderRadius: 6,
                                                                                    padding: "6px 10px",
                                                                                    fontSize: 12,
                                                                                }}
                                                                            >
                                                                                <span
                                                                                    style={{
                                                                                        display: "flex",
                                                                                        alignItems: "center",
                                                                                        gap: 6,
                                                                                        overflow: "hidden",
                                                                                    }}
                                                                                >
                                                                                    <span
                                                                                        className="mono"
                                                                                        style={{
                                                                                            color: "var(--text-3)",
                                                                                            fontWeight: 600,
                                                                                            flexShrink: 0,
                                                                                        }}
                                                                                    >
                                                                                        #{pr.number}
                                                                                    </span>
                                                                                    <a
                                                                                        href={pr.url}
                                                                                        target="_blank"
                                                                                        rel="noreferrer"
                                                                                        style={{
                                                                                            color: "var(--text-2)",
                                                                                            fontWeight: 500,
                                                                                            overflow: "hidden",
                                                                                            textOverflow: "ellipsis",
                                                                                            whiteSpace: "nowrap",
                                                                                            textDecoration: "none",
                                                                                        }}
                                                                                        title={pr.title}
                                                                                    >
                                                                                        {pr.title}
                                                                                    </a>
                                                                                </span>
                                                                                <PrBadge state={pr.state} />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* PR Reviews */}
                                                            {git.reviews?.length > 0 && (
                                                                <div>
                                                                    <div
                                                                        style={{
                                                                            fontSize: 11,
                                                                            color: "var(--text-3)",
                                                                            marginBottom: 6,
                                                                        }}
                                                                    >
                                                                        Code Reviews:
                                                                    </div>
                                                                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                                        {git.reviews.map((rev: any, ri: number) => (
                                                                            <div
                                                                                key={ri}
                                                                                style={{
                                                                                    display: "flex",
                                                                                    alignItems: "center",
                                                                                    justifyContent: "space-between",
                                                                                    gap: 8,
                                                                                    background: "var(--surface-2)",
                                                                                    border: "1px solid var(--border)",
                                                                                    borderRadius: 6,
                                                                                    padding: "6px 10px",
                                                                                    fontSize: 12,
                                                                                }}
                                                                            >
                                                                                <span
                                                                                    style={{
                                                                                        display: "flex",
                                                                                        alignItems: "center",
                                                                                        gap: 6,
                                                                                        overflow: "hidden",
                                                                                    }}
                                                                                >
                                                                                    <span
                                                                                        className="mono"
                                                                                        style={{
                                                                                            color: "var(--text-3)",
                                                                                            fontWeight: 600,
                                                                                            flexShrink: 0,
                                                                                        }}
                                                                                    >
                                                                                        #{rev.number}
                                                                                    </span>
                                                                                    <a
                                                                                        href={rev.url}
                                                                                        target="_blank"
                                                                                        rel="noreferrer"
                                                                                        style={{
                                                                                            color: "var(--text-2)",
                                                                                            overflow: "hidden",
                                                                                            textOverflow: "ellipsis",
                                                                                            whiteSpace: "nowrap",
                                                                                            textDecoration: "none",
                                                                                        }}
                                                                                        title={rev.title}
                                                                                    >
                                                                                        {rev.title}
                                                                                    </a>
                                                                                </span>
                                                                                <PrBadge state={rev.state} />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div
                                                            style={{
                                                                fontSize: 12,
                                                                color: "var(--text-3)",
                                                                fontStyle: "italic",
                                                            }}
                                                        >
                                                            No engineering check-ins located on this date.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <EmptyState
                            icon="·"
                            title="No activity logged in selected range"
                            sub="Try selecting a different date range or project."
                        />
                    )}
                </div>
            )}
        </div>
    );
}

function PrBadge({ state }: { state: string }) {
    const cleanState = state.toLowerCase();
    if (cleanState === "open") return <Badge variant="green">OPEN</Badge>;
    if (cleanState === "closed") return <Badge variant="red">CLOSED</Badge>;
    if (cleanState === "merged") return <Badge variant="accent">MERGED</Badge>;
    return <Badge variant="default">{state.toUpperCase()}</Badge>;
}
