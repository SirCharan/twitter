import type { ChatResponse, ConversationSummary } from "./types";

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

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error: ${res.status}`);
  }

  return res.json();
}

// --- Auth ---

export async function login(
  username: string,
  password: string,
): Promise<string> {
  const data = await apiFetch<{ access_token: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem("stocky_token", data.access_token);
  return data.access_token;
}

export async function register(
  username: string,
  password: string,
): Promise<string> {
  const data = await apiFetch<{ access_token: string }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem("stocky_token", data.access_token);
  return data.access_token;
}

export function logout() {
  localStorage.removeItem("stocky_token");
  window.location.href = "/login";
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// --- Chat ---

export async function sendMessage(
  message: string,
  conversationId?: string,
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      message,
      conversation_id: conversationId || null,
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

export async function summarise(text: string) {
  return apiFetch<{ type: string; content: string }>("/api/summarise", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

/** Stream deep research via SSE. Returns a ReadableStream. */
export function streamResearch(stock: string, mode: string): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${API_URL}/api/research`, {
    method: "POST",
    headers,
    body: JSON.stringify({ stock, mode }),
  });
}
