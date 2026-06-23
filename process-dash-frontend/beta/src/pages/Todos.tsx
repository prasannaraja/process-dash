import { useState, useEffect, useRef } from "react";
import { api, type Todo } from "../api/client";
import {
    Badge,
    Button,
    EmptyState,
    Input,
    Loading,
    PageHeader,
    Section,
} from "../components/ui";

export default function Todos() {
    const today = new Date().toISOString().split("T")[0];
    const [date, setDate] = useState(today);
    const [todos, setTodos] = useState<Todo[]>([]);
    const [inputText, setInputText] = useState("");
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const load = async (d: string) => {
        setLoading(true);
        try {
            const res = await api.todos.list(d);
            setTodos(res.todos);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load(date);
    }, [date]);

    const handleAdd = async () => {
        const text = inputText.trim();
        if (!text) return;
        setInputText("");
        await api.todos.add(date, text);
        await load(date);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleAdd();
    };

    const handleToggle = async (todo: Todo) => {
        if (todo.completed) {
            await api.todos.uncomplete(todo.todoId, today);
        } else {
            await api.todos.complete(todo.todoId, today);
        }
        await load(date);
    };

    const handleDelete = async (todoId: string) => {
        await api.todos.delete(todoId);
        await load(date);
    };

    const pending = todos.filter((t) => !t.completed);
    const completed = todos.filter((t) => t.completed);

    return (
        <div style={{ padding: "28px 32px", maxWidth: 960, margin: "0 auto" }}>
            <PageHeader
                title="Todos"
                sub={date === today ? "Today" : date}
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

            {/* Progress bar */}
            {todos.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 12,
                            color: "var(--text-3)",
                            marginBottom: 6,
                        }}
                    >
                        <span>
                            {completed.length} of {todos.length} done
                        </span>
                        <span className="mono">
                            {Math.round((completed.length / todos.length) * 100)}%
                        </span>
                    </div>
                    <div
                        style={{
                            width: "100%",
                            background: "var(--surface-3)",
                            borderRadius: 99,
                            height: 4,
                            overflow: "hidden",
                        }}
                    >
                        <div
                            style={{
                                width: `${(completed.length / todos.length) * 100}%`,
                                background: "var(--green)",
                                height: "100%",
                                borderRadius: 99,
                                transition: "width 0.3s ease",
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Add input */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Add a todo and press Enter…"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    style={{
                        flex: 1,
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                        borderRadius: 6,
                        padding: "8px 12px",
                        fontSize: 13,
                        fontFamily: "inherit",
                    }}
                />
                <Button variant="primary" onClick={handleAdd} disabled={!inputText.trim()}>
                    Add
                </Button>
            </div>

            {loading && <Loading text="Loading todos…" />}

            {/* Pending todos */}
            {!loading && pending.length > 0 && (
                <Section title={`To Do (${pending.length})`}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {pending.map((todo) => (
                            <TodoRow
                                key={todo.todoId}
                                todo={todo}
                                onToggle={handleToggle}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                </Section>
            )}

            {/* Completed todos */}
            {!loading && completed.length > 0 && (
                <Section title={`Completed (${completed.length})`}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {completed.map((todo) => (
                            <TodoRow
                                key={todo.todoId}
                                todo={todo}
                                onToggle={handleToggle}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                </Section>
            )}

            {!loading && todos.length === 0 && (
                <EmptyState
                    icon="✓"
                    title={`No todos for ${date === today ? "today" : date}`}
                    sub="Add one above to get started."
                />
            )}
        </div>
    );
}

function TodoRow({
    todo,
    onToggle,
    onDelete,
}: {
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
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: hovered ? "var(--surface-2)" : "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "8px 12px",
                transition: "background 0.1s, border-color 0.1s",
                borderColor: hovered ? "var(--border-2)" : "var(--border)",
            }}
        >
            {/* Checkbox */}
            <button
                onClick={() => onToggle(todo)}
                aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
                style={{
                    width: 18,
                    height: 18,
                    flexShrink: 0,
                    borderRadius: 4,
                    border: todo.completed
                        ? "1px solid var(--green)"
                        : "1px solid var(--border-2)",
                    background: todo.completed ? "var(--green-bg)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "var(--green)",
                    fontSize: 11,
                    padding: 0,
                }}
            >
                {todo.completed && (
                    <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                )}
            </button>

            <span
                style={{
                    flex: 1,
                    fontSize: 13,
                    color: todo.completed ? "var(--text-3)" : "var(--text)",
                    textDecoration: todo.completed ? "line-through" : "none",
                }}
            >
                {todo.text}
            </span>

            {todo.completed && todo.completionDate && todo.completionDate !== todo.date && (
                <span
                    style={{
                        fontSize: 11,
                        color: "var(--text-3)",
                        display: hovered ? "inline" : "none",
                    }}
                >
                    done {todo.completionDate}
                </span>
            )}

            <button
                onClick={() => onDelete(todo.todoId)}
                aria-label="Delete todo"
                style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-3)",
                    fontSize: 18,
                    lineHeight: 1,
                    padding: "0 2px",
                    opacity: hovered ? 1 : 0,
                    transition: "opacity 0.1s, color 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--red)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
            >
                ×
            </button>
        </div>
    );
}
