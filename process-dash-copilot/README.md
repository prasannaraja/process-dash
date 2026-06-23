# process-dash-copilot

LLM-powered copilot for Process Dash. It connects to `process-dash-core-mcp` via the Model Context Protocol and lets you interact with your work observability data through natural language.

## Role in the Architecture

```
process-dash-copilot  ──(MCP)──▶  process-dash-core-mcp  ──(HTTP)──▶  process-dash-core-api
```

The copilot is the conversational interface to the system. It uses the MCP server as its tool layer — it never calls the core API directly.

## Planned Capabilities

- Log intents, focus blocks, interruptions, and recovery breaks by talking naturally
- Ask questions about your day or sprint ("How fragmented was my Tuesday?", "What were my top interruptions this sprint?")
- Trigger markdown exports for daily logs and sprint summaries
- Receive proactive nudges (e.g. no intent set for the day, long unlogged gap)

## Configuration

| Variable | Description | Default |
|---|---|---|
| `MCP_SERVER_URL` | URL of `process-dash-core-mcp` | `http://localhost:3100` |
| `LLM_MODEL` | Model used for inference | tbd |

## Development

```bash
cd process-dash-copilot
# install dependencies (tbd)
```

See the root `README.md` for the full project overview and `process-dash-core-mcp/README.md` for the MCP tools available to this copilot.
