"""
OpenAI-format tool definitions that mirror the MCP server tools.
These are sent to the LLM so it knows what actions are available.
"""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_day",
            "description": (
                "Fetch the full day rollup for a given date. Returns focus blocks "
                "(with storyId, duration, interruptions), recovery blocks, todos, "
                "daily intents, and computed metrics (fragmentation rate, focus time, etc.). "
                "Call this before logging anything new to see what's already been captured today."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {"type": "string", "description": "Date in YYYY-MM-DD format"}
                },
                "required": ["date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_intents",
            "description": "Set the daily focus intentions (max 5) for a given date.",
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {"type": "string"},
                    "intents": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of intentions",
                    },
                },
                "required": ["date", "intents"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "start_block",
            "description": (
                "Start a focus block. Link to a user story with storyId when known. "
                "Always call get_day first if you need to know the current state."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {"type": "string"},
                    "intent": {"type": "string", "description": "What the user is working on"},
                    "notes": {"type": "string"},
                    "storyId": {"type": "string", "description": "UUID of the user story"},
                    "projectId": {"type": "string"},
                },
                "required": ["date", "intent"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "interrupt_block",
            "description": "Record an interruption on an in-progress block.",
            "parameters": {
                "type": "object",
                "properties": {
                    "blockId": {"type": "string"},
                    "reasonCode": {
                        "type": "string",
                        "enum": ["MEETING", "DEPENDENCY", "CONTEXT_SWITCH", "FAMILY",
                                 "EMOTIONAL_LOAD", "TECH_ISSUE", "UNPLANNED_REQUEST"],
                    },
                },
                "required": ["blockId", "reasonCode"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "end_block",
            "description": "End a focus block. Provide duration and optional outcome note.",
            "parameters": {
                "type": "object",
                "properties": {
                    "blockId": {"type": "string"},
                    "durationMinutes": {"type": "integer"},
                    "actualOutcome": {"type": "string"},
                },
                "required": ["blockId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "start_recovery",
            "description": "Log the start of a coffee or lunch break.",
            "parameters": {
                "type": "object",
                "properties": {
                    "kind": {"type": "string", "enum": ["COFFEE", "LUNCH"]},
                    "date": {"type": "string"},
                },
                "required": ["kind", "date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "end_recovery",
            "description": "End a recovery break.",
            "parameters": {
                "type": "object",
                "properties": {
                    "blockId": {"type": "string"},
                    "durationMinutes": {"type": "integer"},
                },
                "required": ["blockId", "durationMinutes"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_sprint",
            "description": (
                "Create a new sprint. Confirm name, start date, and duration with the user before calling. "
                "Typical durations: 7 days (1 week) or 14 days (2 weeks)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Sprint name, e.g. 'Sprint 12'"},
                    "startDate": {"type": "string", "description": "Start date YYYY-MM-DD"},
                    "durationDays": {"type": "integer", "description": "Length in days (e.g. 7 or 14)"},
                    "projectId": {"type": "string", "description": "Optional project UUID"},
                },
                "required": ["name", "startDate", "durationDays"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_sprints",
            "description": (
                "List sprint definitions. Call this to find the current sprint ID "
                "before fetching rollups or stories."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "projectId": {"type": "string"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_sprint_rollup",
            "description": (
                "Get full sprint metrics: block counts, fragmentation, story delivery, "
                "velocity, point delivery, and reflection notes. Use for stand-up prep or retro."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "sprintId": {"type": "string"},
                },
                "required": ["sprintId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_stories",
            "description": (
                "List user stories for a sprint. Filter by status to find what's "
                "in progress or not started."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "sprintId": {"type": "string"},
                    "projectId": {"type": "string"},
                    "status": {
                        "type": "string",
                        "enum": ["TODO", "IN_PROGRESS", "DONE", "CARRIED_OVER"],
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_story",
            "description": "Add a new user story to a sprint.",
            "parameters": {
                "type": "object",
                "properties": {
                    "sprintId": {"type": "string"},
                    "title": {"type": "string"},
                    "storyPoints": {
                        "type": "integer",
                        "enum": [1, 2, 3, 5, 8, 13],
                    },
                    "description": {"type": "string"},
                },
                "required": ["sprintId", "title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_sprint",
            "description": "Rename a sprint or change its start date / duration. If it already has summaries, set forceRecalculate=true to confirm.",
            "parameters": {
                "type": "object",
                "properties": {
                    "sprintId":         {"type": "string", "description": "UUID of the sprint"},
                    "name":             {"type": "string", "description": "New name (optional)"},
                    "startDate":        {"type": "string", "description": "New start date YYYY-MM-DD (optional)"},
                    "durationDays":     {"type": "integer", "description": "New duration in days (optional)"},
                    "forceRecalculate": {"type": "boolean", "description": "Confirm recalculation when summaries exist"},
                },
                "required": ["sprintId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_sprint_summaries",
            "description": "List saved sprint reflection summaries for all sprints.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "save_sprint_summary",
            "description": "Save the weekly reflection for a sprint.",
            "parameters": {
                "type": "object",
                "properties": {
                    "sprintId":             {"type": "string"},
                    "topFragmenters":       {"type": "array", "items": {"type": "string"}},
                    "notPerformanceIssues": {"type": "array", "items": {"type": "string"}},
                    "oneChangeNextWeek":    {"type": "string"},
                },
                "required": ["sprintId", "topFragmenters", "notPerformanceIssues", "oneChangeNextWeek"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_story_status",
            "description": "Change the status of a user story (TODO→IN_PROGRESS→DONE or CARRIED_OVER).",
            "parameters": {
                "type": "object",
                "properties": {
                    "storyId": {"type": "string"},
                    "status": {
                        "type": "string",
                        "enum": ["TODO", "IN_PROGRESS", "DONE", "CARRIED_OVER"],
                    },
                },
                "required": ["storyId", "status"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_story",
            "description": "Edit a user story's title, description, story points, or status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "storyId":     {"type": "string", "description": "UUID of the story"},
                    "title":       {"type": "string"},
                    "description": {"type": "string"},
                    "storyPoints": {"type": "integer"},
                    "status":      {"type": "string", "enum": ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"]},
                },
                "required": ["storyId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_story",
            "description": "Delete a user story. Confirm with the user first.",
            "parameters": {
                "type": "object",
                "properties": {
                    "storyId": {"type": "string", "description": "UUID of the story"},
                },
                "required": ["storyId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "tag_story",
            "description": "Set (replace) the tags on a user story, e.g. [\"PSP\",\"TSP\"]. Pass [] to clear all tags.",
            "parameters": {
                "type": "object",
                "properties": {
                    "storyId": {"type": "string", "description": "UUID of the story"},
                    "tags": {"type": "array", "items": {"type": "string"}, "description": "New tag list"},
                },
                "required": ["storyId", "tags"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "close_sprint",
            "description": "Mark a sprint as closed. Returns unfinished stories. Always ask the user which to carry forward before calling carry_forward_stories.",
            "parameters": {
                "type": "object",
                "properties": {
                    "sprintId": {"type": "string", "description": "UUID of the sprint"},
                },
                "required": ["sprintId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "carry_forward_stories",
            "description": "Copy selected stories from a closed sprint to a target sprint. Originals become CARRIED_OVER.",
            "parameters": {
                "type": "object",
                "properties": {
                    "sprintId":       {"type": "string"},
                    "storyIds":       {"type": "array", "items": {"type": "string"}},
                    "targetSprintId": {"type": "string"},
                },
                "required": ["sprintId", "storyIds", "targetSprintId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_todos",
            "description": "Fetch the todo list for a given date.",
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {"type": "string"},
                },
                "required": ["date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_todo",
            "description": "Add a todo item for a given date.",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {"type": "string"},
                    "date": {"type": "string"},
                },
                "required": ["text", "date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "complete_todo",
            "description": "Mark a todo as completed.",
            "parameters": {
                "type": "object",
                "properties": {
                    "todoId": {"type": "string"},
                    "completionDate": {"type": "string"},
                },
                "required": ["todoId", "completionDate"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "uncomplete_todo",
            "description": "Mark a completed todo as not done.",
            "parameters": {
                "type": "object",
                "properties": {
                    "todoId":         {"type": "string"},
                    "completionDate": {"type": "string", "description": "YYYY-MM-DD"},
                },
                "required": ["todoId", "completionDate"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_todo",
            "description": "Permanently delete a todo item.",
            "parameters": {
                "type": "object",
                "properties": {
                    "todoId": {"type": "string"},
                },
                "required": ["todoId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_projects",
            "description": "List all active projects (name and UUID).",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_project",
            "description": (
                "Create a new project. Use this when the user names a project that doesn't exist yet. "
                "Don't ask the user for a UUID — create the project first, then use its ID."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Project name"},
                    "description": {"type": "string", "description": "Optional short description"},
                },
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_projects_dashboard",
            "description": "Get a summary dashboard of all projects — overall health and activity.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_project_report",
            "description": "Get detailed activity data for a specific project.",
            "parameters": {
                "type": "object",
                "properties": {
                    "projectId": {"type": "string"},
                },
                "required": ["projectId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_project_members",
            "description": "List all team members on a project.",
            "parameters": {
                "type": "object",
                "properties": {"projectId": {"type": "string"}},
                "required": ["projectId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_project_member",
            "description": "Add a team member to a project.",
            "parameters": {
                "type": "object",
                "properties": {
                    "projectId": {"type": "string"},
                    "name":      {"type": "string"},
                    "email":     {"type": "string"},
                    "role":      {"type": "string", "enum": ["LEAD", "CONTRIBUTOR", "OBSERVER"]},
                },
                "required": ["projectId", "name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_project_member",
            "description": "Update a team member's name, email, role, or active status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "projectId": {"type": "string"},
                    "memberId":  {"type": "string"},
                    "name":      {"type": "string"},
                    "email":     {"type": "string"},
                    "role":      {"type": "string", "enum": ["LEAD", "CONTRIBUTOR", "OBSERVER"]},
                    "isActive":  {"type": "boolean"},
                },
                "required": ["projectId", "memberId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_project_contacts",
            "description": "List stakeholder contacts for a project.",
            "parameters": {
                "type": "object",
                "properties": {"projectId": {"type": "string"}},
                "required": ["projectId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_project_contact",
            "description": "Add a stakeholder contact to a project.",
            "parameters": {
                "type": "object",
                "properties": {
                    "projectId":   {"type": "string"},
                    "name":        {"type": "string"},
                    "email":       {"type": "string"},
                    "contactRole": {"type": "string", "enum": ["STAKEHOLDER", "MANAGER", "TECH_LEAD"]},
                    "isPrimary":   {"type": "boolean"},
                },
                "required": ["projectId", "name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_project_allocations",
            "description": "List time allocations for team members on a project.",
            "parameters": {
                "type": "object",
                "properties": {"projectId": {"type": "string"}},
                "required": ["projectId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_project_allocation",
            "description": "Record a team member's time allocation on a project. Call list_project_members first to get the teamMemberId.",
            "parameters": {
                "type": "object",
                "properties": {
                    "projectId":            {"type": "string"},
                    "teamMemberId":         {"type": "string"},
                    "startDate":            {"type": "string", "description": "YYYY-MM-DD"},
                    "endDate":              {"type": "string", "description": "YYYY-MM-DD (optional)"},
                    "allocationPercentage": {"type": "integer", "description": "1-100"},
                },
                "required": ["projectId", "teamMemberId", "startDate"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_project_config",
            "description": "Get a project's config — default sprint duration and GitHub settings.",
            "parameters": {
                "type": "object",
                "properties": {"projectId": {"type": "string"}},
                "required": ["projectId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_project_config",
            "description": "Update a project's default sprint duration or GitHub repo/username.",
            "parameters": {
                "type": "object",
                "properties": {
                    "projectId":                 {"type": "string"},
                    "defaultSprintDurationDays": {"type": "integer"},
                    "githubRepo":                {"type": "string", "description": "owner/repo format"},
                    "githubUsername":            {"type": "string"},
                },
                "required": ["projectId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_project",
            "description": (
                "Update an existing project — rename it, change its description, or set its allocation start/end dates. "
                "Call list_projects first to resolve the project name to an ID."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "projectId":           {"type": "string", "description": "UUID of the project"},
                    "name":                {"type": "string", "description": "New name (optional)"},
                    "description":         {"type": "string", "description": "New description (optional)"},
                    "allocationStartDate": {"type": "string", "description": "Allocation start date YYYY-MM-DD (optional)"},
                    "allocationEndDate":   {"type": "string", "description": "Allocation end date YYYY-MM-DD (optional)"},
                },
                "required": ["projectId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_project",
            "description": (
                "Permanently delete a project by ID. "
                "Call list_projects first to resolve the name to an ID. "
                "Confirm with the user before deleting."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "projectId": {"type": "string", "description": "UUID of the project to delete"},
                },
                "required": ["projectId"],
            },
        },
    },

    # ── Financial Years ────────────────────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "list_financial_years",
            "description": "List all financial years in the organisation, including labels, dates, org goals, and which is current.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_current_financial_year",
            "description": "Get the currently active financial year with its org goal and previous year feedback.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_financial_year",
            "description": "Create a new financial year for the organisation.",
            "parameters": {
                "type": "object",
                "properties": {
                    "label":            {"type": "string", "description": "Label e.g. 'FY 2025-26'"},
                    "startDate":        {"type": "string", "description": "Start date YYYY-MM-DD"},
                    "endDate":          {"type": "string", "description": "End date YYYY-MM-DD"},
                    "orgGoal":          {"type": "string", "description": "Organisation goal for this year (optional)"},
                    "prevYearFeedback": {"type": "string", "description": "Lessons learned from previous year (optional)"},
                    "isCurrent":        {"type": "boolean", "description": "Make this the active financial year"},
                },
                "required": ["label", "startDate", "endDate"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_financial_year",
            "description": "Update an existing financial year's org goal, feedback, or mark it as current.",
            "parameters": {
                "type": "object",
                "properties": {
                    "fyId":             {"type": "string", "description": "UUID of the financial year"},
                    "orgGoal":          {"type": "string", "description": "New org goal text"},
                    "prevYearFeedback": {"type": "string", "description": "Updated previous year feedback"},
                    "isCurrent":        {"type": "boolean", "description": "Set true to make this the active FY"},
                },
                "required": ["fyId"],
            },
        },
    },

    # ── Sprint Tasks ───────────────────────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "list_sprint_tasks",
            "description": "List all checklist tasks for a sprint (non-story work like admin, ops, meetings).",
            "parameters": {
                "type": "object",
                "properties": {
                    "sprintId": {"type": "string", "description": "UUID of the sprint"},
                },
                "required": ["sprintId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_sprint_task",
            "description": "Add a checklist task to a sprint.",
            "parameters": {
                "type": "object",
                "properties": {
                    "sprintId": {"type": "string", "description": "UUID of the sprint"},
                    "title":    {"type": "string", "description": "Task title"},
                },
                "required": ["sprintId", "title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "toggle_sprint_task",
            "description": "Mark a sprint task as done or reopen it.",
            "parameters": {
                "type": "object",
                "properties": {
                    "sprintId": {"type": "string", "description": "UUID of the sprint"},
                    "taskId":   {"type": "string", "description": "UUID of the task"},
                    "isDone":   {"type": "boolean", "description": "True to mark done, false to reopen"},
                },
                "required": ["sprintId", "taskId", "isDone"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_sprint_task",
            "description": "Delete a sprint task permanently.",
            "parameters": {
                "type": "object",
                "properties": {
                    "sprintId": {"type": "string", "description": "UUID of the sprint"},
                    "taskId":   {"type": "string", "description": "UUID of the task to delete"},
                },
                "required": ["sprintId", "taskId"],
            },
        },
    },
]
