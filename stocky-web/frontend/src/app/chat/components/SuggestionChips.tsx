"use client";
import { motion } from "framer-motion";
import type { ChatMessage } from "@/lib/types";
import { track } from "@/lib/analytics";

function getSuggestions(message: ChatMessage): string[] {
  const data = message.data as Record<string, unknown> | undefined;
  const symbol = (data?.symbol as string) || (data?.name as string) || "";

  switch (message.type) {
    case "analysis":
      return symbol
        ? [`Compare ${symbol} with peers`, `Deep research on ${symbol}`, `Chart ${symbol}`]
        : [];
    case "deep_research":
      return symbol
        ? [`Trade ${symbol}`, `Compare ${symbol} with peers`, `Latest news on ${symbol}`]
        : [];
    case "overview":
      return ["Top gainer analysis", "Market news", "Sector rotation"];
    case "news":
      return ["Summarise top stories", "Market overview", "Deep research"];
    case "scan": {
      const results = data?.results as Array<{ symbol?: string }> | undefined;
      const top = results?.[0]?.symbol;
      return top
        ? [`Analyse ${top}`, `Chart ${top}`, "Run another scan"]
        : ["Market overview", "Run another scan"];
    }
    case "chart":
      return symbol
        ? [`Technical analysis for ${symbol}`, `Deep research on ${symbol}`]
        : [];
    case "compare": {
      const stocks = data?.stocks as Array<{ symbol?: string; overall_score?: number }> | undefined;
      const winner = stocks?.reduce((a, b) => ((a.overall_score ?? 0) > (b.overall_score ?? 0) ? a : b));
      return winner?.symbol
        ? [`Trade ${winner.symbol}`, `Deep research on ${winner.symbol}`]
        : ["Market overview"];
    }
    case "ipo":
      return ["Market overview", "Latest IPO news"];
    case "macro":
      return ["Market overview", "Sector rotation"];
    case "rrg":
      return ["Analyse top rotating sector", "Market overview"];
    case "order_result":
      return ["My portfolio", "Market overview"];
    default:
      return [];
  }
}

interface Props {
  message: ChatMessage;
  onSend: (text: string) => void;
}

export default function SuggestionChips({ message, onSend }: Props) {
  const suggestions = getSuggestions(message);
  if (!suggestions.length) return null;

  return (
    <div className="mt-2 flex gap-1.5 overflow-x-auto scrollbar-none pl-1 pb-1">
      {suggestions.map((s, i) => (
        <motion.button
          key={s}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 25 }}
          whileHover={{ y: -2, boxShadow: "0 2px 12px rgba(201,169,110,0.12)" }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            track("action", "suggestion_chip", { suggestion: s, type: message.type });
            onSend(s);
          }}
          className="shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors min-h-[44px] flex items-center"
          style={{
            borderColor: "var(--card-border)",
            color: "var(--muted)",
            background: "var(--surface)",
          }}
        >
          {s}
        </motion.button>
      ))}
    </div>
  );
}
