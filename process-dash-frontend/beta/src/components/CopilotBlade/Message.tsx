import { useState } from "react";
import { ChatMessage } from "./api";
import { ToolCallDetail } from "./ToolCallDetail";

interface Props {
  message: ChatMessage;
}

// ── Inline markdown renderer (zero-dep) ───────────────────────────────────────
// Handles: headers, bold, italic, inline code, fenced code blocks, bullet lists,
// ordered lists, blockquotes, horizontal rules, links, and paragraphs.

function renderInline(text: string): React.ReactNode[] {
  // Split on bold, italic, inline code, links
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Inline code: `...`
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)/s);
    // Bold: **...**
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/s);
    // Italic: *...*
    const italicMatch = remaining.match(/^(.*?)\*(.+?)\*(.*)/s);
    // Link: [text](url)
    const linkMatch = remaining.match(/^(.*?)\[(.+?)\]\((.+?)\)(.*)/s);

    // Pick the match that starts earliest
    const candidates = [
      codeMatch   && { type: "code",   before: codeMatch[1],   inner: codeMatch[2],   after: codeMatch[3] },
      boldMatch   && { type: "bold",   before: boldMatch[1],   inner: boldMatch[2],   after: boldMatch[3] },
      italicMatch && { type: "italic", before: italicMatch[1], inner: italicMatch[2], after: italicMatch[3] },
      linkMatch   && { type: "link",   before: linkMatch[1],   inner: linkMatch[2],   after: linkMatch[4], href: linkMatch[3] },
    ].filter(Boolean) as { type: string; before: string; inner: string; after: string; href?: string }[];

    if (candidates.length === 0) {
      parts.push(remaining);
      break;
    }

    // Pick earliest (shortest "before")
    const best = candidates.reduce((a, b) => a.before.length <= b.before.length ? a : b);

    if (best.before) parts.push(best.before);

    if (best.type === "code") {
      parts.push(
        <code key={key++} style={{
          fontFamily: '"JetBrains Mono","SF Mono",ui-monospace,monospace',
          fontSize: 11, background: "var(--surface-3)",
          border: "1px solid var(--border)", borderRadius: 3,
          padding: "1px 5px", color: "var(--accent)",
        }}>{best.inner}</code>
      );
    } else if (best.type === "bold") {
      parts.push(<strong key={key++} style={{ fontWeight: 600, color: "var(--text)" }}>{best.inner}</strong>);
    } else if (best.type === "italic") {
      parts.push(<em key={key++} style={{ color: "var(--text-2)" }}>{best.inner}</em>);
    } else if (best.type === "link") {
      parts.push(
        <a key={key++} href={best.href} target="_blank" rel="noopener noreferrer"
          style={{ color: "var(--accent)", textDecoration: "underline" }}>{best.inner}</a>
      );
    }

    remaining = best.after;
  }

  return parts;
}

// Convert any HTML the LLM slips in into equivalent markdown, then strip remaining tags
function stripHtml(raw: string): string {
  return raw
    // Block-level: convert <br> / <br/> to newline
    .replace(/<br\s*\/?>/gi, "\n")
    // Convert <strong>/<b> to **bold**
    .replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, "**$2**")
    // Convert <em>/<i> to *italic*
    .replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, "*$2*")
    // Convert <code> to `inline code`
    .replace(/<code>([\s\S]*?)<\/code>/gi, "`$1`")
    // Convert <h1>–<h3> to ## headings
    .replace(/<h1>([\s\S]*?)<\/h1>/gi, "# $1\n")
    .replace(/<h2>([\s\S]*?)<\/h2>/gi, "## $1\n")
    .replace(/<h3>([\s\S]*?)<\/h3>/gi, "### $1\n")
    // Convert <li> to bullet
    .replace(/<li>([\s\S]*?)<\/li>/gi, "- $1\n")
    // Strip remaining tags
    .replace(/<[^>]+>/g, "")
    // Decode common HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Collapse 3+ consecutive blank lines to 2
    .replace(/\n{3,}/g, "\n\n");
}

function MarkdownContent({ content }: { content: string }) {
  const lines = stripHtml(content).split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre key={i} style={{
          margin: "6px 0", background: "var(--surface-3)",
          border: "1px solid var(--border)", borderRadius: 6, overflow: "auto",
        }}>
          <code data-lang={lang} style={{
            display: "block", padding: "10px 12px",
            fontFamily: '"JetBrains Mono","SF Mono",ui-monospace,monospace',
            fontSize: 11, color: "var(--text-2)", lineHeight: 1.6,
          }}>{codeLines.join("\n")}</code>
        </pre>
      );
      i++; // skip closing ```
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={i} style={{ border: "none", borderTop: "1px solid var(--border)", margin: "10px 0" }} />);
      i++;
      continue;
    }

    // Heading
    const hMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (hMatch) {
      const level = hMatch[1].length;
      const sz = [15, 14, 13][level - 1];
      const fw = [700, 600, 600][level - 1];
      const Tag = `h${level}` as "h1" | "h2" | "h3";
      nodes.push(
        <Tag key={i} style={{ fontSize: sz, fontWeight: fw, margin: "12px 0 5px", color: "var(--text)" }}>
          {renderInline(hMatch[2])}
        </Tag>
      );
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      nodes.push(
        <blockquote key={i} style={{
          borderLeft: "3px solid var(--accent)", paddingLeft: 10,
          margin: "6px 0", color: "var(--text-2)",
        }}>
          {renderInline(line.slice(2))}
        </blockquote>
      );
      i++;
      continue;
    }

    // Unordered list — collect consecutive bullet lines
    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s/, ""));
        i++;
      }
      nodes.push(
        <ul key={i} style={{ margin: "4px 0 8px", paddingLeft: 18, lineHeight: 1.7 }}>
          {items.map((it, j) => (
            <li key={j} style={{ marginBottom: 2 }}>{renderInline(it)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      nodes.push(
        <ol key={i} style={{ margin: "4px 0 8px", paddingLeft: 18, lineHeight: 1.7 }}>
          {items.map((it, j) => (
            <li key={j} style={{ marginBottom: 2 }}>{renderInline(it)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Empty line → skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph
    nodes.push(
      <p key={i} style={{ margin: "0 0 8px", lineHeight: 1.6 }}>
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <>{nodes}</>;
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy as markdown"
      style={{
        display: "flex", alignItems: "center", gap: 4,
        fontSize: 11, color: copied ? "var(--green)" : "var(--text-3)",
        background: "transparent", border: "none", cursor: "pointer",
        padding: "2px 0", fontFamily: "inherit", transition: "color 0.15s",
      }}
      onMouseEnter={(e) => { if (!copied) (e.currentTarget as HTMLElement).style.color = "var(--text-2)"; }}
      onMouseLeave={(e) => { if (!copied) (e.currentTarget as HTMLElement).style.color = "var(--text-3)"; }}
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
            <MarkdownContent content={message.content} />
          </div>
        )}

        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallDetail toolCalls={message.toolCalls} />
        )}

        {!isUser && (
          <div style={{
            marginTop: 6, display: "flex", justifyContent: "flex-end",
            opacity: hovered ? 1 : 0, transition: "opacity 0.15s",
          }}>
            <CopyButton text={message.content} />
          </div>
        )}
      </div>
    </div>
  );
}
