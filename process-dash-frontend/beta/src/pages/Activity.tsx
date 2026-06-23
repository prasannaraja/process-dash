import { useState, useEffect, useMemo } from "react";
import { api, type ProjectDefinition, type SprintDefinition } from "../api/client";

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
            md += `### 📅 ${formattedDate}\n`;
            
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

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-6 pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <span>🗓️</span> Unified Activity Timeline
                    </h1>
                    <p className="text-sm text-gray-500">
                        Synthesize focus hours and GitHub contributions side-by-side for sprint standups.
                    </p>
                </div>
                
                <button
                    onClick={copyMarkdownSummary}
                    className="bg-slate-900 text-white px-4 py-2 rounded font-medium text-sm flex items-center gap-2 hover:bg-slate-800 transition active:scale-95 duration-100"
                >
                    <span>📋</span> {copied ? "Copied to Clipboard!" : "Copy Sprint Summary (Markdown)"}
                </button>
            </header>

            {/* Filter Panel */}
            <section className="bg-gray-50 border rounded-xl p-4 grid md:grid-cols-4 gap-4 shadow-sm">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Project</label>
                    <select
                        className="border p-2 rounded-lg w-full bg-white text-sm"
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                    >
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date Presets</label>
                    <select
                        className="border p-2 rounded-lg w-full bg-white text-sm"
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
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Sprint</label>
                        <select
                            className="border p-2 rounded-lg w-full bg-white text-sm"
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
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date</label>
                            <input
                                type="date"
                                className="border p-2 rounded-lg w-full bg-white text-sm"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">End Date</label>
                            <input
                                type="date"
                                className="border p-2 rounded-lg w-full bg-white text-sm"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </>
                )}
            </section>

            {error && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm flex flex-col gap-2">
                    <div className="font-semibold flex items-center gap-2">
                        <span>⚠️</span> Note regarding GitHub integration:
                    </div>
                    <div>{error}</div>
                    {error.includes("configured") && (
                        <a href="/project" className="text-blue-600 underline font-medium hover:text-blue-800 mt-1 inline-block">
                            Configure GitHub parameters in settings &rarr;
                        </a>
                    )}
                </div>
            )}

            {loading ? (
                <div className="text-center py-20 text-gray-500 space-y-3">
                    <div className="animate-spin text-3xl inline-block">⏳</div>
                    <div>Fetching timeline activity & GitHub check-ins...</div>
                </div>
            ) : (
                <div className="space-y-6">
                    {githubData?.configured === false && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center max-w-xl mx-auto space-y-4 shadow-sm">
                            <div className="text-4xl">🐙</div>
                            <h3 className="text-lg font-bold text-slate-800">GitHub Activity Not Integrated</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Link this project to a GitHub repository to automatically visualize your commits, pull requests, and review comments side-by-side with your time-tracking logs.
                            </p>
                            <a
                                href="/project"
                                className="inline-block bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                            >
                                Setup GitHub Settings
                            </a>
                        </div>
                    )}

                    {activeDays.length > 0 ? (
                        <div className="space-y-6 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-200">
                            {activeDays.map((d) => {
                                const rollup = dayRollups[d];
                                const git = githubData?.activity?.[d];
                                
                                const hasLocal = rollup && (rollup.blocks?.length > 0 || rollup.todos?.length > 0);
                                const hasGit = git && (git.commits?.length > 0 || git.prs?.length > 0 || git.reviews?.length > 0);
                                
                                if (!hasLocal && !hasGit) return null;

                                const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
                                const formattedDate = new Date(d + 'T00:00:00').toLocaleDateString('en-US', options);

                                return (
                                    <div key={d} className="relative pl-12 group">
                                        {/* Timeline Node */}
                                        <div className="absolute left-[18px] top-4 w-[14px] h-[14px] rounded-full border-2 border-white bg-slate-900 ring-4 ring-slate-100 group-hover:scale-110 transition duration-150"></div>
                                        
                                        <div className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition duration-200">
                                            {/* Date Banner */}
                                            <div className="bg-slate-50 border-b px-4 py-3 flex items-center justify-between">
                                                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                                    <span>📅</span> {formattedDate}
                                                </h3>
                                                <span className="text-xs text-gray-400 font-mono">{d}</span>
                                            </div>

                                            {/* Split View */}
                                            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
                                                {/* Left Column: Local Focus Logs */}
                                                <div className="p-4 space-y-4">
                                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                                        <span>⏱️</span> Daily Focus Log
                                                    </h4>
                                                    
                                                    {rollup ? (
                                                        <div className="space-y-3">
                                                            {/* Intents */}
                                                            {rollup.intents && rollup.intents.length > 0 && (
                                                                <div className="space-y-1">
                                                                    <div className="text-xs text-gray-500">Daily Intents:</div>
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {rollup.intents.map((intent: string, i: number) => (
                                                                            <span key={i} className="text-xs bg-slate-100 border px-2 py-0.5 rounded-md text-slate-700 font-medium">
                                                                                {intent}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Stats Grid */}
                                                            <div className="grid grid-cols-3 gap-2">
                                                                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-2 text-center">
                                                                    <div className="text-sm font-bold text-blue-800">{rollup.metrics?.totalActiveLabel || "0m"}</div>
                                                                    <div className="text-[10px] uppercase text-blue-500 font-medium">Active</div>
                                                                </div>
                                                                <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-2 text-center">
                                                                    <div className="text-sm font-bold text-emerald-800">{rollup.metrics?.focusBlocks || 0}</div>
                                                                    <div className="text-[10px] uppercase text-emerald-500 font-medium">Focus</div>
                                                                </div>
                                                                <div className="bg-red-50/50 border border-red-100 rounded-lg p-2 text-center">
                                                                    <div className="text-sm font-bold text-red-800">{rollup.metrics?.interruptedBlocks || 0}</div>
                                                                    <div className="text-[10px] uppercase text-red-500 font-medium">Intr.</div>
                                                                </div>
                                                            </div>

                                                            {/* Completed Todos */}
                                                            {rollup.todos && rollup.todos.filter((t: any) => t.completed).length > 0 ? (
                                                                <div className="space-y-1">
                                                                    <div className="text-xs text-gray-500">Completed Todos:</div>
                                                                    <ul className="text-xs space-y-1 pl-4 list-disc text-slate-600">
                                                                        {rollup.todos.filter((t: any) => t.completed).map((todo: any) => (
                                                                            <li key={todo.todoId}>{todo.text}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            ) : (
                                                                <div className="text-xs text-gray-400 italic">No todos completed this day.</div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-gray-400 italic">No daily logs recorded.</div>
                                                    )}
                                                </div>

                                                {/* Right Column: GitHub Contributions */}
                                                <div className="p-4 space-y-4 bg-slate-50/30">
                                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                                        <span>🐙</span> Engineering Contributions
                                                    </h4>

                                                    {hasGit ? (
                                                        <div className="space-y-3">
                                                            {/* Commits */}
                                                            {git.commits?.length > 0 && (
                                                                <div className="space-y-1.5">
                                                                    <div className="text-xs text-gray-500 font-medium">Commits authored:</div>
                                                                    <ul className="space-y-1.5">
                                                                        {git.commits.map((c: any, ci: number) => (
                                                                            <li key={ci} className="text-xs bg-white border rounded-lg p-2 flex items-start gap-2 shadow-xs hover:border-gray-300">
                                                                                <a
                                                                                    href={c.url}
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] border font-bold hover:underline shrink-0"
                                                                                >
                                                                                    {c.sha}
                                                                                </a>
                                                                                <span className="text-slate-700 truncate" title={c.message}>{c.message}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}

                                                            {/* Pull Requests */}
                                                            {git.prs?.length > 0 && (
                                                                <div className="space-y-1.5">
                                                                    <div className="text-xs text-gray-500 font-medium">PRs authored:</div>
                                                                    <ul className="space-y-1.5">
                                                                        {git.prs.map((pr: any, pi: number) => (
                                                                            <li key={pi} className="text-xs bg-white border rounded-lg p-2 flex items-center justify-between gap-2 shadow-xs">
                                                                                <span className="flex items-center gap-1.5 truncate">
                                                                                    <span className="text-slate-400 font-semibold font-mono shrink-0">#{pr.number}</span>
                                                                                    <a
                                                                                        href={pr.url}
                                                                                        target="_blank"
                                                                                        rel="noreferrer"
                                                                                        className="text-slate-700 font-medium hover:underline hover:text-blue-600 truncate"
                                                                                        title={pr.title}
                                                                                    >
                                                                                        {pr.title}
                                                                                    </a>
                                                                                </span>
                                                                                <PrBadge state={pr.state} />
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}

                                                            {/* PR Reviews */}
                                                            {git.reviews?.length > 0 && (
                                                                <div className="space-y-1.5">
                                                                    <div className="text-xs text-gray-500 font-medium">Code Reviews:</div>
                                                                    <ul className="space-y-1.5">
                                                                        {git.reviews.map((rev: any, ri: number) => (
                                                                            <li key={ri} className="text-xs bg-white border rounded-lg p-2 flex items-center justify-between gap-2 shadow-xs">
                                                                                <span className="flex items-center gap-1.5 truncate">
                                                                                    <span className="text-slate-400 font-semibold font-mono shrink-0">#{rev.number}</span>
                                                                                    <a
                                                                                        href={rev.url}
                                                                                        target="_blank"
                                                                                        rel="noreferrer"
                                                                                        className="text-slate-700 hover:underline hover:text-blue-600 truncate"
                                                                                        title={rev.title}
                                                                                    >
                                                                                        {rev.title}
                                                                                    </a>
                                                                                </span>
                                                                                <PrBadge state={rev.state} />
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-gray-400 italic py-2">No engineering check-ins located on this date.</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-slate-50 border border-dashed rounded-xl text-gray-400">
                            <div className="text-4xl mb-3">📭</div>
                            <h3 className="text-sm font-bold text-gray-500">No activity logged in selected range</h3>
                            <p className="text-xs text-gray-400 mt-1">Try selecting a different date range or project.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function PrBadge({ state }: { state: string }) {
    const cleanState = state.toLowerCase();
    if (cleanState === "open") {
        return (
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
                OPEN
            </span>
        );
    } else if (cleanState === "closed") {
        return (
            <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded shrink-0">
                CLOSED
            </span>
        );
    } else if (cleanState === "merged") {
        return (
            <span className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded shrink-0">
                MERGED
            </span>
        );
    }
    return (
        <span className="text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded shrink-0 uppercase">
            {state}
        </span>
    );
}
