"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, RefreshCw, ThumbsUp, ThumbsDown,
  ArrowRightLeft, GitCompare, Search, FileText,
  TrendingUp, BarChart3, Check, ChevronDown,
  Zap, Users,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { submitFeedback } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";
import FeedbackTagsModal from "./FeedbackTagsModal";

// Contextual actions per message type
const CONTEXTUAL: Partial<Record<string, { label: string; icon: React.ReactNode; action: string }[]>> = {
  analysis: [
    { label: "Trade this", icon: <ArrowRightLeft size={12} />, action: "trade" },
    { label: "Compare", icon: <GitCompare size={12} />, action: "compare" },
    { label: "Council deep dive", icon: <Users size={12} />, action: "council_deep" },
  ],
  deep_research: [
    { label: "Trade this", icon: <ArrowRightLeft size={12} />, action: "trade" },
    { label: "Compare", icon: <GitCompare size={12} />, action: "compare" },
  ],
  council_debate: [
    { label: "Execute trade", icon: <ArrowRightLeft size={12} />, action: "trade" },
    { label: "Ask TS about levels", icon: <BarChart3 size={12} />, action: "ask_ts" },
    { label: "Ask RG about sizing", icon: <Search size={12} />, action: "ask_rg" },
  ],
  news: [
    { label: "Summarise", icon: <FileText size={12} />, action: "summarise" },
    { label: "Council deep dive", icon: <Users size={12} />, action: "council_news" },
  ],
  scan: [
    { label: "Analyse top pick", icon: <TrendingUp size={12} />, action: "analyse_top" },
  ],
  chart: [
    { label: "Full analysis", icon: <BarChart3 size={12} />, action: "full_analysis" },
  ],
  overview: [
    { label: "Sector rotation", icon: <Search size={12} />, action: "sector" },
    { label: "Council deep dive", icon: <Users size={12} />, action: "council_overview" },
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
    case "council_debate": {
      const synthesis = data?.synthesis as Record<string, unknown> | undefined;
      return (synthesis?.executive_summary as string) || message.content;
    }
    default:
      return message.content;
  }
}

interface Props {
  message: ChatMessage;
  onContextAction: (text: string) => void;
  onRegenerate: () => void;
  onCouncilRegenerate?: () => void;
  isLast: boolean;
  isLoading: boolean;
}

export default function MessageActions({ message, onContextAction, onRegenerate, onCouncilRegenerate, isLast, isLoading }: Props) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [copied, setCopied] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

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

  async function handleThumbUp() {
    if (feedback) return;
    setFeedback("up");
    toast.success("Thanks for the feedback!");
    track("feedback", "thumbs_up", { type: message.type, id: message.id });
    try {
      await submitFeedback({
        message_id: message.id,
        conversation_id: message.conversationId || "",
        query: "",
        response_snippet: getCopyText(message).slice(0, 500),
        rating: "up",
        tags: [],
        comment: "",
      });
    } catch { /* silent */ }
  }

  function handleThumbDown() {
    if (feedback) return;
    setFeedback("down");
    setFeedbackModalOpen(true);
    track("feedback", "thumbs_down", { type: message.type, id: message.id });
  }

  function handleContextAction(action: string) {
    const msgs: Record<string, string> = {
      trade: `buy ${symbol}`,
      compare: `compare ${symbol} with peers`,
      council_deep: `deep research on ${symbol}`,
      council_news: `deep research on market news sentiment`,
      council_overview: `deep research on market outlook`,
      summarise: `summarise market news`,
      deep_dive: `deep research on market news`,
      analyse_top: extractTopStock(data),
      full_analysis: `how is ${symbol} doing`,
      sector: `sector rotation`,
      trade_winner: extractWinner(data),
      ask_ts: `Ask the Technical Strategist: what are the key support/resistance levels for ${symbol}?`,
      ask_rg: `Ask the Risk Guardian: what's the optimal position size for ${symbol}?`,
    };
    const text = msgs[action];
    if (text) {
      track("action", "context_action", { action, type: message.type });
      onContextAction(text);
    }
  }

  return (
    <>
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

          {/* Regenerate menu — only on last message when not loading */}
          {isLast && !isLoading && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  title="Regenerate response"
                  className="bounce-tap flex h-6 items-center gap-0.5 rounded-md px-1 transition-colors hover:bg-white/5"
                  style={{ color: "var(--muted)" }}
                >
                  <RefreshCw size={12} />
                  <ChevronDown size={8} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  sideOffset={6}
                  align="start"
                  className="z-50 min-w-[180px] rounded-xl border p-1"
                  style={{
                    background: "var(--card-bg)",
                    borderColor: "var(--card-border)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                  }}
                >
                  <DropdownMenu.Item
                    onSelect={() => { track("action", "regenerate", { mode: "same" }); onRegenerate(); }}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-medium outline-none cursor-pointer transition-colors hover:bg-white/5"
                    style={{ color: "var(--foreground)" }}
                  >
                    <RefreshCw size={12} style={{ color: "var(--muted)" }} />
                    Regenerate
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => { track("action", "regenerate", { mode: "deeper" }); onRegenerate(); }}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-medium outline-none cursor-pointer transition-colors hover:bg-white/5"
                    style={{ color: "var(--foreground)" }}
                  >
                    <Zap size={12} style={{ color: "var(--accent)" }} />
                    Deeper Analysis
                  </DropdownMenu.Item>
                  {onCouncilRegenerate && (
                    <DropdownMenu.Item
                      onSelect={() => { track("action", "regenerate", { mode: "council" }); onCouncilRegenerate(); }}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-medium outline-none cursor-pointer transition-colors hover:bg-white/5"
                      style={{ color: "var(--foreground)" }}
                    >
                      <Users size={12} style={{ color: "#c9a96e" }} />
                      Council Debate
                    </DropdownMenu.Item>
                  )}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}

          {/* Divider */}
          <div className="mx-0.5 h-3 w-px" style={{ background: "var(--card-border)" }} />

          {/* Thumbs up */}
          <button
            onClick={handleThumbUp}
            disabled={!!feedback}
            title="Helpful"
            className="bounce-tap flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-white/5 disabled:opacity-60"
            style={{ color: feedback === "up" ? "var(--positive)" : "var(--muted)" }}
          >
            <ThumbsUp size={12} fill={feedback === "up" ? "currentColor" : "none"} />
          </button>

          {/* Thumbs down */}
          <button
            onClick={handleThumbDown}
            disabled={!!feedback}
            title="Not helpful"
            className="bounce-tap flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-white/5 disabled:opacity-60"
            style={{ color: feedback === "down" ? "var(--negative)" : "var(--muted)" }}
          >
            <ThumbsDown size={12} fill={feedback === "down" ? "currentColor" : "none"} />
          </button>
        </div>

        {/* Contextual action pills */}
        {contextual
          .filter((item) => {
            const needsSymbol = ["trade", "compare", "council_deep", "full_analysis", "trade_winner", "ask_ts", "ask_rg"].includes(item.action);
            return !needsSymbol || symbol !== "";
          })
          .map((item) => (
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

      {/* Feedback tags modal for thumbs down */}
      <FeedbackTagsModal
        open={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        messageId={message.id}
        conversationId={message.conversationId}
        query=""
        responseSnippet={getCopyText(message)}
      />
    </>
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
