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
    totalRecoveryLabel?: string;
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

export type WeekMetrics = {
    totalBlocks: number;
    interruptedBlocks: number;
    fragmentationRate: number;
    focusBlocks: number;
    topFragmenters: { code: string; count: number }[];
    totalActiveMinutes: number;
    totalActiveLabel: string;
    totalRecoveryMinutes?: number;
    totalRecoveryLabel?: string;
};

export type WeekReflection = {
    topFragmenters: string[];
    notPerformanceIssues: string[];
    oneChangeNextWeek: string;
};

export type SprintRollup = {
    sprintId: string;
    name: string;
    startDate: string;
    endDate: string;
    durationDays: number;
    metrics: WeekMetrics;
    reflection: WeekReflection;
};

export type SprintSummaryItem = {
    sprintId: string;
    name?: string;
    startDate?: string;
    endDate?: string;
    durationDays?: number;
    savedAt?: string | null;
    topFragmenters: string[];
    notPerformanceIssues: string[];
    oneChangeNextWeek: string;
    metrics: WeekMetrics;
};

export type SprintSummaryListResponse = {
    items: SprintSummaryItem[];
};

export type SprintDefinition = {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    durationDays: number;
    isArchived: boolean;
};

export type SprintListResponse = {
    items: SprintDefinition[];
};

export type ProjectDefinition = {
    id: string;
    name: string;
    description?: string | null;
    allocationStartDate?: string | null;
    allocationEndDate?: string | null;
    isActive: boolean;
};

export type ProjectListResponse = {
    items: ProjectDefinition[];
};

export type ProjectMember = {
    id: string;
    projectId: string;
    name: string;
    email?: string | null;
    role: string;
    isActive: boolean;
};

export type ProjectContact = {
    id: string;
    projectId: string;
    name: string;
    email?: string | null;
    contactRole: string;
    isPrimary: boolean;
};

export type TeamAllocation = {
    id: string;
    projectId: string;
    teamMemberId: string;
    startDate: string;
    endDate?: string | null;
    allocationPercentage: number;
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
    },

    sprints: {
        list: () => fetchJson<SprintListResponse>("/sprints"),
        create: (name: string, startDate: string, durationDays: number) =>
            fetchJson<SprintDefinition>("/sprints", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, startDate, durationDays }),
            }),
        update: (
            sprintId: string,
            data: {
                name?: string;
                startDate?: string;
                durationDays?: number;
                forceRecalculate?: boolean;
            }
        ) =>
            fetchJson<{ ok: boolean; requiresConfirmation?: boolean; warning?: string } & Partial<SprintDefinition>>(
                `/sprints/${sprintId}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                }
            ),
        getRollup: (sprintId: string) => fetchJson<SprintRollup>(`/sprints/${sprintId}/rollup`),
        saveSummary: (sprintId: string, data: WeeklySummaryRequest) =>
            fetchJson(`/sprints/${sprintId}/summary`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }),
        getSummaries: () => fetchJson<SprintSummaryListResponse>("/sprints/summaries"),
    },

    projects: {
        list: () => fetchJson<ProjectListResponse>("/projects"),
        create: (data: {
            name: string;
            description?: string;
            allocationStartDate?: string;
            allocationEndDate?: string;
        }) =>
            fetchJson<ProjectDefinition>("/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }),
        get: (projectId: string) => fetchJson<ProjectDefinition>(`/projects/${projectId}`),
        update: (projectId: string, data: Partial<ProjectDefinition>) =>
            fetchJson<ProjectDefinition>(`/projects/${projectId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }),
        getConfig: (projectId: string) => fetchJson<{ id: string; projectId: string; defaultSprintDurationDays: number }>(`/projects/${projectId}/config`),
        updateConfig: (projectId: string, data: { defaultSprintDurationDays?: number }) =>
            fetchJson<{ id: string; projectId: string; defaultSprintDurationDays: number }>(`/projects/${projectId}/config`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }),
        listMembers: (projectId: string) => fetchJson<{ items: ProjectMember[] }>(`/projects/${projectId}/members`),
        createMember: (projectId: string, data: { name: string; email?: string; role?: string }) =>
            fetchJson<ProjectMember>(`/projects/${projectId}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }),
        listContacts: (projectId: string) => fetchJson<{ items: ProjectContact[] }>(`/projects/${projectId}/contacts`),
        createContact: (
            projectId: string,
            data: { name: string; email?: string; contactRole?: string; isPrimary?: boolean }
        ) =>
            fetchJson<ProjectContact>(`/projects/${projectId}/contacts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }),
        listAllocations: (projectId: string) => fetchJson<{ items: TeamAllocation[] }>(`/projects/${projectId}/allocations`),
        createAllocation: (
            projectId: string,
            data: { teamMemberId: string; startDate: string; endDate?: string; allocationPercentage?: number }
        ) =>
            fetchJson<TeamAllocation>(`/projects/${projectId}/allocations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }),
    },

    recovery: {
        start: (kind: "COFFEE" | "LUNCH", date: string) =>
            fetchJson<{ blockId: string }>("/recovery/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ kind, date }),
            }),
        end: (blockId: string, durationMinutes: number) =>
            fetchJson("/recovery/end", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ blockId, durationMinutes }),
            }),
    },

    export: {
        day: async (date: string) => {
            const res = await fetch(`${BASE_URL}/export/day/${date}`, { method: "POST" });
            if (!res.ok) throw new Error("Export failed");
            return res.blob();
        }
    }
};
