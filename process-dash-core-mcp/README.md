# process-dash-core-mcp

MCP (Model Context Protocol) server for Process Dash. It wraps `process-dash-core-api` and exposes its capabilities as MCP tools so that LLM agents (such as `process-dash-copilot`) can interact with your work data conversationally.

## Role in the Architecture

```
process-dash-copilot  ──(MCP)──▶  process-dash-core-mcp  ──(HTTP)──▶  process-dash-core-api
```

This layer translates MCP tool calls from the copilot into HTTP requests against the core API. It owns no data of its own — all persistence lives in `process-dash-core-api`.

## Planned Tools

The MCP server will expose tools that map to the core API's main capabilities:

- **intents** — set and retrieve daily intents
- **blocks** — start, interrupt, and end focus blocks
- **recovery** — log coffee and lunch breaks
- **days** — fetch day-level rollups
- **sprints** — list, create, and update sprint definitions; fetch sprint rollups and summaries
- **export** — trigger markdown export for a day or sprint

## Configuration

| Variable | Description | Default |
|---|---|---|
| `CORE_API_BASE_URL` | Base URL of `process-dash-core-api` | `http://localhost:8000/api` |

## Development

```bash
cd process-dash-core-mcp
# install dependencies (tbd based on chosen MCP SDK)
```

See the root `README.md` for the full project overview and `process-dash-docs/api-contract.md` for the API endpoints this server wraps.
