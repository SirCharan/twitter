import { useState, useCallback } from "react";
import type { ChatMessage } from "@/lib/types";
import {
  sendMessage as apiSendMessage,
  confirmTrade as apiConfirmTrade,
  cancelTrade as apiCancelTrade,
  getConversationMessages,
} from "@/lib/api";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

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
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            err instanceof Error ? err.message : "Something went wrong.",
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

  const newChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  return {
    messages,
    isLoading,
    conversationId,
    sendMessage,
    handleTradeAction,
    loadConversation,
    newChat,
  };
}
