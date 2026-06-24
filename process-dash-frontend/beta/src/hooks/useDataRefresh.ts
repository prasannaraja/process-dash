import { useEffect, useRef } from "react";

export const DATA_CHANGED_EVENT = "copilot:data-changed";

/**
 * Dispatch this after any write tool call completes so all subscribed pages re-fetch.
 */
export function dispatchDataChanged(toolNames: string[] = []) {
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail: { tools: toolNames } }));
}

/**
 * Call in any page that should auto-refresh when the copilot modifies data.
 *
 * @param callback  The page's "load / refresh" function. Wrap in useCallback if it
 *                  has dependencies so the effect doesn't re-register on every render.
 */
export function useDataRefresh(callback: () => void) {
  // Keep a stable ref so the event listener always calls the latest version
  // without needing to re-register on every render.
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    const handler = () => cbRef.current();
    window.addEventListener(DATA_CHANGED_EVENT, handler);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, handler);
  }, []); // register once
}
