# process-dash-core-mcp

MCP (Model Context Protocol) server for Process Dash. It wraps `process-dash-core-api` and exposes its capabilities as MCP tools so any MCP host — Claude Desktop, `process-dash-copilot`, or any other LLM agent — can interact with your work data conversationally.

## Role in the Architecture

```
process-dash-copilot  ──(HTTP)──▶  process-dash-core-mcp  ──(HTTP)──▶  process-dash-core-api
                                         │
                              Claude Desktop (stdio)
```

This layer translates MCP tool calls into HTTP requests against the core API. It owns no data of its own — all persistence lives in `process-dash-core-api`.

## Tools

| Tool | Description |
|---|---|
| `get_day` | Full day rollup: blocks, intents, todos, metrics |
| `set_intents` | Set daily focus intentions |
| `start_block` | Start a focus block (optionally linked to a story) |
| `interrupt_block` | Record an interruption with reason code |
| `end_block` | End a block with duration and outcome |
| `start_recovery` | Log a coffee or lunch break start |
| `end_recovery` | End a recovery break |
| `list_sprints` | List sprint definitions |
| `get_sprint_rollup` | Sprint metrics + story delivery metrics |
| `list_stories` | List user stories, filterable by status |
| `create_story` | Add a user story to a sprint |
| `update_story_status` | Advance story status (TODO→IN_PROGRESS→DONE) |
| `get_todos` | Fetch todos for a date |
| `add_todo` | Add a todo item |
| `complete_todo` | Mark a todo done |
| `list_projects` | List active projects |

## Configuration

| Variable | Description | Default |
|---|---|---|
| `CORE_API_BASE_URL` | Base URL of `process-dash-core-api` | `http://localhost:8000/api` |
| `PORT` | Port for SSE transport | `3100` |

## Transports

**stdio** — for Claude Desktop and local MCP hosts:
```bash
cd process-dash-core-mcp
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python server.py
```

Claude Desktop `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "process-dash": {
      "command": "python",
      "args": ["/path/to/process-dash-core-mcp/server.py"],
      "env": {
        "CORE_API_BASE_URL": "http://localhost:8000/api"
      }
    }
  }
}
```

**SSE** — for Docker service-to-service use:
```bash
python server.py --transport sse --port 3100
# or via Docker Compose: docker compose up mcp
```

SSE endpoint: `http://localhost:3100/sse`
