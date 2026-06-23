# Part 7 — Copilot Chat Blade

A blade-style chat panel embedded in the React frontend, connected to the `process-dash-copilot` service. The blade slides in from the right side of any page, letting you talk to the copilot without leaving whatever you're looking at.

---

## What it looks like

The blade is a fixed right-side panel — always available, never a separate page. A floating button (`⌘K` / chat icon) opens it. The panel slides over the current page content, showing the conversation thread and an input at the bottom.

```
┌─────────────────────────────────────────────────────────┐
│  Nav: Today | Todos | Day | Sprints | Projects      [✦] │
├────────────────────────────────────┬────────────────────┤
│                                    │  Copilot          ✕ │
│   Current page content             │─────────────────── │
│   (Today / Sprints / etc.)         │  You               │
│                                    │  I just started    │
│                                    │  on the auth story │
│                                    │                    │
│                                    │  Copilot           │
│                                    │  Started a block   │
│                                    │  linked to         │
│                                    │  "OAuth flow"      │
│                                    │  → updated status  │
│                                    │    IN_PROGRESS     │
│                                    │─────────────────── │
│                                    │  [message input]   │
└────────────────────────────────────┴────────────────────┘
```

---

## What it does

The blade is the natural-language entry point for everything the copilot can do. Examples:

- **Log work**: "I'm starting on the payments story, should be 3 points"
- **Record interruption**: "Got pulled into a meeting, about 40 minutes"
- **Query data**: "How fragmented was today?" → copilot calls `get_day`, summarises metrics
- **Stand-up prep**: "What should I say in standup?" → calls `get_day` + `get_sprint_rollup`, formats Yesterday/Today/Blockers
- **Sprint retro**: "Give me my retro bullets" → calls `get_sprint_rollup`, formats delivery/fragmentation/improvements
- **Manage stories**: "Mark the auth story as done" → calls `list_stories` + `update_story_status`

The blade does NOT replace the existing pages — those are still the primary UI for structured data entry. The blade is for conversational logging and queries.

---

## Architecture

```
Frontend (React)
  └── CopilotBlade component
        └── POST http://localhost:3200/chat
                ↓
        process-dash-copilot (FastAPI)
          ├── chat session manager
          ├── LLM (OpenAI-compatible)
          └── tool calls → process-dash-core-api
```

The copilot already has `POST /chat` with `{ message, sessionId }` → `{ reply, sessionId, toolCalls }`. No backend changes are required for the basic blade. Additional work (OpenAI-compatible endpoint) is optional.

---

## Build plan

### 7A — Copilot: OpenAI-compatible endpoint

Add `POST /v1/chat/completions` to the copilot so it works with any standard OpenAI client (useful for testing with curl, Postman, or third-party tools).

**Request** (standard OpenAI format):
```json
{
  "model": "process-dash-copilot",
  "messages": [
    { "role": "user", "content": "What should I say in standup?" }
  ],
  "stream": false
}
```

**Response** (standard OpenAI format):
```json
{
  "id": "chatcmpl-uuid",
  "object": "chat.completion",
  "choices": [{
    "index": 0,
    "message": { "role": "assistant", "content": "Here's your standup..." },
    "finish_reason": "stop"
  }],
  "usage": { "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0 }
}
```

Session ID is derived from a header `X-Session-Id` or generated per request.

Files: `process-dash-copilot/app/main.py`

---

### 7B — Frontend: CopilotBlade component

New component at `src/components/CopilotBlade/`.

**Files:**
```
src/components/CopilotBlade/
  index.tsx          — main blade panel (open/close, message thread, input)
  Message.tsx        — single message bubble (user / assistant / tool calls)
  ToolCallDetail.tsx — collapsible section showing which tools were called
  useCopilot.ts      — hook: sendMessage, messages, sessionId, isLoading
  api.ts             — POST /chat wrapper
```

**State:**
```typescript
interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  toolCalls?: ToolCall[]
  timestamp: Date
}

interface ToolCall {
  name: string
  args: Record<string, unknown>
  result: string
}
```

`sessionId` is stored in `localStorage` so conversation continues across page refreshes. A "New conversation" button clears it.

**`useCopilot` hook:**
```typescript
const { messages, sendMessage, isLoading, clearSession } = useCopilot()
```

Calls `POST /chat`, appends the user message optimistically, then appends the assistant reply when the response arrives.

