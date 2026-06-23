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
]
