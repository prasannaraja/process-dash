import { useState, useEffect, useRef, useMemo } from "react";
import { api, type Todo } from "../api/client";
import { Button, EmptyState, Loading, PageHeader } from "../components/ui";

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDateLabel(dateStr: string): string {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (dateStr === today) return "Today";
    if (dateStr === yesterday) return "Yesterday";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

// ── TodoRow ───────────────────────────────────────────────────────────────────

function TodoRow({ todo, onToggle, onDelete }: {
    todo: Todo;
    onToggle: (t: Todo) => void;
    onDelete: (id: string) => void;
}) {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: "flex", alignItems: "center", gap: 10,
                background: hovered ? "var(--surface-2)" : "var(--surface)",
                border: "1px solid var(--border)", borderRadius: 6,
                padding: "8px 12px", transition: "background 0.1s, border-color 0.1s",
                borderColor: hovered ? "var(--border-2)" : "var(--border)",
            }}
        >
            <button
                onClick={() => onToggle(todo)}
                aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
                style={{
                    width: 18, height: 18, flexShrink: 0, borderRadius: 4,
                    border: todo.completed ? "1px solid var(--green)" : "1px solid var(--border-2)",
                    background: todo.completed ? "var(--green-bg)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: "var(--green)", fontSize: 11, padding: 0,
                }}
            >
                {todo.completed && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </button>

            <span style={{
                flex: 1, fontSize: 13,
                color: todo.completed ? "var(--text-3)" : "var(--text)",
                textDecoration: todo.completed ? "line-through" : "none",
            }}>
                {todo.text}
            </span>

            {todo.completed && todo.completionDate && todo.completionDate !== todo.date && (
                <span style={{ fontSize: 11, color: "var(--text-3)", opacity: hovered ? 1 : 0, transition: "opacity 0.1s" }}>
                    done {todo.completionDate}
                </span>
            )}

            <button
                onClick={() => onDelete(todo.todoId)}
                aria-label="Delete"
                style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--text-3)", fontSize: 18, lineHeight: 1,
                    padding: "0 2px", opacity: hovered ? 1 : 0, transition: "opacity 0.1s, color 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--red)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
            >×</button>
        </div>
    );
}

// ── DateGroup ─────────────────────────────────────────────────────────────────

function DateGroup({ date, todos, onToggle, onDelete }: {
    date: string;
    todos: Todo[];
    onToggle: (t: Todo) => void;
    onDelete: (id: string) => void;
}) {
    const [collapsed, setCollapsed] = useState(false);
    const pending = todos.filter(t => !t.completed);
    const completed = todos.filter(t => t.completed);

    return (
        <div style={{ marginBottom: 20 }}>
            {/* Group header */}
            <button
                onClick={() => setCollapsed(v => !v)}
                style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%",
                    background: "transparent", border: "none", cursor: "pointer",
                    padding: "4px 0 8px", textAlign: "left", fontFamily: "inherit",
                }}
            >
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    {formatDateLabel(date)}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                    {pending.length} pending · {completed.length} done
                </span>
                <div style={{ flex: 1, height: 1, background: "var(--border)", marginLeft: 4 }} />
                <span style={{ fontSize: 10, color: "var(--text-3)" }}>{collapsed ? "▸" : "▾"}</span>
            </button>

            {!collapsed && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {/* Pending first */}
                    {pending.map(t => (
                        <TodoRow key={t.todoId} todo={t} onToggle={onToggle} onDelete={onDelete} />
                    ))}
                    {/* Completed after, slightly muted */}
                    {completed.length > 0 && (
                        <div style={{ opacity: 0.65 }}>
                            {completed.map(t => (
                                <div key={t.todoId} style={{ marginTop: 4 }}>
                                    <TodoRow todo={t} onToggle={onToggle} onDelete={onDelete} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Todos() {
    const today = new Date().toISOString().slice(0, 10);
    const [allTodos, setAllTodos] = useState<Todo[]>([]);
    const [filterDate, setFilterDate] = useState<string>("all");
    const [inputText, setInputText] = useState("");
    const [addDate, setAddDate] = useState(today);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.todos.listAll();
            setAllTodos(res.todos);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleAdd = async () => {
        const text = inputText.trim();
        if (!text) return;
        setInputText("");
        await api.todos.add(addDate, text);
        await load();
        inputRef.current?.focus();
    };

    const handleToggle = async (todo: Todo) => {
        if (todo.completed) {
            await api.todos.uncomplete(todo.todoId, today);
        } else {
            await api.todos.complete(todo.todoId, today);
        }
        await load();
    };

    const handleDelete = async (todoId: string) => {
        await api.todos.delete(todoId);
        await load();
    };

    // All unique dates descending
    const allDates = useMemo(() => {
        const dates = [...new Set(allTodos.map(t => t.date).filter(Boolean))];
        return dates.sort((a, b) => b.localeCompare(a));
    }, [allTodos]);

    // Filtered todos
    const visibleTodos = useMemo(() =>
        filterDate === "all" ? allTodos : allTodos.filter(t => t.date === filterDate),
        [allTodos, filterDate]
    );

    // Group by date
    const grouped = useMemo(() => {
        const map: Record<string, Todo[]> = {};
        for (const t of visibleTodos) {
            const d = t.date || "unknown";
            if (!map[d]) map[d] = [];
            map[d].push(t);
        }
        // Sort dates desc
        return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
    }, [visibleTodos]);

    const totalPending = allTodos.filter(t => !t.completed).length;
    const totalDone = allTodos.filter(t => t.completed).length;

    return (
        <div style={{ padding: "28px 32px", maxWidth: 760, margin: "0 auto", paddingBottom: 80 }}>
            <PageHeader
                title="Todos"
                sub={`${totalPending} pending · ${totalDone} done`}
                right={
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {/* Date filter */}
                        <select
                            value={filterDate}
                            onChange={e => setFilterDate(e.target.value)}
                            style={{
                                background: "var(--surface-2)", border: "1px solid var(--border)",
                                color: "var(--text)", borderRadius: 6, padding: "6px 10px",
                                fontSize: 12, fontFamily: "inherit", cursor: "pointer",
                            }}
                        >
                            <option value="all">All dates</option>
                            {allDates.map(d => (
                                <option key={d} value={d}>{formatDateLabel(d)} ({d})</option>
                            ))}
                        </select>
                    </div>
                }
            />

            {/* Add input */}
            <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Add a todo and press Enter…"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAdd()}
                    style={{
                        flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)",
                        color: "var(--text)", borderRadius: 6, padding: "8px 12px",
                        fontSize: 13, fontFamily: "inherit",
                    }}
                />
                <input
                    type="date"
                    value={addDate}
                    onChange={e => setAddDate(e.target.value)}
                    title="Date for new todo"
                    style={{
                        background: "var(--surface-2)", border: "1px solid var(--border)",
                        color: "var(--text)", borderRadius: 6, padding: "8px 10px",
                        fontSize: 13, fontFamily: "inherit",
                    }}
                />
                <Button variant="primary" onClick={handleAdd} disabled={!inputText.trim()}>Add</Button>
            </div>

            {loading && <Loading text="Loading todos…" />}

            {!loading && grouped.length === 0 && (
                <EmptyState icon="✓" title="No todos found" sub={filterDate === "all" ? "Add one above to get started." : "No todos for this date."} />
            )}

            {!loading && grouped.map(([date, todos]) => (
                <DateGroup
                    key={date}
                    date={date}
                    todos={todos}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                />
            ))}
        </div>
    );
}
