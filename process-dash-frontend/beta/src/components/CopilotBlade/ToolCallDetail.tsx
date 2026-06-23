import { useState } from "react";
import { ToolCall } from "./api";

interface Props {
  toolCalls: ToolCall[];
}

export function ToolCallDetail({ toolCalls }: Props) {
  const [open, setOpen] = useState(false);

  if (toolCalls.length === 0) return null;

  return (
    <div className="mt-1.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        <span
          className="inline-block transition-transform duration-150"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          ▶
        </span>
        {toolCalls.length} tool{toolCalls.length !== 1 ? "s" : ""} used
      </button>

      {open && (
        <div className="mt-1.5 space-y-1.5">
          {toolCalls.map((tc, i) => (
            <div
              key={i}
              className="rounded bg-gray-50 border border-gray-200 px-2.5 py-2 text-xs font-mono"
            >
              <div className="font-semibold text-indigo-600 mb-1">{tc.name}</div>
              {Object.keys(tc.args).length > 0 && (
                <pre className="text-gray-500 whitespace-pre-wrap break-all mb-1">
                  {JSON.stringify(tc.args, null, 2)}
                </pre>
              )}
              <div className="text-gray-400 border-t border-gray-200 pt-1 whitespace-pre-wrap break-all">
                {tc.result}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
