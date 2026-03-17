"use client";

import { motion } from "framer-motion";
import type { ChatMessage } from "@/lib/types";
import ErrorBoundary from "./ErrorBoundary";
import MarkdownRich from "./MarkdownRich";
import AnalysisCard from "./AnalysisCard";
import PriceCard from "./PriceCard";
import PortfolioCard from "./PortfolioCard";
import DataTable from "./DataTable";
import NewsCard from "./NewsCard";
import OverviewCard from "./OverviewCard";
import TradeConfirmation from "./TradeConfirmation";
import ProgressCard from "./ProgressCard";
import type { ProgressStep } from "./ProgressCard";
import DeepResearchCard from "./DeepResearchCard";
import ScanCard from "./ScanCard";
import ChartCard from "./ChartCard";
import CompareCard from "./CompareCard";
import IpoCard from "./IpoCard";
import MacroCard from "./MacroCard";
import RrgCard from "./RrgCard";
import SuggestionCard from "./SuggestionCard";
import AgentDebateCard from "./AgentDebateCard";
import DebateProgressCard from "./DebateProgressCard";
import Confetti from "./Confetti";

interface Props {
  message: ChatMessage;
  onTradeAction: (actionId: string, action: "confirm" | "cancel") => void;
  onSend: (text: string) => void;
}

// These types render full-width without a bubble wrapper
const FULL_WIDTH_TYPES = new Set([
  "analysis", "deep_research", "progress", "scan", "chart",
  "compare", "ipo", "macro", "rrg", "portfolio", "positions",
  "holdings", "orders", "overview", "news", "suggestion",
  "agent_debate", "debate_progress",
]);

export default function MessageBubble({ message, onTradeAction, onSend }: Props) {
  const isUser = message.role === "user";

  if (!isUser && FULL_WIDTH_TYPES.has(message.type)) {
    return (
      <motion.div
        role="article"
        aria-label={`${message.type} card`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <ErrorBoundary>
          <RichContent message={message} onTradeAction={onTradeAction} onSend={onSend} />
        </ErrorBoundary>
      </motion.div>
    );
  }

  return (
    <motion.div
      role="article"
      aria-label={isUser ? "Your message" : "Assistant message"}
      initial={{ opacity: 0, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`bubble-hover max-w-[92%] sm:max-w-[85%] rounded-2xl px-4 py-3 ${isUser ? "ml-3 sm:ml-8" : "mr-3 sm:mr-8"}`}
        style={{
          background: isUser ? "var(--card-bg)" : "var(--surface)",
          border: "1px solid var(--card-border)",
          borderLeft: isUser ? "none" : "2px solid var(--accent-dim)",
        }}
      >
        {isUser ? (
          <p className="selectable text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--foreground)" }}>
            {message.content}
          </p>
        ) : (
          <ErrorBoundary>
            <RichContent message={message} onTradeAction={onTradeAction} onSend={onSend} />
          </ErrorBoundary>
        )}
      </div>
    </motion.div>
  );
}

function RichContent({
  message,
  onTradeAction,
  onSend,
}: {
  message: ChatMessage;
  onTradeAction: (actionId: string, action: "confirm" | "cancel") => void;
  onSend: (text: string) => void;
}) {
  const { type, data } = message;

  switch (type) {
    case "analysis":
      return <AnalysisCard data={data as Record<string, unknown>} />;

    case "deep_research":
      return <DeepResearchCard data={data as Record<string, unknown>} />;

    case "progress": {
      const d = data as Record<string, unknown> | undefined;
      return (
        <ProgressCard
          title={(d?.title as string) || "Researching..."}
          icon={(d?.icon as string) || "🔬"}
          steps={(d?.steps as ProgressStep[]) || []}
        />
      );
    }

    case "scan":
      return <ScanCard data={data as Record<string, unknown>} />;

    case "chart":
      return <ChartCard data={data as Record<string, unknown>} />;

    case "compare":
      return <CompareCard data={data as Record<string, unknown>} />;

    case "ipo":
      return <IpoCard data={data as Record<string, unknown>} />;

    case "macro":
      return <MacroCard data={data as Record<string, unknown>} />;

    case "rrg":
      return <RrgCard data={data as Record<string, unknown>} />;

    case "price":
      return <PriceCard data={data as Record<string, unknown>} />;

    case "portfolio":
      return <PortfolioCard data={data as Record<string, unknown>} />;

    case "positions":
    case "holdings":
    case "orders":
      return <DataTable type={type} data={data as Record<string, unknown>} />;

    case "news":
      return <NewsCard data={data as Record<string, unknown>} />;

    case "overview":
      return <OverviewCard data={data as Record<string, unknown>} />;

    case "agent_debate":
      return <AgentDebateCard data={data as Record<string, unknown>} />;

    case "debate_progress": {
      const dp = data as Record<string, unknown> | undefined;
      const phases = (dp?.phases as Array<{
        label: string;
        status: string;
        agent?: string;
        content?: string;
        thinking?: string;
        elapsed?: number;
      }>) || [];
      return <DebateProgressCard phases={phases} />;
    }

    case "suggestion":
      return <SuggestionCard data={data as Record<string, unknown>} onSend={onSend} />;

    case "trade_confirm":
      return (
        <TradeConfirmation
          data={data as Record<string, unknown>}
          actionId={message.actionId || ""}
          onAction={onTradeAction}
        />
      );

    case "order_result": {
      const err = data?.error as string | undefined;
      return (
        <div className="relative">
          {!err && <Confetti />}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="rounded-xl border px-4 py-3"
            style={{
              borderColor: err ? "var(--negative)" : "var(--positive)",
              background: "var(--card-bg)",
            }}
          >
            <p className="text-sm font-medium" style={{ color: err ? "var(--negative)" : "var(--positive)" }}>
              {err ? "Order Failed" : "Order Placed"}
            </p>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
              {message.content}
            </p>
          </motion.div>
        </div>
      );
    }

    case "error":
      return (
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-xs" style={{ color: "var(--negative)" }}>!</span>
          <p className="text-sm leading-relaxed" style={{ color: "var(--negative)" }}>
            {message.content}
          </p>
        </div>
      );

    default:
      return (
        <div className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
          <MarkdownRich text={message.content} />
        </div>
      );
  }
}
