import { ChatMessage } from "./api";
import { ToolCallDetail } from "./ToolCallDetail";

interface Props {
  message: ChatMessage;
}

export function Message({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
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
        <div style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallDetail toolCalls={message.toolCalls} />
        )}
      </div>
    </div>
  );
}
