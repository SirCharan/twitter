"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, RefreshCw, ThumbsUp, ThumbsDown,
  ArrowRightLeft, GitCompare, Search, FileText,
  TrendingUp, BarChart3, Check,
} from "lucide-react";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import type { ChatMessage } from "@/lib/types";

// Contextual actions per message type
const CONTEXTUAL: Partial<Record<string, { label: string; icon: React.ReactNode; action: string }[]>> = {
  analysis: [
    { label: "Trade this", icon: <ArrowRightLeft size={12} />, action: "trade" },
    { label: "Compare", icon: <GitCompare size={12} />, action: "compare" },
    { label: "Deep research", icon: <Search size={12} />, action: "deep_research" },
  ],
  deep_research: [
    { label: "Trade this", icon: <ArrowRightLeft size={12} />, action: "trade" },
    { label: "Compare", icon: <GitCompare size={12} />, action: "compare" },
  ],
  news: [
    { label: "Summarise", icon: <FileText size={12} />, action: "summarise" },
    { label: "Deep dive", icon: <Search size={12} />, action: "deep_dive" },
  ],
  scan: [
    { label: "Analyse top pick", icon: <TrendingUp size={12} />, action: "analyse_top" },
  ],
  chart: [
    { label: "Full analysis", icon: <BarChart3 size={12} />, action: "full_analysis" },
  ],
  overview: [
    { label: "Deep dive sector", icon: <Search size={12} />, action: "sector" },
  ],
  compare: [
    { label: "Trade winner", icon: <ArrowRightLeft size={12} />, action: "trade_winner" },
  ],
};

function getCopyText(message: ChatMessage): string {
  const data = message.data as Record<string, unknown> | undefined;
  switch (message.type) {
    case "analysis":
      return (data?.verdict as string) || (data?.name as string) || message.content;
    case "news":
      return (data?.ai_summary as string) || message.content;
    case "overview":
      return (data?.ai_mood as string) || message.content;
    default:
      return message.content;
  }
}

interface Props {
  message: ChatMessage;
  onContextAction: (text: string) => void;
  onRegenerate: () => void;
  isLast: boolean;
  isLoading: boolean;
}

export default function MessageActions({ message, onContextAction, onRegenerate, isLast, isLoading }: Props) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [copied, setCopied] = useState(false);

  const contextual = CONTEXTUAL[message.type] ?? [];
  const data = message.data as Record<string, unknown> | undefined;
  const symbol = (data?.symbol as string) || (data?.name as string) || "";

  function handleCopy() {
    const text = getCopyText(message);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Copied to clipboard");
      track("action", "copy_message", { type: message.type });
    });
  }

  function handleThumb(dir: "up" | "down") {
    if (feedback === dir) return;
    setFeedback(dir);
    toast.success(dir === "up" ? "Thanks for the feedback!" : "Got it — we'll improve");
    track("feedback", dir === "up" ? "thumbs_up" : "thumbs_down", { type: message.type, id: message.id });
  }

  function handleContextAction(action: string) {
    const msgs: Record<string, string> = {
      trade: `buy ${symbol}`,
      compare: `compare ${symbol} with peers`,
      deep_research: `deep research on ${symbol}`,
      summarise: `summarise market news`,
      deep_dive: `deep research on market news`,
      analyse_top: extractTopStock(data),
      full_analysis: `how is ${symbol} doing`,
      sector: `sector rotation`,
      trade_winner: extractWinner(data),
    };
    const text = msgs[action];
    if (text) {
      track("action", "context_action", { action, type: message.type });
      onContextAction(text);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.15 }}
      className="mt-1.5 flex flex-wrap items-center gap-1"
    >
      {/* Universal actions */}
      <div className="flex items-center gap-0.5 rounded-lg border px-1 py-0.5"
        style={{ background: "var(--surface)", borderColor: "var(--card-border)" }}>

        {/* Copy */}
        <button
          onClick={handleCopy}
          title="Copy"
          className="bounce-tap flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-white/5"
          style={{ color: copied ? "var(--positive)" : "var(--muted)" }}
        >
          <AnimatePresence mode="wait">
            {copied
              ? <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check size={12} /></motion.span>
              : <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Copy size={12} /></motion.span>
            }
          </AnimatePresence>
        </button>

        {/* Regenerate — only on last message when not loading */}
        {isLast && !isLoading && (
          <button
            onClick={() => { track("action", "regenerate", {}); onRegenerate(); }}
            title="Regenerate response"
            className="bounce-tap flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-white/5"
            style={{ color: "var(--muted)" }}
          >
            <RefreshCw size={12} />
          </button>
        )}

        {/* Divider */}
        <div className="mx-0.5 h-3 w-px" style={{ background: "var(--card-border)" }} />

        {/* Thumbs up */}
        <button
          onClick={() => handleThumb("up")}
          title="Helpful"
          className="bounce-tap flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-white/5"
          style={{ color: feedback === "up" ? "var(--positive)" : "var(--muted)" }}
        >
          <ThumbsUp size={12} fill={feedback === "up" ? "currentColor" : "none"} />
        </button>

        {/* Thumbs down */}
        <button
          onClick={() => handleThumb("down")}
          title="Not helpful"
          className="bounce-tap flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-white/5"
          style={{ color: feedback === "down" ? "var(--negative)" : "var(--muted)" }}
        >
          <ThumbsDown size={12} fill={feedback === "down" ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Contextual action pills */}
      {contextual.map((item) => (
        <motion.button
          key={item.action}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.93 }}
          onClick={() => handleContextAction(item.action)}
          className="flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium transition-colors hover:border-[var(--accent-dim)]"
          style={{
            background: "var(--surface)",
            borderColor: "var(--card-border)",
            color: "var(--muted)",
          }}
        >
          {item.icon}
          {item.label}
        </motion.button>
      ))}
    </motion.div>
  );
}

function extractTopStock(data: Record<string, unknown> | undefined): string {
  const results = data?.results as Array<{ symbol?: string }> | undefined;
  return results?.[0]?.symbol ? `how is ${results[0].symbol} doing` : "market overview";
}

function extractWinner(data: Record<string, unknown> | undefined): string {
  const stocks = data?.stocks as Array<{ symbol?: string; overall_score?: number }> | undefined;
  if (!stocks?.length) return "market overview";
  const winner = stocks.reduce((a, b) => ((a.overall_score ?? 0) > (b.overall_score ?? 0) ? a : b));
  return winner.symbol ? `buy ${winner.symbol}` : "market overview";
}
