const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let sessionId: string | null = null;
function getSessionId(): string {
  if (!sessionId) {
    sessionId = crypto.randomUUID();
  }
  return sessionId;
}

interface AnalyticsEvent {
  event_type: string;
  event_name: string;
  event_data?: Record<string, unknown>;
  conversation_id?: string;
}

let buffer: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  if (buffer.length === 0) return;
  const events = buffer.map((e) => ({
    ...e,
    platform: "web",
    session_id: getSessionId(),
  }));
  buffer = [];
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  fetch(`${API_URL}/api/analytics/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
    keepalive: true,
  }).catch(() => {});
}

export function track(
  eventType: string,
  eventName: string,
  eventData?: Record<string, unknown>,
  conversationId?: string,
) {
  buffer.push({
    event_type: eventType,
    event_name: eventName,
    event_data: eventData,
    conversation_id: conversationId,
  });
  if (buffer.length >= 10) {
    flush();
  } else if (!flushTimer) {
    flushTimer = setTimeout(flush, 2000);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", flush);
}
