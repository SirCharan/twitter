"use client";
import { useState } from "react";
import { Gauge } from "lucide-react";
import MarkdownRich from "./MarkdownRich";
import CardWrapper from "./ui/CardWrapper";
import Disclaimer from "./ui/Disclaimer";
import CardActions from "./ui/CardActions";

interface ValuationStock {
  symbol: string;
  pe: number;
  pb: number;
}

interface Props {
  data: Record<string, unknown>;
}

const INITIAL_ROWS = 5;

export default function ValuationCard({ data }: Props) {
  const [showAllExpensive, setShowAllExpensive] = useState(false);
  const [showAllCheap, setShowAllCheap] = useState(false);

  const marketPe = data.market_pe as number | undefined;
  const marketPb = data.market_pb as number | undefined;
  const avgPe = data.avg_pe as number | undefined;
  const avgPb = data.avg_pb as number | undefined;
  const mostExpensive = (data.most_expensive as ValuationStock[]) || [];
  const leastExpensive = (data.least_expensive as ValuationStock[]) || [];

  const visibleExpensive = showAllExpensive ? mostExpensive : mostExpensive.slice(0, INITIAL_ROWS);
  const visibleCheap = showAllCheap ? leastExpensive : leastExpensive.slice(0, INITIAL_ROWS);

  return (
    <CardWrapper
      icon={<Gauge size={16} style={{ color: "var(--accent)" }} />}
      title="Market Valuation"
    >
      {/* Big numbers */}
      <div className="mb-4 flex flex-wrap gap-3">
        {marketPe != null && (
          <div
            className="flex-1 min-w-[100px] rounded-xl px-3 py-2.5 text-center"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}
          >
            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--muted)" }}>
              Market P/E
            </p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--accent)" }}>
              {marketPe.toFixed(1)}
            </p>
            {avgPe != null && (
              <p className="text-[10px] tabular-nums mt-0.5" style={{ color: "var(--muted)" }}>
                Avg: {avgPe.toFixed(1)}
              </p>
            )}
          </div>
        )}
        {marketPb != null && (
          <div
            className="flex-1 min-w-[100px] rounded-xl px-3 py-2.5 text-center"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}
          >
            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--muted)" }}>
              Market P/B
            </p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--accent)" }}>
              {marketPb.toFixed(2)}
            </p>
            {avgPb != null && (
              <p className="text-[10px] tabular-nums mt-0.5" style={{ color: "var(--muted)" }}>
                Avg: {avgPb.toFixed(2)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Most Expensive */}
      {mostExpensive.length > 0 && (
        <div className="mb-4">
          <p
            className="mb-2 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--negative)" }}
          >
            Most Expensive
          </p>
          <div
            className="overflow-x-auto rounded-xl"
            style={{ border: "1px solid var(--card-border)" }}
          >
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--muted)" }}>Symbol</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: "var(--muted)" }}>P/E</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: "var(--muted)" }}>P/B</th>
                </tr>
              </thead>
              <tbody>
                {visibleExpensive.map((item, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: i < visibleExpensive.length - 1 ? "1px solid var(--card-border)" : undefined,
                      background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                    }}
                  >
                    <td className="px-3 py-2 font-medium" style={{ color: "var(--accent)" }}>{item.symbol}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: "var(--foreground)" }}>
                      {item.pe.toFixed(1)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: "var(--foreground)" }}>
                      {item.pb.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {mostExpensive.length > INITIAL_ROWS && (
            <button
              onClick={() => setShowAllExpensive((v) => !v)}
              className="mt-2 text-xs underline-offset-2 hover:underline"
              style={{ color: "var(--muted)" }}
            >
              {showAllExpensive ? "Show less ↑" : `Show ${mostExpensive.length - INITIAL_ROWS} more ↓`}
            </button>
          )}
        </div>
      )}

      {/* Least Expensive */}
      {leastExpensive.length > 0 && (
        <div className="mb-1">
          <p
            className="mb-2 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--positive)" }}
          >
            Least Expensive
          </p>
          <div
            className="overflow-x-auto rounded-xl"
            style={{ border: "1px solid var(--card-border)" }}
          >
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--muted)" }}>Symbol</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: "var(--muted)" }}>P/E</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: "var(--muted)" }}>P/B</th>
                </tr>
              </thead>
              <tbody>
                {visibleCheap.map((item, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: i < visibleCheap.length - 1 ? "1px solid var(--card-border)" : undefined,
                      background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                    }}
                  >
                    <td className="px-3 py-2 font-medium" style={{ color: "var(--accent)" }}>{item.symbol}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: "var(--foreground)" }}>
                      {item.pe.toFixed(1)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: "var(--foreground)" }}>
                      {item.pb.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {leastExpensive.length > INITIAL_ROWS && (
            <button
              onClick={() => setShowAllCheap((v) => !v)}
              className="mt-2 text-xs underline-offset-2 hover:underline"
              style={{ color: "var(--muted)" }}
            >
              {showAllCheap ? "Show less ↑" : `Show ${leastExpensive.length - INITIAL_ROWS} more ↓`}
            </button>
          )}
        </div>
      )}

      {marketPe == null && marketPb == null && !mostExpensive.length && !leastExpensive.length && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No valuation data available.
        </p>
      )}

      {/* Stocky's Take */}
      {(data.ai_analysis as string) && (
        <div
          className="rounded-xl border-l-2 px-4 py-3 mt-3"
          style={{
            borderColor: "var(--accent)",
            background: "linear-gradient(135deg, rgba(201,169,110,0.04) 0%, var(--surface) 100%)",
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--accent)" }}>
            Stocky&apos;s Take
          </p>
          <div className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
            <MarkdownRich text={data.ai_analysis as string} />
          </div>
        </div>
      )}

      <Disclaimer />
      <CardActions cardType="valuation" cardData={data} />
    </CardWrapper>
  );
}
