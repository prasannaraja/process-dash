"""
process-dash-core-mcp — MCP server for Process Dash.

Exposes process-dash-core-api as MCP tools so any MCP host
(Claude Desktop, process-dash-copilot, etc.) can interact with
work observability data in natural language.

Transport:
  stdio (default)  — for Claude Desktop / local MCP hosts
  sse              — for Docker service-to-service use

Usage:
  python server.py                     # stdio
  python server.py --transport sse     # SSE on $PORT (default 3100)
"""

import argparse
import asyncio
import json
import sys
from typing import Any

import mcp.types as types
from mcp.server import Server
from mcp.server.stdio import stdio_server

import api_client as api

# ── Server init ────────────────────────────────────────────────────────────────

app = Server("process-dash-core-mcp")

# ── Tool definitions ───────────────────────────────────────────────────────────

TOOLS = [
    types.Tool(
        name="get_day",
        description=(
            "Fetch the full day rollup for a given date. Returns focus blocks "
            "(with storyId, duration, interruptions), recovery blocks, todos, "
            "daily intents, and computed metrics (fragmentation rate, focus time, etc.). "
            "Use this whenever the user asks about their day, or before logging anything "
            "so you can see what's already been captured."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "date": {"type": "string", "description": "Date in YYYY-MM-DD format"}
            },
            "required": ["date"],
        },
    ),
    types.Tool(
        name="set_intents",
        description=(
            "Set the daily intentions for a given date (max 5). "
            "Call this when the user declares what they plan to focus on today."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "date": {"type": "string", "description": "Date in YYYY-MM-DD format"},
                "intents": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of intentions, max 5",
                },
            },
            "required": ["date", "intents"],
        },
    ),
    types.Tool(
        name="start_block",
        description=(
            "Start a focus block. Call this when the user begins working on something. "
            "Optionally link to a user story via storyId."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "date": {"type": "string", "description": "Date in YYYY-MM-DD format"},
                "intent": {"type": "string", "description": "What the user is working on"},
                "notes": {"type": "string", "description": "Optional extra context"},
                "storyId": {"type": "string", "description": "Optional user story UUID to link this block to"},
                "projectId": {"type": "string", "description": "Optional project UUID"},
            },
            "required": ["date", "intent"],
        },
    ),
    types.Tool(
        name="interrupt_block",
        description=(
            "Record an interruption against a focus block that is already in progress. "
            "Valid reason codes: MEETING, DEPENDENCY, CONTEXT_SWITCH, FAMILY, "
            "EMOTIONAL_LOAD, TECH_ISSUE, UNPLANNED_REQUEST"
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "blockId": {"type": "string", "description": "UUID of the in-progress block"},
                "reasonCode": {
                    "type": "string",
                    "enum": ["MEETING", "DEPENDENCY", "CONTEXT_SWITCH", "FAMILY",
                             "EMOTIONAL_LOAD", "TECH_ISSUE", "UNPLANNED_REQUEST"],
                    "description": "Reason the block was interrupted",
                },
            },
            "required": ["blockId", "reasonCode"],
        },
    ),
    types.Tool(
        name="end_block",
        description=(
            "End a focus block. Provide the actual duration in minutes and optionally "
            "a brief outcome note."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "blockId": {"type": "string", "description": "UUID of the block to end"},
                "durationMinutes": {"type": "integer", "description": "Actual time spent in minutes"},
                "actualOutcome": {"type": "string", "description": "Brief description of what was achieved"},
            },
            "required": ["blockId"],
        },
    ),
    types.Tool(
        name="start_recovery",
        description="Log the start of a recovery break. kind must be COFFEE or LUNCH.",
        inputSchema={
            "type": "object",
            "properties": {
                "kind": {"type": "string", "enum": ["COFFEE", "LUNCH"]},
                "date": {"type": "string", "description": "Date in YYYY-MM-DD format"},
            },
            "required": ["kind", "date"],
        },
    ),
    types.Tool(
        name="end_recovery",
        description="End a recovery break and record how long it lasted.",
        inputSchema={
            "type": "object",
            "properties": {
                "blockId": {"type": "string", "description": "UUID of the recovery block"},
                "durationMinutes": {"type": "integer", "description": "Duration in minutes"},
            },
            "required": ["blockId", "durationMinutes"],
        },
    ),
    types.Tool(
        name="create_sprint",
        description=(
            "Create a new sprint. Ask the user for a name, start date, and duration if not provided. "
            "Duration is in days (typical values: 7, 14). "
            "Always confirm the details before calling this tool."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Sprint name, e.g. 'Sprint 12' or 'Auth & Payments'"},
                "startDate": {"type": "string", "description": "Start date in YYYY-MM-DD format"},
                "durationDays": {"type": "integer", "description": "Length of the sprint in days (e.g. 7 or 14)"},
                "projectId": {"type": "string", "description": "Optional project UUID to associate the sprint with"},
            },
            "required": ["name", "startDate", "durationDays"],
        },
    ),
    types.Tool(
        name="list_sprints",
        description=(
            "List sprint definitions. Optionally filter by projectId. "
            "Use this to discover the current or recent sprint before asking about stories or rollups."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "projectId": {"type": "string", "description": "Optional project UUID to filter by"},
            },
        },
    ),
    types.Tool(
        name="get_sprint_rollup",
        description=(
            "Get full sprint metrics: blocks, interruptions, fragmentation rate, "
            "story delivery (committed vs done vs carried over), velocity, "
            "point delivery, and reflection notes. "
            "Use this when the user asks about sprint progress or wants retro material."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "sprintId": {"type": "string", "description": "UUID of the sprint"},
            },
            "required": ["sprintId"],
        },
    ),
    types.Tool(
        name="update_sprint",
        description="Rename a sprint or change its start date / duration. If the sprint already has summaries, set forceRecalculate=true to confirm the change.",
        inputSchema={
            "type": "object",
            "properties": {
                "sprintId":         {"type": "string", "description": "UUID of the sprint"},
                "name":             {"type": "string", "description": "New sprint name (optional)"},
                "startDate":        {"type": "string", "description": "New start date YYYY-MM-DD (optional)"},
                "durationDays":     {"type": "integer", "description": "New duration in days (optional)"},
                "forceRecalculate": {"type": "boolean", "description": "Confirm date/duration change when summaries exist"},
            },
            "required": ["sprintId"],
        },
    ),
    types.Tool(
        name="list_sprint_summaries",
        description="List saved sprint reflection summaries for all sprints.",
        inputSchema={"type": "object", "properties": {}},
    ),
    types.Tool(
        name="save_sprint_summary",
        description="Save the weekly reflection summary for a sprint (top fragmenters, non-performance issues, one change for next week).",
        inputSchema={
            "type": "object",
            "properties": {
                "sprintId":               {"type": "string", "description": "UUID of the sprint"},
                "topFragmenters":         {"type": "array", "items": {"type": "string"}, "description": "List of top interruption reasons"},
                "notPerformanceIssues":   {"type": "array", "items": {"type": "string"}, "description": "Things that were not performance issues"},
                "oneChangeNextWeek":      {"type": "string", "description": "One thing to change next sprint"},
            },
            "required": ["sprintId", "topFragmenters", "notPerformanceIssues", "oneChangeNextWeek"],
        },
    ),
    types.Tool(
        name="list_stories",
        description=(
            "List user stories for a sprint. Optionally filter by status "
            "(TODO, IN_PROGRESS, DONE, CARRIED_OVER). "
            "Use this before starting a block to find the right storyId, or "
            "when the user asks what's left to do in the sprint."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "sprintId": {"type": "string", "description": "Sprint UUID"},
                "projectId": {"type": "string", "description": "Optional project UUID"},
                "status": {
                    "type": "string",
                    "enum": ["TODO", "IN_PROGRESS", "DONE", "CARRIED_OVER"],
                    "description": "Filter by story status",
                },
            },
        },
    ),
    types.Tool(
        name="create_story",
        description=(
            "Add a new user story to a sprint. storyPoints must be a Fibonacci value: "
            "1, 2, 3, 5, 8, or 13."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "sprintId": {"type": "string", "description": "Sprint UUID"},
                "title": {"type": "string", "description": "Story title (as-a-user format preferred)"},
                "storyPoints": {
                    "type": "integer",
                    "enum": [1, 2, 3, 5, 8, 13],
                    "description": "Fibonacci story point estimate",
                },
                "description": {"type": "string", "description": "Optional longer description"},
            },
            "required": ["sprintId", "title"],
        },
    ),
    types.Tool(
        name="update_story_status",
        description=(
            "Advance or change the status of a user story. "
            "Valid transitions: TODO → IN_PROGRESS → DONE (or CARRIED_OVER). "
            "Use CARRIED_OVER for stories that didn't complete this sprint."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "storyId": {"type": "string", "description": "Story UUID"},
                "status": {
                    "type": "string",
                    "enum": ["TODO", "IN_PROGRESS", "DONE", "CARRIED_OVER"],
                },
            },
            "required": ["storyId", "status"],
        },
    ),
    types.Tool(
        name="update_story",
        description="Edit a user story's title, description, story points, or status in one call.",
        inputSchema={
            "type": "object",
            "properties": {
                "storyId":      {"type": "string", "description": "UUID of the story"},
                "title":        {"type": "string", "description": "New title (optional)"},
                "description":  {"type": "string", "description": "New description (optional)"},
                "storyPoints":  {"type": "integer", "description": "New story point estimate (optional)"},
                "status":       {"type": "string", "enum": ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"], "description": "New status (optional)"},
            },
            "required": ["storyId"],
        },
    ),
    types.Tool(
        name="delete_story",
        description="Soft-delete a user story. Confirm with the user before deleting.",
        inputSchema={
            "type": "object",
            "properties": {
                "storyId": {"type": "string", "description": "UUID of the story to delete"},
            },
            "required": ["storyId"],
        },
    ),
    types.Tool(
        name="get_todos",
        description="Fetch the todo list for a given date.",
        inputSchema={
            "type": "object",
            "properties": {
                "date": {"type": "string", "description": "Date in YYYY-MM-DD format"},
            },
            "required": ["date"],
        },
    ),
    types.Tool(
        name="add_todo",
        description="Add a todo item for a given date.",
        inputSchema={
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "Todo text"},
                "date": {"type": "string", "description": "Date in YYYY-MM-DD format"},
            },
            "required": ["text", "date"],
        },
    ),
    types.Tool(
        name="complete_todo",
        description="Mark a todo item as completed.",
        inputSchema={
            "type": "object",
            "properties": {
                "todoId": {"type": "string", "description": "Todo UUID"},
                "completionDate": {"type": "string", "description": "Date completed, YYYY-MM-DD"},
            },
            "required": ["todoId", "completionDate"],
        },
    ),
    types.Tool(
        name="uncomplete_todo",
        description="Mark a completed todo as not done.",
        inputSchema={
            "type": "object",
            "properties": {
                "todoId":          {"type": "string", "description": "UUID of the todo"},
                "completionDate":  {"type": "string", "description": "The date it was completed on, YYYY-MM-DD"},
            },
            "required": ["todoId", "completionDate"],
        },
    ),
    types.Tool(
        name="delete_todo",
        description="Permanently delete a todo item.",
        inputSchema={
            "type": "object",
            "properties": {
                "todoId": {"type": "string", "description": "UUID of the todo to delete"},
            },
            "required": ["todoId"],
        },
    ),
    types.Tool(
        name="list_projects",
        description=(
            "List all active projects. Use this when the user mentions a project by name "
            "and you need its UUID, or when context-resolution requires knowing the active projects."
        ),
        inputSchema={"type": "object", "properties": {}},
    ),
    types.Tool(
        name="create_project",
        description=(
            "Create a new project. Use this when the user names a project that doesn't exist yet. "
            "Confirm the name with the user before creating."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Project name"},
                "description": {"type": "string", "description": "Optional short description"},
            },
            "required": ["name"],
        },
    ),
    types.Tool(
        name="get_projects_dashboard",
        description="Get a summary dashboard of all projects — useful for understanding overall project health and activity.",
        inputSchema={"type": "object", "properties": {}},
    ),
    types.Tool(
        name="get_project_report",
        description="Get detailed activity data for a specific project.",
        inputSchema={
            "type": "object",
            "properties": {
                "projectId": {"type": "string", "description": "UUID of the project"},
            },
            "required": ["projectId"],
        },
    ),
    types.Tool(
        name="list_project_members",
        description="List all team members on a project.",
        inputSchema={
            "type": "object",
            "properties": {
                "projectId": {"type": "string", "description": "UUID of the project"},
            },
            "required": ["projectId"],
        },
    ),
    types.Tool(
        name="add_project_member",
        description="Add a team member to a project.",
        inputSchema={
            "type": "object",
            "properties": {
                "projectId": {"type": "string", "description": "UUID of the project"},
                "name":      {"type": "string", "description": "Member's full name"},
                "email":     {"type": "string", "description": "Member's email (optional)"},
                "role":      {"type": "string", "enum": ["LEAD", "CONTRIBUTOR", "OBSERVER"], "description": "Member role (default: CONTRIBUTOR)"},
            },
            "required": ["projectId", "name"],
        },
    ),
    types.Tool(
        name="update_project_member",
        description="Update a team member's name, email, role, or active status on a project.",
        inputSchema={
            "type": "object",
            "properties": {
                "projectId":  {"type": "string", "description": "UUID of the project"},
                "memberId":   {"type": "string", "description": "UUID of the team member"},
                "name":       {"type": "string", "description": "New name (optional)"},
                "email":      {"type": "string", "description": "New email (optional)"},
                "role":       {"type": "string", "enum": ["LEAD", "CONTRIBUTOR", "OBSERVER"], "description": "New role (optional)"},
                "isActive":   {"type": "boolean", "description": "Set false to deactivate (optional)"},
            },
            "required": ["projectId", "memberId"],
        },
    ),
    types.Tool(
        name="list_project_contacts",
        description="List stakeholder contacts for a project (e.g. managers, tech leads, clients).",
        inputSchema={
            "type": "object",
            "properties": {
                "projectId": {"type": "string", "description": "UUID of the project"},
            },
            "required": ["projectId"],
        },
    ),
    types.Tool(
        name="add_project_contact",
        description="Add a stakeholder contact to a project.",
        inputSchema={
            "type": "object",
            "properties": {
                "projectId":   {"type": "string", "description": "UUID of the project"},
                "name":        {"type": "string", "description": "Contact's full name"},
                "email":       {"type": "string", "description": "Contact's email (optional)"},
                "contactRole": {"type": "string", "enum": ["STAKEHOLDER", "MANAGER", "TECH_LEAD"], "description": "Contact role"},
                "isPrimary":   {"type": "boolean", "description": "Whether this is the primary contact"},
            },
            "required": ["projectId", "name"],
        },
    ),
    types.Tool(
        name="list_project_allocations",
        description="List time allocations for team members on a project.",
        inputSchema={
            "type": "object",
            "properties": {
                "projectId": {"type": "string", "description": "UUID of the project"},
            },
            "required": ["projectId"],
        },
    ),
    types.Tool(
        name="add_project_allocation",
        description="Record a team member's time allocation to a project (percentage + date range).",
        inputSchema={
            "type": "object",
            "properties": {
                "projectId":            {"type": "string", "description": "UUID of the project"},
                "teamMemberId":         {"type": "string", "description": "UUID of the team member (call list_project_members first)"},
                "startDate":            {"type": "string", "description": "Allocation start date YYYY-MM-DD"},
                "endDate":              {"type": "string", "description": "Allocation end date YYYY-MM-DD (optional)"},
                "allocationPercentage": {"type": "integer", "description": "Percentage of time (1-100, default 100)"},
            },
            "required": ["projectId", "teamMemberId", "startDate"],
        },
    ),
    types.Tool(
        name="get_project_config",
        description="Get a project's configuration — default sprint duration and GitHub settings.",
        inputSchema={
            "type": "object",
            "properties": {
                "projectId": {"type": "string", "description": "UUID of the project"},
            },
            "required": ["projectId"],
        },
    ),
    types.Tool(
        name="update_project_config",
        description="Update a project's default sprint duration or GitHub repo/username.",
        inputSchema={
            "type": "object",
            "properties": {
                "projectId":               {"type": "string", "description": "UUID of the project"},
                "defaultSprintDurationDays": {"type": "integer", "description": "Default sprint length in days"},
                "githubRepo":              {"type": "string", "description": "GitHub repo in owner/repo format"},
                "githubUsername":          {"type": "string", "description": "GitHub username for activity tracking"},
            },
            "required": ["projectId"],
        },
    ),
    types.Tool(
        name="update_project",
        description=(
            "Update an existing project's name, description, allocation start date, or allocation end date. "
            "Call list_projects first to resolve the project name to an ID."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "projectId":           {"type": "string", "description": "UUID of the project"},
                "name":                {"type": "string", "description": "New project name (optional)"},
                "description":         {"type": "string", "description": "New description (optional)"},
                "allocationStartDate": {"type": "string", "description": "Start date YYYY-MM-DD (optional)"},
                "allocationEndDate":   {"type": "string", "description": "End date YYYY-MM-DD (optional)"},
            },
            "required": ["projectId"],
        },
    ),
    types.Tool(
        name="delete_project",
        description=(
            "Permanently delete a project by its ID. "
            "Always call list_projects first to confirm the project ID and name. "
            "Ask the user to confirm before deleting."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "projectId": {"type": "string", "description": "UUID of the project to delete"},
            },
            "required": ["projectId"],
        },
    ),

    # ── Financial Years ────────────────────────────────────────────────────────
    types.Tool(
        name="list_financial_years",
        description="List all financial years in the organisation, including their labels, dates, org goals, and which is current.",
        inputSchema={"type": "object", "properties": {}},
    ),
    types.Tool(
        name="get_current_financial_year",
        description="Get the currently active financial year with its org goal and previous year feedback.",
        inputSchema={"type": "object", "properties": {}},
    ),
    types.Tool(
        name="create_financial_year",
        description="Create a new financial year for the organisation. Optionally set an org goal and mark it as current.",
        inputSchema={
            "type": "object",
            "properties": {
                "label":             {"type": "string", "description": "Human-readable label, e.g. 'FY 2025-26'"},
                "startDate":         {"type": "string", "description": "Start date in YYYY-MM-DD format"},
                "endDate":           {"type": "string", "description": "End date in YYYY-MM-DD format"},
                "orgGoal":           {"type": "string", "description": "Organisation goal for this year (optional)"},
                "prevYearFeedback":  {"type": "string", "description": "Lessons learned from previous year (optional)"},
                "isCurrent":         {"type": "boolean", "description": "Whether to make this the active financial year"},
            },
            "required": ["label", "startDate", "endDate"],
        },
    ),
    types.Tool(
        name="update_financial_year",
        description="Update an existing financial year — change the org goal, previous year feedback, or mark it as current.",
        inputSchema={
            "type": "object",
            "properties": {
                "fyId":              {"type": "string", "description": "UUID of the financial year to update"},
                "orgGoal":           {"type": "string", "description": "New org goal text (optional)"},
                "prevYearFeedback":  {"type": "string", "description": "Updated previous year feedback (optional)"},
                "isCurrent":         {"type": "boolean", "description": "Set to true to make this the active FY"},
            },
            "required": ["fyId"],
        },
    ),

    # ── Sprint Tasks ───────────────────────────────────────────────────────────
    types.Tool(
        name="list_sprint_tasks",
        description="List all checklist tasks for a sprint. Call list_sprints first if you need to resolve a sprint name to an ID.",
        inputSchema={
            "type": "object",
            "properties": {
                "sprintId": {"type": "string", "description": "UUID of the sprint"},
            },
            "required": ["sprintId"],
        },
    ),
    types.Tool(
        name="create_sprint_task",
        description="Add a new checklist task to a sprint (non-story work like admin, ops, or meetings).",
        inputSchema={
            "type": "object",
            "properties": {
                "sprintId": {"type": "string", "description": "UUID of the sprint"},
                "title":    {"type": "string", "description": "Task title"},
            },
            "required": ["sprintId", "title"],
        },
    ),
    types.Tool(
        name="toggle_sprint_task",
        description="Mark a sprint task as done or not done.",
        inputSchema={
            "type": "object",
            "properties": {
                "sprintId": {"type": "string", "description": "UUID of the sprint"},
                "taskId":   {"type": "string", "description": "UUID of the task"},
                "isDone":   {"type": "boolean", "description": "True to mark done, false to reopen"},
            },
            "required": ["sprintId", "taskId", "isDone"],
        },
    ),
    types.Tool(
        name="delete_sprint_task",
        description="Delete a sprint task permanently.",
        inputSchema={
            "type": "object",
            "properties": {
                "sprintId": {"type": "string", "description": "UUID of the sprint"},
                "taskId":   {"type": "string", "description": "UUID of the task to delete"},
            },
            "required": ["sprintId", "taskId"],
        },
    ),
]


