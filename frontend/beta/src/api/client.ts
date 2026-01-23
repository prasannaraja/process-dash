const BASE_URL = import.meta.env.VITE_API_BASE || "/api";

export type DailyIntentsView = {
    date: string;
    intents: string[];
};

export type Block = {
    blockId: string;
    intent: string;
    notes?: string;
    actualOutcome?: string;
    durationMinutes?: number;
    durationLabel?: string;
    interrupted: boolean;
    reasonCode?: string;
    date: string;
};

export type DayMetrics = {
    totalBlocks: number;
    interruptedBlocks: number;
    fragmentationRate: number;
    focusBlocks: number;
    totalActiveLabel?: string;
};

export type DayRollup = {
    date: string;
    intents: string[];
    blocks: Block[];
    metrics: DayMetrics;
};

export type WeeklySummaryRequest = {
    topFragmenters: string[];
    notPerformanceIssues: string[];
    oneChangeNextWeek: string;
};

// --- Client ---

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${url}`, options);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`API Error ${res.status}: ${text}`);
    }
    return res.json();
}

export const api = {
    health: () => fetchJson<{ status: string }>("/health"),

    intents: {
        setDaily: (date: string, intents: string[]) =>
            fetchJson("/intents/daily", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date, intents }),
            }),
        getDaily: (date: string) => fetchJson<DailyIntentsView>(`/intents/daily/${date}`),
    },

    blocks: {
        start: (date: string, intent: string, notes?: string) =>
            fetchJson<{ blockId: string }>("/blocks/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date, intent, notes }),
            }),
        interrupt: (blockId: string, reasonCode: string) =>
            fetchJson("/blocks/interrupt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ blockId, reasonCode }),
            }),
        end: (blockId: string, actualOutcome?: string, durationMinutes?: number) =>
            fetchJson("/blocks/end", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ blockId, actualOutcome, durationMinutes }),
            }),
    },

    reports: {
        getDay: (date: string) => fetchJson<DayRollup>(`/days/${date}`),
        getWeek: (yearWeek: string) => fetchJson<any>(`/weeks/${yearWeek}`), // Typing loose for now
        saveWeeklySummary: (yearWeek: string, data: WeeklySummaryRequest) =>
            fetchJson(`/weeks/${yearWeek}/summary`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }),
    },

    export: {
        day: (date: string) => fetchJson<{ path: string }>(`/export/day/${date}`, { method: "POST" }),
    }
};
