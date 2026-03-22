import { useState, useCallback } from "react";
import type { ChatMessage } from "@/lib/types";
import {
  sendMessage as apiSendMessage,
  confirmTrade as apiConfirmTrade,
  cancelTrade as apiCancelTrade,
  getConversationMessages,
  streamResearch,
  streamDeepResearchGeneral,
} from "@/lib/api";
import { trackEvent } from "@/lib/analytics";

const SYMBOL_NOISE = new Set(["NSE","BSE","IPO","RBI","FII","DII","AI","GDP","SMA","RSI","EPS","P&L","LTP"]);
function extractSymbols(text: string): string[] {
  return (text.match(/\b[A-Z]{2,10}\b/g) ?? []).filter((s) => !SYMBOL_NOISE.has(s));
}

const RESEARCH_STEPS = [
  "Fetching technical indicators",
  "Loading fundamental data",
  "Loading quarterly financials",
  "Scanning news sources",
  "Checking shareholding",
  "Generating AI verdict",
  "Building report",
];

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
        type: "text",
        timestamp: new Date().toISOString(),
        conversationId: conversationId || "",
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      trackEvent("query_submit", "chat_send", {
        query: text,
        symbols: extractSymbols(text),
        conversationId: conversationId ?? undefined,
      });

      try {
        const res = await apiSendMessage(text, conversationId || undefined);

        if (!conversationId) {
          setConversationId(res.conversation_id);
        }

        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: res.content,
          type: res.type as ChatMessage["type"],
          data: res.data as Record<string, unknown> | undefined,
          actionId: res.action_id || undefined,
          timestamp: new Date().toISOString(),
          conversationId: res.conversation_id,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        const detail = err instanceof TypeError
          ? `Network error — backend may be down. (${err.message})`
          : err instanceof Error ? err.message : "Something went wrong.";
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: detail,
          type: "error",
          timestamp: new Date().toISOString(),
          conversationId: conversationId || "",
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId],
  );

  const streamDeepResearch = useCallback(
    async (stock: string, mode: string) => {
      const convId = conversationId || "";

      // Add user message
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: `Deep research — ${stock.toUpperCase()}${mode !== "full" ? ` (${mode})` : ""}`,
        type: "text",
        timestamp: new Date().toISOString(),
        conversationId: convId,
      };
      setMessages((prev) => [...prev, userMsg]);
      trackEvent("query_submit", "deep_research", { stock, mode });

      // Add animated progress placeholder
      const progressId = `progress-${Date.now()}`;
      const makeStepsData = (
        statuses: Array<"pending" | "running" | "done">,
        elapsed: Array<number | undefined>,
      ) => ({
        stock,
        title: `Deep Research — ${stock.toUpperCase()}`,
        icon: "🔬",
        steps: RESEARCH_STEPS.map((label, i) => ({
          label,
          status: statuses[i],
          elapsed: elapsed[i],
        })),
      });

      const stepStatuses: Array<"pending" | "running" | "done"> = RESEARCH_STEPS.map(() => "pending");
      stepStatuses[0] = "running";
      const stepElapsed: Array<number | undefined> = RESEARCH_STEPS.map(() => undefined);

      const progressMsg: ChatMessage = {
        id: progressId,
        role: "assistant",
        content: `Deep research — ${stock}`,
        type: "progress",
        data: makeStepsData(stepStatuses, stepElapsed),
        timestamp: new Date().toISOString(),
        conversationId: convId,
      };
      setMessages((prev) => [...prev, progressMsg]);
      setIsLoading(true);

      try {
        const res = await streamResearch(stock, mode);
        if (!res.body) throw new Error("No response body from research API");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === "error") {
                throw new Error(`Backend error: ${event.message || "Unknown server error"}`);
              } else if (event.type === "progress") {
                const idx = event.index as number;
                stepStatuses[idx] = "done";
                stepElapsed[idx] = event.elapsed;
                if (idx + 1 < RESEARCH_STEPS.length) stepStatuses[idx + 1] = "running";
                updateMessage(progressId, { data: makeStepsData(stepStatuses, stepElapsed) });
              } else if (event.type === "result") {
                updateMessage(progressId, {
                  type: "deep_research",
                  content: `Deep Research — ${stock}`,
                  data: event.data as Record<string, unknown>,
                });
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message.startsWith("Backend error:")) throw parseErr;
              // skip malformed line
            }
          }
        }
      } catch (err) {
        updateMessage(progressId, {
          type: "error",
          content: err instanceof Error ? err.message : "Deep research failed.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, updateMessage],
  );

  const handleTradeAction = useCallback(
    async (actionId: string, action: "confirm" | "cancel") => {
      setIsLoading(true);
      try {
        const res =
          action === "confirm"
            ? await apiConfirmTrade(actionId)
            : await apiCancelTrade(actionId);

        const resultMsg: ChatMessage = {
          id: `trade-${Date.now()}`,
          role: "assistant",
          content:
            action === "confirm"
              ? `Order placed. ID: ${(res as Record<string, unknown>).order_id || "unknown"}`
              : "Order cancelled.",
          type: action === "confirm" ? "order_result" : "text",
          data: res as Record<string, unknown>,
          timestamp: new Date().toISOString(),
          conversationId: conversationId || "",
        };
        setMessages((prev) => [...prev, resultMsg]);
      } catch (err) {
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: err instanceof Error ? err.message : "Trade action failed.",
          type: "error",
          timestamp: new Date().toISOString(),
          conversationId: conversationId || "",
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId],
  );

  const loadConversation = useCallback(async (convId: string) => {
    setIsLoading(true);
    try {
      const data = await getConversationMessages(convId);
      const msgs: ChatMessage[] = (
        data.messages as Array<{
          id: number;
          role: string;
          content: string;
          message_type: string;
          structured_data: Record<string, unknown> | null;
          created_at: string;
          conversation_id: string;
        }>
      ).map((m) => ({
        id: `db-${m.id}`,
        role: m.role as "user" | "assistant",
        content: m.content,
        type: (m.message_type || "text") as ChatMessage["type"],
        data: m.structured_data || undefined,
        timestamp: m.created_at,
        conversationId: convId,
      }));
      setMessages(msgs);
      setConversationId(convId);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  const streamGeneralDeepResearch = useCallback(
    async (query: string) => {
      const convId = conversationId || "";

      // Add user message
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: query,
        type: "text",
        timestamp: new Date().toISOString(),
        conversationId: convId,
      };
      setMessages((prev) => [...prev, userMsg]);
      trackEvent("query_submit", "agent_debate", { query });

      // Add Triad progress placeholder
      const progressId = `debate-${Date.now()}`;
      const TRIAD_PHASES = [
        { label: "Scanning 38 news sources...", agent: "news" },
        { label: "Setting research parameters...", agent: "nexus" },
        { label: "Building thesis...", agent: "aris" },
        { label: "Cross-examining claims...", agent: "silas" },
        { label: "Rebuttal round...", agent: "aris" },
        { label: "Synthesizing final report...", agent: "nexus" },
      ];
      const PHASE_MAP: Record<string, number> = {
        briefing: 1, thesis: 2, cross_exam: 3, rebuttal: 4, synthesis: 5,
      };

      const makeDebateData = (
        statuses: Array<"pending" | "running" | "done">,
        contents: Array<string | undefined>,
        thinkings: Array<string | undefined>,
        elapseds: Array<number | undefined>,
      ) => ({
        query,
        title: "Triad Deep Research",
        startTime: Date.now(),
        phases: TRIAD_PHASES.map((p, i) => ({
          label: p.label,
          agent: p.agent,
          status: statuses[i],
          content: contents[i],
          thinking: thinkings[i],
          elapsed: elapseds[i],
        })),
      });

      const phaseStatuses: Array<"pending" | "running" | "done"> = ["running", "pending", "pending", "pending", "pending", "pending"];
      const phaseContents: Array<string | undefined> = Array(6).fill(undefined);
      const phaseThinkings: Array<string | undefined> = Array(6).fill(undefined);
      const phaseElapseds: Array<number | undefined> = Array(6).fill(undefined);

      const progressMsg: ChatMessage = {
        id: progressId,
        role: "assistant",
        content: "Triad Deep Research",
        type: "debate_progress",
        data: makeDebateData(phaseStatuses, phaseContents, phaseThinkings, phaseElapseds),
        timestamp: new Date().toISOString(),
        conversationId: convId,
      };
      setMessages((prev) => [...prev, progressMsg]);
      setIsLoading(true);

      try {
        const res = await streamDeepResearchGeneral(query);
        if (!res.body) throw new Error("No response body from deep research API");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === "news_scan") {
                if (event.status === "started") {
                  phaseStatuses[0] = "running";
                  phaseThinkings[0] = "Fetching live headlines from global sources...";
                } else if (event.status === "done") {
                  phaseStatuses[0] = "done";
                  phaseElapseds[0] = event.elapsed;
                  phaseContents[0] = `${event.headline_count || 0} headlines collected`;
                  phaseStatuses[1] = "running";
                }
                updateMessage(progressId, {
                  data: makeDebateData(phaseStatuses, phaseContents, phaseThinkings, phaseElapseds),
                });
              } else if (event.type === "phase") {
                const phaseIdx = PHASE_MAP[event.phase] ?? -1;
                if (phaseIdx < 0) continue;
                if (event.status === "started") {
                  phaseStatuses[phaseIdx] = "running";
                  if (event.thinking) phaseThinkings[phaseIdx] = event.thinking;
                } else if (event.status === "error" || event.status === "skipped") {
                  phaseStatuses[phaseIdx] = "done";
                  if (phaseIdx + 1 < TRIAD_PHASES.length) {
                    phaseStatuses[phaseIdx + 1] = "running";
                  }
                }
                updateMessage(progressId, {
                  data: makeDebateData(phaseStatuses, phaseContents, phaseThinkings, phaseElapseds),
                });
              } else if (event.type === "thinking") {
                const agentPhaseMap: Record<string, number[]> = {
                  nexus: [1, 5], aris: [2, 4], silas: [3],
                };
                const possibleIdxs = agentPhaseMap[event.agent] || [];
                const runningIdx = possibleIdxs.find((i) => phaseStatuses[i] === "running");
                if (runningIdx !== undefined) {
                  phaseThinkings[runningIdx] = event.text;
                  updateMessage(progressId, {
                    data: makeDebateData(phaseStatuses, phaseContents, phaseThinkings, phaseElapseds),
                  });
                }
              } else if (event.type === "agent_response") {
                const phaseIdx = PHASE_MAP[event.phase] ?? -1;
                if (phaseIdx < 0) continue;
                phaseStatuses[phaseIdx] = "done";
                phaseContents[phaseIdx] = event.content;
                phaseElapseds[phaseIdx] = event.elapsed;
                if (phaseIdx + 1 < TRIAD_PHASES.length) {
                  phaseStatuses[phaseIdx + 1] = "running";
                }
                updateMessage(progressId, {
                  data: makeDebateData(phaseStatuses, phaseContents, phaseThinkings, phaseElapseds),
                });
              } else if (event.type === "error") {
                throw new Error(`Backend error: ${event.message || "Unknown server error"}`);
              } else if (event.type === "result") {
                updateMessage(progressId, {
                  type: "agent_debate",
                  content: "Triad Deep Research",
                  data: event.data as Record<string, unknown>,
                });
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message.startsWith("Backend error:")) throw parseErr;
              // skip malformed line
            }
          }
        }
      } catch (err) {
        updateMessage(progressId, {
          type: "error",
          content: err instanceof Error ? err.message : "Deep research failed.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, updateMessage],
  );

  const newChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  const removeLastAssistant = useCallback(() => {
    setMessages((prev) => {
      const idx = [...prev].reverse().findIndex((m) => m.role === "assistant");
      if (idx === -1) return prev;
      return prev.filter((_, i) => i !== prev.length - 1 - idx);
    });
  }, []);

  return {
    messages,
    isLoading,
    conversationId,
    sendMessage,
    streamDeepResearch,
    streamGeneralDeepResearch,
    handleTradeAction,
    loadConversation,
    newChat,
    removeLastAssistant,
  };
}