# ── Tool dispatch ──────────────────────────────────────────────────────────────

def _ok(data: Any) -> list[types.TextContent]:
    return [types.TextContent(type="text", text=json.dumps(data, indent=2))]


def _err(msg: str) -> list[types.TextContent]:
    return [types.TextContent(type="text", text=json.dumps({"error": msg}))]


@app.list_tools()
async def list_tools() -> list[types.Tool]:
    return TOOLS


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    try:
        match name:
            case "get_day":
                return _ok(api.get_day(arguments["date"]))

            case "set_intents":
                return _ok(api.set_intents(arguments["date"], arguments["intents"]))

            case "start_block":
                return _ok(api.start_block(
                    date=arguments["date"],
                    intent=arguments["intent"],
                    notes=arguments.get("notes"),
                    project_id=arguments.get("projectId"),
                    story_id=arguments.get("storyId"),
                ))

            case "interrupt_block":
                return _ok(api.interrupt_block(arguments["blockId"], arguments["reasonCode"]))

            case "end_block":
                return _ok(api.end_block(
                    block_id=arguments["blockId"],
                    actual_outcome=arguments.get("actualOutcome"),
                    duration_minutes=arguments.get("durationMinutes"),
                ))

            case "start_recovery":
                return _ok(api.start_recovery(arguments["kind"], arguments["date"]))

            case "end_recovery":
                return _ok(api.end_recovery(arguments["blockId"], arguments["durationMinutes"]))

            case "create_sprint":
                return _ok(api.create_sprint(
                    name=arguments["name"],
                    start_date=arguments["startDate"],
                    duration_days=arguments["durationDays"],
                    project_id=arguments.get("projectId"),
                ))

            case "list_sprints":
                return _ok(api.list_sprints(project_id=arguments.get("projectId")))

            case "get_sprint_rollup":
                return _ok(api.get_sprint_rollup(arguments["sprintId"]))

            case "update_sprint":
                return _ok(api.update_sprint(
                    sprint_id=arguments["sprintId"],
                    name=arguments.get("name"),
                    start_date=arguments.get("startDate"),
                    duration_days=arguments.get("durationDays"),
                    force_recalculate=arguments.get("forceRecalculate", False),
                ))

            case "list_sprint_summaries":
                return _ok(api.list_sprint_summaries())

            case "save_sprint_summary":
                return _ok(api.save_sprint_summary(
                    sprint_id=arguments["sprintId"],
                    top_fragmenters=arguments["topFragmenters"],
                    not_performance_issues=arguments["notPerformanceIssues"],
                    one_change_next_week=arguments["oneChangeNextWeek"],
                ))

            case "list_stories":
                return _ok(api.list_stories(
                    sprint_id=arguments.get("sprintId"),
                    project_id=arguments.get("projectId"),
                    status=arguments.get("status"),
                ))

            case "create_story":
                return _ok(api.create_story(
                    sprint_id=arguments["sprintId"],
                    title=arguments["title"],
                    story_points=arguments.get("storyPoints"),
                    description=arguments.get("description"),
                ))

            case "update_story_status":
                return _ok(api.update_story_status(arguments["storyId"], arguments["status"]))

            case "get_todos":
                return _ok(api.get_todos(arguments["date"]))

            case "add_todo":
                return _ok(api.add_todo(arguments["text"], arguments["date"]))

            case "update_story":
                return _ok(api.update_story(
                    story_id=arguments["storyId"],
                    title=arguments.get("title"),
                    description=arguments.get("description"),
                    story_points=arguments.get("storyPoints"),
                    status=arguments.get("status"),
                ))

            case "delete_story":
                return _ok(api.delete_story(story_id=arguments["storyId"]))

            case "complete_todo":
                return _ok(api.complete_todo(arguments["todoId"], arguments["completionDate"]))

            case "uncomplete_todo":
                return _ok(api.uncomplete_todo(
                    todo_id=arguments["todoId"],
                    completion_date=arguments["completionDate"],
                ))

            case "delete_todo":
                return _ok(api.delete_todo(todo_id=arguments["todoId"]))

            case "list_projects":
                return _ok(api.list_projects())

            case "create_project":
                return _ok(api.create_project(
                    name=arguments["name"],
                    description=arguments.get("description"),
                ))

            case "get_projects_dashboard":
                return _ok(api.get_projects_dashboard())

            case "get_project_report":
                return _ok(api.get_project_report(project_id=arguments["projectId"]))

            case "list_project_members":
                return _ok(api.list_project_members(project_id=arguments["projectId"]))

            case "add_project_member":
                return _ok(api.add_project_member(
                    project_id=arguments["projectId"],
                    name=arguments["name"],
                    email=arguments.get("email"),
                    role=arguments.get("role", "CONTRIBUTOR"),
                ))

            case "update_project_member":
                return _ok(api.update_project_member(
                    project_id=arguments["projectId"],
                    member_id=arguments["memberId"],
                    name=arguments.get("name"),
                    email=arguments.get("email"),
                    role=arguments.get("role"),
                    is_active=arguments.get("isActive"),
                ))

            case "list_project_contacts":
                return _ok(api.list_project_contacts(project_id=arguments["projectId"]))

            case "add_project_contact":
                return _ok(api.add_project_contact(
                    project_id=arguments["projectId"],
                    name=arguments["name"],
                    email=arguments.get("email"),
                    contact_role=arguments.get("contactRole", "STAKEHOLDER"),
                    is_primary=arguments.get("isPrimary", False),
                ))

            case "list_project_allocations":
                return _ok(api.list_project_allocations(project_id=arguments["projectId"]))

            case "add_project_allocation":
                return _ok(api.add_project_allocation(
                    project_id=arguments["projectId"],
                    team_member_id=arguments["teamMemberId"],
                    start_date=arguments["startDate"],
                    end_date=arguments.get("endDate"),
                    allocation_percentage=arguments.get("allocationPercentage", 100),
                ))

            case "get_project_config":
                return _ok(api.get_project_config(project_id=arguments["projectId"]))

            case "update_project_config":
                return _ok(api.update_project_config(
                    project_id=arguments["projectId"],
                    default_sprint_duration_days=arguments.get("defaultSprintDurationDays"),
                    github_repo=arguments.get("githubRepo"),
                    github_username=arguments.get("githubUsername"),
                ))

            case "update_project":
                return _ok(api.update_project(
                    project_id=arguments["projectId"],
                    name=arguments.get("name"),
                    description=arguments.get("description"),
                    allocation_start_date=arguments.get("allocationStartDate"),
                    allocation_end_date=arguments.get("allocationEndDate"),
                ))

            case "delete_project":
                return _ok(api.delete_project(
                    project_id=arguments["projectId"],
                ))

            # ── Financial Years ────────────────────────────────────────────────
            case "list_financial_years":
                return _ok(api.list_financial_years())

            case "get_current_financial_year":
                return _ok(api.get_current_financial_year())

            case "create_financial_year":
                return _ok(api.create_financial_year(
                    label=arguments["label"],
                    start_date=arguments["startDate"],
                    end_date=arguments["endDate"],
                    org_goal=arguments.get("orgGoal"),
                    prev_year_feedback=arguments.get("prevYearFeedback"),
                    is_current=arguments.get("isCurrent", False),
                ))

            case "update_financial_year":
                return _ok(api.update_financial_year(
                    fy_id=arguments["fyId"],
                    org_goal=arguments.get("orgGoal"),
                    prev_year_feedback=arguments.get("prevYearFeedback"),
                    is_current=arguments.get("isCurrent"),
                ))

            # ── Sprint Tasks ───────────────────────────────────────────────────
            case "list_sprint_tasks":
                return _ok(api.list_sprint_tasks(
                    sprint_id=arguments["sprintId"],
                ))

            case "create_sprint_task":
                return _ok(api.create_sprint_task(
                    sprint_id=arguments["sprintId"],
                    title=arguments["title"],
                ))

            case "toggle_sprint_task":
                return _ok(api.toggle_sprint_task(
                    sprint_id=arguments["sprintId"],
                    task_id=arguments["taskId"],
                    is_done=arguments["isDone"],
                ))

            case "delete_sprint_task":
                return _ok(api.delete_sprint_task(
                    sprint_id=arguments["sprintId"],
                    task_id=arguments["taskId"],
                ))

            case _:
                return _err(f"Unknown tool: {name}")

    except Exception as exc:
        return _err(str(exc))


