import { useState, useCallback } from "react";
import { sendMessage, ChatMessage, ToolCall } from "./api";

const SESSION_KEY   = "copilot_session_id";
const MESSAGES_KEY  = "copilot_messages";
const MAX_MESSAGES  = 200; // cap to avoid unbounded localStorage growth

function getOrCreateSessionId(): string {
  const stored = localStorage.getItem(SESSION_KEY);
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, id);
  return id;
}

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<ChatMessage & { timestamp: string }>;
    // Rehydrate Date objects
    return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    return [];
  }
}

function saveMessages(msgs: ChatMessage[]): void {
  try {
    // Keep only the most recent MAX_MESSAGES to avoid filling localStorage
    const trimmed = msgs.slice(-MAX_MESSAGES);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full or unavailable — silently skip
  }
}

export function useCopilot() {
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>(getOrCreateSessionId);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => {
        const next = [...prev, userMsg];
        saveMessages(next);
        return next;
      });
      setIsLoading(true);
      setError(null);

      try {
        const res = await sendMessage(text.trim(), sessionId);

        // Update sessionId from response (in case it was newly created)
        if (res.sessionId && res.sessionId !== sessionId) {
          setSessionId(res.sessionId);
          localStorage.setItem(SESSION_KEY, res.sessionId);
        }

        const toolCalls: ToolCall[] = res.toolCalls ?? [];
        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: res.reply,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          timestamp: new Date(),
        };
        setMessages((prev) => {
          const next = [...prev, assistantMsg];
          saveMessages(next);
          return next;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, isLoading]
  );

  const clearSession = useCallback(() => {
    const newId = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, newId);
    localStorage.removeItem(MESSAGES_KEY);
    setSessionId(newId);
    setMessages([]);
    setError(null);
  }, []);

  return { messages, send, isLoading, error, sessionId, clearSession };
}
