import { useEffect, useRef, useState } from "react";
import { useCopilot } from "./useCopilot";
import { Message } from "./Message";

const SUGGESTIONS = [
  "What should I say in standup today?",
  "How fragmented was my day?",
  "Show me what's left in the sprint",
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CopilotBlade({ open, onClose }: Props) {
  const { messages, send, isLoading, error, clearSession } = useCopilot();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    send(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 40,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.2s",
        }}
      />

      {/* Blade panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: 380,
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.22s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--accent)", fontSize: 14, fontWeight: 700 }}>✦</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Copilot</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={clearSession}
              style={{
                fontSize: 11,
                color: "var(--text-3)",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 4,
                padding: "3px 8px",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "color 0.1s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-2)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-3)")}
            >
              New chat
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                fontSize: 16,
                color: "var(--text-3)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px 6px",
                lineHeight: 1,
                borderRadius: 4,
                transition: "color 0.1s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-3)")}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Thread */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {messages.length === 0 && !isLoading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                gap: 16,
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 28, color: "var(--accent)" }}>✦</span>
              <p style={{ fontSize: 13, color: "var(--text-2)", maxWidth: 220, margin: 0 }}>
                Ask me anything about your day, sprint, or what to log.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    style={{
                      textAlign: "left",
                      fontSize: 12,
                      padding: "8px 12px",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      color: "var(--text-2)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "border-color 0.1s, color 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = "var(--accent)";
                      el.style.color = "var(--text)";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = "var(--border)";
                      el.style.color = "var(--text-2)";
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <Message key={msg.id} message={msg} />
          ))}

          {isLoading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px 12px 12px 2px",
                  padding: "10px 14px",
                  display: "flex",
                  gap: 4,
                  alignItems: "center",
                }}
              >
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "var(--text-3)",
                      display: "inline-block",
                      animation: "bounce 1.2s ease-in-out infinite",
                      animationDelay: `${delay}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                fontSize: 12,
                color: "var(--red)",
                background: "var(--red-bg)",
                border: "1px solid rgba(248,113,113,0.2)",
                borderRadius: 6,
                padding: "8px 12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{error}</span>
              <button
                onClick={handleSend}
                style={{
                  fontSize: 11,
                  color: "var(--red)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontFamily: "inherit",
                }}
              >
                retry
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          style={{
            flexShrink: 0,
            borderTop: "1px solid var(--border)",
            padding: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 10px",
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message copilot… (Enter to send)"
              rows={1}
              disabled={isLoading}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                color: "var(--text)",
                fontSize: 13,
                fontFamily: "inherit",
                resize: "none",
                outline: "none",
                maxHeight: 120,
                overflowY: "auto",
                lineHeight: 1.5,
                padding: 0,
                fieldSizing: "content",
              } as React.CSSProperties}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              aria-label="Send"
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: !input.trim() || isLoading ? "var(--surface-3)" : "var(--accent)",
                border: "none",
                cursor: !input.trim() || isLoading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                opacity: !input.trim() || isLoading ? 0.5 : 1,
                transition: "background 0.15s, opacity 0.15s",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M7 12V2M7 2L2.5 6.5M7 2L11.5 6.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: 10, color: "var(--text-3)", margin: "6px 0 0" }}>
            Shift+Enter for new line · Esc to close
          </p>
        </div>
      </div>
    </>
  );
}
