import { useState, useCallback } from "react";
import { sendMessage, ChatMessage, ToolCall } from "./api";

const SESSION_KEY = "copilot_session_id";

function getOrCreateSessionId(): string {
  const stored = localStorage.getItem(SESSION_KEY);
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, id);
  return id;
}

export function useCopilot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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

      setMessages((prev) => [...prev, userMsg]);
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
        setMessages((prev) => [...prev, assistantMsg]);
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
    setSessionId(newId);
    setMessages([]);
    setError(null);
  }, []);

  return { messages, send, isLoading, error, sessionId, clearSession };
}
