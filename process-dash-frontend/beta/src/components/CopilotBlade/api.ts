const COPILOT_BASE = import.meta.env.VITE_COPILOT_BASE || "/copilot";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  timestamp: Date;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result: string;
}

export interface ChatApiResponse {
  reply: string;
  sessionId: string;
  toolCalls: ToolCall[];
}

export async function sendMessage(
  message: string,
  sessionId: string
): Promise<ChatApiResponse> {
  const res = await fetch(`${COPILOT_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Copilot error ${res.status}: ${text}`);
  }
  return res.json();
}
