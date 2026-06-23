import { useState } from "react";
import { ToolCall } from "./api";

interface Props {
  toolCalls: ToolCall[];
}

export function ToolCallDetail({ toolCalls }: Props) {
  const [open, setOpen] = useState(false);
  if (toolCalls.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11,
          color: "var(--text-3)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 0,
          fontFamily: "inherit",
          transition: "color 0.1s",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-2)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-3)")}
      >
        <span style={{ display: "inline-block", transition: "transform 0.15s", transform: open ? "rotate(90deg)" : "none" }}>
          ▶
        </span>
        {toolCalls.length} tool{toolCalls.length !== 1 ? "s" : ""} used
      </button>

      {open && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {toolCalls.map((tc, i) => (
            <div
              key={i}
              style={{
                background: "var(--surface-3)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "8px 10px",
                fontSize: 11,
                fontFamily: "\"JetBrains Mono\", \"SF Mono\", ui-monospace, monospace",
              }}
            >
              <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>{tc.name}</div>
              {Object.keys(tc.args).length > 0 && (
                <pre
                  style={{
                    color: "var(--text-3)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    margin: "0 0 4px",
                    fontSize: 10,
                  }}
                >
                  {JSON.stringify(tc.args, null, 2)}
                </pre>
              )}
              <div
                style={{
                  color: "var(--text-3)",
                  borderTop: "1px solid var(--border)",
                  paddingTop: 4,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  fontSize: 10,
                }}
              >
                {tc.result}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
