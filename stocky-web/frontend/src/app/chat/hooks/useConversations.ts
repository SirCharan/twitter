import { useState, useEffect, useCallback } from "react";
import type { ConversationSummary } from "@/lib/types";
import {
  getConversations,
  deleteConversation as apiDelete,
} from "@/lib/api";

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const deleteConversation = useCallback(
    async (id: string) => {
      await apiDelete(id);
      setConversations((prev) =>
        prev.filter((c) => c.conversation_id !== id),
      );
    },
    [],
  );

  return { conversations, isLoading, refresh, deleteConversation };
}
