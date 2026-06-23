import { ChatMessage } from "./api";
import { ToolCallDetail } from "./ToolCallDetail";

interface Props {
  message: ChatMessage;
}

export function Message({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-indigo-600 text-white rounded-br-sm"
            : "bg-gray-100 text-gray-800 rounded-bl-sm"
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallDetail toolCalls={message.toolCalls} />
        )}
      </div>
    </div>
  );
}
