import type { ChatResponse, ConversationSummary, FeedbackRequest } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("stocky_token");
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(`Network error reaching ${url} — backend may be down or unreachable. (${err.message})`);
    }
    throw err;
  }

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error ${res.status} [${url}]`);
  }

  return res.json();
}

// --- Chat ---

export async function sendMessage(
  message: string,
  conversationId?: string,
  deep?: boolean,
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      message,
      conversation_id: conversationId || null,
      deep: deep || false,
    }),
  });
}

// --- Trade ---

export async function confirmTrade(actionId: string) {
  return apiFetch("/api/trade/confirm", {
    method: "POST",
    body: JSON.stringify({ action_id: actionId, action: "confirm" }),
  });
}

export async function cancelTrade(actionId: string) {
  return apiFetch("/api/trade/confirm", {
    method: "POST",
    body: JSON.stringify({ action_id: actionId, action: "cancel" }),
  });
}

// --- Conversations ---

export async function getConversations(): Promise<ConversationSummary[]> {
  return apiFetch<ConversationSummary[]>("/api/conversations");
}

export async function getConversationMessages(conversationId: string) {
  return apiFetch<{ conversation_id: string; messages: unknown[] }>(
    `/api/conversations/${conversationId}`,
  );
}

export async function deleteConversation(conversationId: string) {
  return apiFetch(`/api/conversations/${conversationId}`, {
    method: "DELETE",
  });
}

// --- Kite ---

export async function getKiteStatus(): Promise<{ connected: boolean }> {
  return apiFetch("/api/kite/status");
}

export async function triggerKiteLogin() {
  return apiFetch("/api/kite/login", { method: "POST" });
}

// --- Feature APIs ---

export async function runScan(scanType: string) {
  return apiFetch<{ type: string; data: Record<string, unknown> }>("/api/scan", {
    method: "POST",
    body: JSON.stringify({ scan_type: scanType }),
  });
}

export async function generateChart(stock: string, chartType: string) {
  return apiFetch<{ type: string; data: Record<string, unknown> }>("/api/chart", {
    method: "POST",
    body: JSON.stringify({ stock, chart_type: chartType }),
  });
}

export async function compareStocks(stocks: string) {
  return apiFetch<{ type: string; data: Record<string, unknown> }>("/api/compare", {
    method: "POST",
    body: JSON.stringify({ stocks }),
  });
}

export async function getIpo() {
  return apiFetch<{ type: string; data: Record<string, unknown> }>("/api/ipo");
}

export async function getMacro() {
  return apiFetch<{ type: string; data: Record<string, unknown> }>("/api/macro");
}

export async function getRrg() {
  return apiFetch<{ type: string; data: Record<string, unknown> }>("/api/rrg");
}

export async function summarise(text: string) {
  return apiFetch<{ type: string; content: string }>("/api/summarise", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

/** Stream deep research via SSE. Returns a ReadableStream. */
export async function streamResearch(stock: string, mode: string): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const url = `${API_URL}/api/research`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ stock, mode }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Research API ${res.status}: ${body || res.statusText} [${url}]`);
    }
    return res;
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(`Network error reaching ${url} — backend may be down or unreachable. (${err.message})`);
    }
    throw err;
  }
}

// --- Analytics ---

export interface AnalyticsDashboard {
  daily_counts: { day: string; count: number }[];
  feature_counts: { name: string; count: number }[];
  hourly_distribution: { hour: number; count: number }[];
  platform_breakdown: { platform: string; count: number }[];
  recent_activity: {
    id: number;
    event_type: string;
    event_name: string;
    event_data: Record<string, unknown> | null;
    platform: string;
    ts: string;
  }[];
  summary: { today: number; alltime: number; sessions_today: number };
}

export async function getAnalyticsDashboard(days: number = 30): Promise<AnalyticsDashboard> {
  return apiFetch<AnalyticsDashboard>(`/api/analytics/dashboard?days=${days}`);
}

// --- New Feature APIs ---

export async function getEarnings(stock?: string) {
  const params = stock ? `?stock=${encodeURIComponent(stock)}` : "";
  return apiFetch<{ type: string; data: Record<string, unknown> }>(`/api/earnings${params}`);
}

export async function getDividends(stock?: string) {
  const params = stock ? `?stock=${encodeURIComponent(stock)}` : "";
  return apiFetch<{ type: string; data: Record<string, unknown> }>(`/api/dividends${params}`);
}

export async function getSectors() {
  return apiFetch<{ type: string; data: Record<string, unknown> }>("/api/sectors");
}

export async function getValuation() {
  return apiFetch<{ type: string; data: Record<string, unknown> }>("/api/valuation");
}

export async function getAnnouncements() {
  return apiFetch<{ type: string; data: Record<string, unknown> }>("/api/announcements");
}

// --- Watchlist ---

export async function saveToWatchlist(symbol: string) {
  return apiFetch("/api/watchlist", {
    method: "POST",
    body: JSON.stringify({ symbol }),
  });
}

export async function getWatchlist() {
  return apiFetch<{ watchlist: { symbol: string; price?: number; change_pct?: number; added_at: string }[]; count: number }>("/api/watchlist");
}

export async function removeFromWatchlist(symbol: string) {
  return apiFetch(`/api/watchlist/${encodeURIComponent(symbol)}`, { method: "DELETE" });
}

// --- Export PDF ---

export async function exportPdf(cardType: string, data: Record<string, unknown>): Promise<Blob> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}/api/export/pdf`, {
    method: "POST",
    headers,
    body: JSON.stringify({ card_type: cardType, data }),
  });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  return res.blob();
}

// --- Share ---

export async function shareCard(cardType: string, data: Record<string, unknown>): Promise<{ id: string; url: string }> {
  return apiFetch("/api/share", {
    method: "POST",
    body: JSON.stringify({ card_type: cardType, data }),
  });
}

/** Stream general deep research (agent debate) via SSE. */
export async function streamDeepResearchGeneral(query: string): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const url = `${API_URL}/api/deep-research`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Deep Research API ${res.status}: ${body || res.statusText} [${url}]`);
    }
    return res;
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(`Network error reaching ${url} — backend may be down or unreachable. (${err.message})`);
    }
    throw err;
  }
}

/** Stream 6-agent Council research via SSE. */
export async function streamCouncilResearch(query: string, signal?: AbortSignal): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const url = `${API_URL}/api/council-research`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
      signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Council Research API ${res.status}: ${body || res.statusText}`);
    }
    return res;
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(`Network error — backend may be down. (${(err as Error).message})`);
    }
    throw err;
  }
}

/** Submit user feedback (thumbs up/down). */
export async function submitFeedback(data: FeedbackRequest): Promise<void> {
  await apiFetch<{ status: string }>("/api/feedback", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