# ── Entry point ────────────────────────────────────────────────────────────────

async def run_stdio():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options(),
        )


async def run_sse(port: int):
    """Run as an SSE HTTP server — used in Docker compose."""
    import uvicorn
    from starlette.applications import Starlette
    from starlette.routing import Route
    from mcp.server.sse import SseServerTransport

    sse = SseServerTransport("/messages/")

    async def handle_sse(request):
        async with sse.connect_sse(
            request.scope, request.receive, request._send
        ) as streams:
            await app.run(streams[0], streams[1], app.create_initialization_options())

    starlette_app = Starlette(
        routes=[
            Route("/sse", endpoint=handle_sse),
            Route("/messages/", endpoint=sse.handle_post_message, methods=["POST"]),
        ]
    )

    config = uvicorn.Config(starlette_app, host="0.0.0.0", port=port, log_level="info")
    server = uvicorn.Server(config)
    await server.serve()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="process-dash-core-mcp")
    parser.add_argument(
        "--transport",
        choices=["stdio", "sse"],
        default="stdio",
        help="MCP transport (default: stdio)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(__import__("os").environ.get("PORT", "3100")),
        help="Port for SSE transport (default: 3100)",
    )
    args = parser.parse_args()

    if args.transport == "sse":
        asyncio.run(run_sse(args.port))
    else:
        asyncio.run(run_stdio())
