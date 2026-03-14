import type { ChatMessage } from "@/lib/types";
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
      <div className="animate-fade-in">
        <RichContent message={message} onTradeAction={onTradeAction} onSend={onSend} />
      </div>
    );
  }

  return (
    <div className={`flex animate-fade-in ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${isUser ? "ml-6 sm:ml-12" : "mr-6 sm:mr-12"}`}
        style={{
          background: isUser ? "var(--card-bg)" : "var(--surface)",
          border: "1px solid var(--card-border)",
          borderLeft: isUser ? "none" : "2px solid var(--accent-dim)",
        }}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--foreground)" }}>
            {message.content}
          </p>
        ) : (
          <RichContent message={message} onTradeAction={onTradeAction} onSend={onSend} />
        )}
      </div>
    </div>
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
      const phases = (dp?.phases as Array<{ label: string; status: string; content?: string }>) || [];
      return (
        <div
          className="rounded-2xl border px-5 py-4"
          style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
        >
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              Agent Debate
            </span>
            <div
              className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
              style={{ background: "rgba(201,169,110,0.1)", color: "var(--accent)" }}
            >
              Debating
            </div>
          </div>
          <div className="space-y-2">
            {phases.map((phase, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                  {phase.status === "done" && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="6.5" stroke="var(--positive)" />
                      <path d="M4 7l2 2 4-4" stroke="var(--positive)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {phase.status === "running" && (
                    <div
                      className="h-3.5 w-3.5 rounded-full border-2 border-transparent animate-spin"
                      style={{ borderTopColor: "var(--accent)", borderRightColor: "var(--accent)" }}
                    />
                  )}
                  {phase.status === "pending" && (
                    <div
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: "var(--card-border)" }}
                    />
                  )}
                </div>
                <span
                  className="flex-1 text-xs"
                  style={{
                    color: phase.status === "pending" ? "var(--muted)" : "var(--foreground)",
                    opacity: phase.status === "pending" ? 0.45 : 1,
                  }}
                >
                  {phase.status === "running" ? (
                    <>
                      {phase.label}
                      <span className="ml-1 animate-pulse" style={{ color: "var(--accent)" }}>...</span>
                    </>
                  ) : (
                    phase.label
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
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
        <div
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
        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--foreground)" }}>
          {message.content}
        </p>
      );
  }
}
