"""
Calls MCP tools via the MCP server's SSE endpoint.
Falls back to direct HTTP against the core API if MCP_SERVER_URL is not set.

In Docker Compose the MCP server is available at $MCP_SERVER_URL/sse.
For local dev without Docker, set MCP_SERVER_URL='' to use the direct
HTTP fallback (CORE_API_BASE_URL must point at the running core API).
"""

import json
import os
import httpx

MCP_SERVER_URL = os.environ.get("MCP_SERVER_URL", "").rstrip("/")
CORE_API_BASE_URL = os.environ.get("CORE_API_BASE_URL", "http://localhost:8000/api")

# ── Direct HTTP fallback (used when MCP_SERVER_URL is empty) ──────────────────

def _direct(name: str, arguments: dict):
    """Dispatch a tool call directly to the core API without going through MCP."""
    # Import api_client from the MCP package directory. In Docker, both services
    # share the same codebase mount; locally, we duplicate the client inline here.
    import sys, importlib.util
    mcp_dir = os.path.join(os.path.dirname(__file__), "..", "..", "process-dash-core-mcp")
    spec = importlib.util.spec_from_file_location(
        "api_client", os.path.join(mcp_dir, "api_client.py")
    )
    if spec and spec.loader:
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)  # type: ignore
        fn = getattr(mod, name, None)
        if fn:
            return fn(**{k: v for k, v in arguments.items()})

    raise RuntimeError(f"No direct fallback for tool '{name}'")


# ── MCP SSE caller ─────────────────────────────────────────────────────────────

def _call_via_mcp(name: str, arguments: dict):
    """
    Call a tool on the MCP SSE server using a simple JSON-RPC over HTTP POST.
    The mcp SDK's SSE transport accepts POST /messages/ with JSON-RPC bodies.
    """
    url = f"{MCP_SERVER_URL}/messages/"
    rpc_body = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": name, "arguments": arguments},
    }
    # The SSE transport requires an active SSE session; for simpler service-to-service
    # use we call the core API directly when no MCP session token is available.
    # This fallback is intentional for Phase 3 — Phase 4 will introduce persistent sessions.
    raise NotImplementedError("SSE session-based calling not yet implemented; using direct fallback")


# ── Public interface ───────────────────────────────────────────────────────────

def call_tool(name: str, arguments: dict) -> str:
    """
    Execute a named tool and return the result as a JSON string.
    Uses direct HTTP to the core API (via api_client) for Phase 3.
    MCP SSE session-based calling will replace this in Phase 4.
    """
    try:
        result = _direct(name, arguments)
        return json.dumps(result, indent=2, default=str)
    except Exception as exc:
        return json.dumps({"error": str(exc)})
