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
        name="list_projects",
        description=(
            "List all active projects. Use this when the user mentions a project by name "
            "and you need its UUID, or when context-resolution requires knowing the active projects."
        ),
        inputSchema={"type": "object", "properties": {}},
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

            case "list_sprints":
                return _ok(api.list_sprints(project_id=arguments.get("projectId")))

            case "get_sprint_rollup":
                return _ok(api.get_sprint_rollup(arguments["sprintId"]))

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

            case "complete_todo":
                return _ok(api.complete_todo(arguments["todoId"], arguments["completionDate"]))

            case "list_projects":
                return _ok(api.list_projects())

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
