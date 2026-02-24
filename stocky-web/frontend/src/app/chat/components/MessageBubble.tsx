import type { ChatMessage } from "@/lib/types";
import AnalysisCard from "./AnalysisCard";
import PriceCard from "./PriceCard";
import PortfolioCard from "./PortfolioCard";
import DataTable from "./DataTable";
import NewsCard from "./NewsCard";
import OverviewCard from "./OverviewCard";
import TradeConfirmation from "./TradeConfirmation";

interface Props {
  message: ChatMessage;
  onTradeAction: (actionId: string, action: "confirm" | "cancel") => void;
}

export default function MessageBubble({ message, onTradeAction }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex animate-fade-in ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${isUser ? "ml-12" : "mr-12"}`}
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
          <RichContent message={message} onTradeAction={onTradeAction} />
        )}
      </div>
    </div>
  );
}

function RichContent({
  message,
  onTradeAction,
}: {
  message: ChatMessage;
  onTradeAction: (actionId: string, action: "confirm" | "cancel") => void;
}) {
  const { type, data } = message;

  switch (type) {
    case "analysis":
      return <AnalysisCard data={data as Record<string, unknown>} />;
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
