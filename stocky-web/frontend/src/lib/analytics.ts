const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SESSION_KEY = "stocky_session_id";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function trackEvent(
  event_type: string,
  target: string,
  details: Record<string, unknown> = {},
): void {
  if (typeof window === "undefined") return;
  const payload = {
    session_id: getSessionId(),
    event_type,
    target,
    details,
    page_url: window.location.href,
  };
  const url = `${API_URL}/api/analytics/log`;
  const body = JSON.stringify(payload);
  // sendBeacon is fire-and-forget — zero blocking lag
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(url, blob);
  } else {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {}); // silent fail — never block the UI
  }
}

// Alias for legacy call sites: track(event_type, target, details)
export const track = trackEvent;
