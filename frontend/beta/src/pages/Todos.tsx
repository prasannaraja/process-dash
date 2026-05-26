import { useState, useEffect, useRef } from "react";
import { api, type Todo } from "../api/client";

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
            // Uncomplete — pass today as completionDate (used for uncomplete event; backend ignores it for metric)
            await api.todos.uncomplete(todo.todoId, today);
        } else {
            // Complete — record today as the completion date (Option A)
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
        <div className="p-4 max-w-2xl mx-auto space-y-6">
            <header className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Todos</h1>
                <input
                    type="date"
                    className="border p-1 rounded text-sm"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                />
            </header>

            {/* Progress bar */}
            {todos.length > 0 && (
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>{completed.length} of {todos.length} done</span>
                        <span>{Math.round((completed.length / todos.length) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(completed.length / todos.length) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Add input */}
            <div className="flex gap-2">
                <input
                    ref={inputRef}
                    type="text"
                    className="flex-1 border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="Add a todo and press Enter…"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button
                    onClick={handleAdd}
                    disabled={!inputText.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-40 font-medium"
                >
                    Add
                </button>
            </div>

            {loading && <p className="text-sm text-gray-400">Loading…</p>}

            {/* Pending todos */}
            {pending.length > 0 && (
                <section className="space-y-2">
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        To Do ({pending.length})
                    </h2>
                    <ul className="space-y-1">
                        {pending.map((todo) => (
                            <TodoRow
                                key={todo.todoId}
                                todo={todo}
                                onToggle={handleToggle}
                                onDelete={handleDelete}
                            />
                        ))}
                    </ul>
                </section>
            )}

            {/* Completed todos */}
            {completed.length > 0 && (
                <section className="space-y-2">
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Completed ({completed.length})
                    </h2>
                    <ul className="space-y-1">
                        {completed.map((todo) => (
                            <TodoRow
                                key={todo.todoId}
                                todo={todo}
                                onToggle={handleToggle}
                                onDelete={handleDelete}
                            />
                        ))}
                    </ul>
                </section>
            )}

            {!loading && todos.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                    <p className="text-4xl mb-3">✓</p>
                    <p className="text-sm">No todos for {date === today ? "today" : date}. Add one above.</p>
                </div>
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
    return (
        <li className="flex items-center gap-3 group bg-white border rounded px-3 py-2 hover:border-gray-300 transition-colors">
            <button
                onClick={() => onToggle(todo)}
                className={`w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                    todo.completed
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-gray-300 hover:border-green-400"
                }`}
                aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
            >
                {todo.completed && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </button>

            <span
                className={`flex-1 text-sm ${
                    todo.completed ? "line-through text-gray-400" : "text-gray-800"
                }`}
            >
                {todo.text}
            </span>

            {todo.completed && todo.completionDate && todo.completionDate !== todo.date && (
                <span className="text-xs text-gray-400 hidden group-hover:inline">
                    done {todo.completionDate}
                </span>
            )}

            <button
                onClick={() => onDelete(todo.todoId)}
                className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none"
                aria-label="Delete todo"
            >
                ×
            </button>
        </li>
    );
}