**Blade behaviour:**
- Fixed position, right side, `w-96` (384px), full viewport height
- Slides in with CSS transition (`translate-x-full` → `translate-x-0`)
- Does not push page content — overlays it
- Keyboard shortcut: `Cmd+K` (Mac) / `Ctrl+K` (Windows) toggles open/close
- Floating toggle button visible when blade is closed (bottom-right corner)

---

### 7C — Frontend: Wire blade into App.tsx

The blade is mounted once at the App level, not per-page.

```tsx
// App.tsx changes
import CopilotBlade from "./components/CopilotBlade"

function App() {
  const [bladeOpen, setBladeOpen] = useState(false)
  
  // Keyboard shortcut handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setBladeOpen(prev => !prev)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white text-gray-900 font-sans">
        <nav>
          {/* existing nav + copilot toggle button */}
          <button onClick={() => setBladeOpen(true)}>✦ Copilot</button>
        </nav>
        <Routes>{/* existing routes */}</Routes>
        <CopilotBlade open={bladeOpen} onClose={() => setBladeOpen(false)} />
      </div>
    </BrowserRouter>
  )
}
```

---

### 7D — Environment config

The frontend needs to know the copilot URL. Add to `vite.config.ts` and the Dockerfile environment:

```typescript
// vite.config.ts — dev proxy so CORS is not an issue locally
server: {
  proxy: {
    "/copilot": {
      target: "http://localhost:3200",
      rewrite: (path) => path.replace(/^\/copilot/, ""),
    }
  }
}
```

In Docker Compose, the frontend can't call the copilot directly (different hostnames). Two options:

**Option A (simpler)**: Add copilot proxy to the nginx config or Vite proxy. Frontend calls `/copilot/chat` → proxied to `http://copilot:3200/chat`.

**Option B**: Expose copilot on host port `3200` (already done) and have the browser call `http://localhost:3200/chat` directly. Requires the copilot to set `Access-Control-Allow-Origin: *` (already configured).

Option B is the path of least resistance for development. The frontend's `api.ts` reads the copilot URL from `VITE_COPILOT_BASE` env var, defaulting to `http://localhost:3200`.

Docker Compose change:
```yaml
frontend:
  environment:
    - VITE_API_BASE=http://localhost:8001/api
    - VITE_COPILOT_BASE=http://localhost:3200
```

---

## Message UX details

**Tool call visibility**: Each assistant message has an expandable "Tools used" section showing what the copilot called and the raw result. Collapsed by default. Helps the user trust the data behind a summary.

**Loading state**: After sending, show a pulsing "..." bubble while waiting for the response.

**Error handling**: If the copilot returns an error (500, network down), show an inline error message with a retry button. Don't clear the input.

**Empty state**: When the blade first opens, show a few prompt suggestions:
- "What should I say in standup today?"
- "How fragmented was my day?"
- "Show me what's left in the sprint"

Clicking a suggestion sends it as a message.

---

## File changes summary

| File | Change |
|---|---|
| `process-dash-copilot/app/main.py` | Add `POST /v1/chat/completions` (7A) |
| `process-dash-frontend/beta/src/components/CopilotBlade/index.tsx` | New blade panel |
| `process-dash-frontend/beta/src/components/CopilotBlade/Message.tsx` | Message bubble |
| `process-dash-frontend/beta/src/components/CopilotBlade/ToolCallDetail.tsx` | Tool call detail |
| `process-dash-frontend/beta/src/components/CopilotBlade/useCopilot.ts` | Chat hook |
| `process-dash-frontend/beta/src/components/CopilotBlade/api.ts` | API client |
| `process-dash-frontend/beta/src/App.tsx` | Wire in blade + keyboard shortcut |
| `process-dash-frontend/beta/.env.example` | Add `VITE_COPILOT_BASE` |
| `docker-compose.yml` | Add `VITE_COPILOT_BASE` to frontend env |

---

## Phased delivery

| Sub-phase | Work | Outcome |
|---|---|---|
| **7A** | OpenAI-compatible endpoint in copilot | Testable with curl/Postman |
| **7B** | `CopilotBlade` component + hook | Blade works, calls copilot |
| **7C** | Wire into `App.tsx` + keyboard shortcut | Available on every page |
| **7D** | CORS + env config + Docker Compose | Works in Docker |

7A is optional for the blade itself (the blade uses `/chat` directly, not `/v1/chat/completions`). It's useful for external tooling and can run in parallel with 7B–7D.

Estimated effort: 2–3 days.
