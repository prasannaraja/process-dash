import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChatMessage } from "./api";
import { ToolCallDetail } from "./ToolCallDetail";

interface Props {
  message: ChatMessage;
}

// Markdown component overrides — dark theme, compact for chat
const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p style={{ margin: "0 0 8px", lineHeight: 1.6 }}>{children}</p>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 style={{ fontSize: 15, fontWeight: 700, margin: "12px 0 6px", color: "var(--text)" }}>{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 style={{ fontSize: 14, fontWeight: 600, margin: "10px 0 5px", color: "var(--text)" }}>{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 style={{ fontSize: 13, fontWeight: 600, margin: "8px 0 4px", color: "var(--text-2)" }}>{children}</h3>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul style={{ margin: "4px 0 8px", paddingLeft: 18, lineHeight: 1.7 }}>{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol style={{ margin: "4px 0 8px", paddingLeft: 18, lineHeight: 1.7 }}>{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li style={{ marginBottom: 2 }}>{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong style={{ fontWeight: 600, color: "var(--text)" }}>{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em style={{ color: "var(--text-2)" }}>{children}</em>
  ),
  code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) =>
    inline ? (
      <code
        style={{
          fontFamily: '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
          fontSize: 11,
          background: "var(--surface-3)",
          border: "1px solid var(--border)",
          borderRadius: 3,
          padding: "1px 5px",
          color: "var(--accent)",
        }}
      >
        {children}
      </code>
    ) : (
      <code
        style={{
          display: "block",
          fontFamily: '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
          fontSize: 11,
          background: "var(--surface-3)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "10px 12px",
          overflowX: "auto",
          color: "var(--text-2)",
          lineHeight: 1.6,
          margin: "6px 0",
        }}
      >
        {children}
      </code>
    ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre style={{ margin: "6px 0", overflow: "auto" }}>{children}</pre>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote
      style={{
        borderLeft: "3px solid var(--accent)",
        paddingLeft: 10,
        margin: "6px 0",
        color: "var(--text-2)",
      }}
    >
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "10px 0" }} />
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: "var(--accent)", textDecoration: "underline" }}
    >
      {children}
    </a>
  ),
};

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy as markdown"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        color: copied ? "var(--green)" : "var(--text-3)",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: "2px 0",
        fontFamily: "inherit",
        transition: "color 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!copied) (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
      }}
      onMouseLeave={(e) => {
        if (!copied) (e.currentTarget as HTMLElement).style.color = "var(--text-3)";
      }}
    >
      {copied ? (
        <>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M8 4V2.5A1.5 1.5 0 006.5 1h-4A1.5 1.5 0 001 2.5v4A1.5 1.5 0 002.5 8H4" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

// ── Message ───────────────────────────────────────────────────────────────────

export function Message({ message }: Props) {
  const isUser = message.role === "user";
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}
      onMouseEnter={() => !isUser && setHovered(true)}
      onMouseLeave={() => !isUser && setHovered(false)}
    >
      <div
        style={{
          maxWidth: "85%",
          borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
          padding: "9px 13px",
          fontSize: 13,
          lineHeight: 1.55,
          background: isUser ? "var(--accent)" : "var(--surface-2)",
          color: isUser ? "#fff" : "var(--text)",
          border: isUser ? "none" : "1px solid var(--border)",
        }}
      >
        {isUser ? (
          <div style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>
        ) : (
          <div style={{ minWidth: 0 }}>
            <ReactMarkdown components={mdComponents as any}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallDetail toolCalls={message.toolCalls} />
        )}

        {/* Copy button — visible on hover for assistant messages */}
        {!isUser && (
          <div
            style={{
              marginTop: 6,
              display: "flex",
              justifyContent: "flex-end",
              opacity: hovered ? 1 : 0,
              transition: "opacity 0.15s",
            }}
          >
            <CopyButton text={message.content} />
          </div>
        )}
      </div>
    </div>
  );
}
