"use client";
import { useState } from "react";
import { Coins } from "lucide-react";
import MarkdownRich from "./MarkdownRich";
import CardWrapper from "./ui/CardWrapper";
import Disclaimer from "./ui/Disclaimer";
import CardActions from "./ui/CardActions";

interface DividendHistory {
  date: string;
  amount: number;
  type: string;
}

interface TopYielder {
  symbol: string;
  yield_pct: number;
  payout_ratio: number;
  sustainability_score: number;
}

interface Props {
  data: Record<string, unknown>;
}

const INITIAL_ROWS = 5;

function SustainabilityBadge({ score }: { score: number }) {
  let bg: string;
  let color: string;
  if (score >= 70) {
    bg = "rgba(34,197,94,0.1)";
    color = "var(--positive)";
  } else if (score >= 40) {
    bg = "rgba(234,179,8,0.1)";
    color = "#EAB308";
  } else {
    bg = "rgba(239,68,68,0.1)";
    color = "var(--negative)";
  }
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums"
      style={{ background: bg, color }}
    >
      {score}
    </span>
  );
}

export default function DividendsCard({ data }: Props) {
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showAllYielders, setShowAllYielders] = useState(false);

  const history = (data.history as DividendHistory[]) || [];
  const yieldPct = data.yield_pct as number | undefined;
  const payoutRatio = data.payout_ratio as number | undefined;
  const sustainabilityScore = data.sustainability_score as number | undefined;
  const topYielders = (data.top_yielders as TopYielder[]) || [];

  const isSingleStock = history.length > 0;
  const visibleHistory = showAllHistory ? history : history.slice(0, INITIAL_ROWS);
  const visibleYielders = showAllYielders ? topYielders : topYielders.slice(0, INITIAL_ROWS);

  return (
    <CardWrapper
      icon={<Coins size={16} style={{ color: "var(--accent)" }} />}
      title="Dividend Tracker"
    >
      {/* Single stock: stats row */}
      {isSingleStock && (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            {yieldPct != null && (
              <div
                className="flex-1 min-w-[100px] rounded-xl px-3 py-2.5 text-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}
              >
                <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--muted)" }}>
                  Yield
                </p>
                <p className="text-lg font-semibold tabular-nums" style={{ color: "var(--accent)" }}>
                  {yieldPct.toFixed(2)}%
                </p>
              </div>
            )}
            {payoutRatio != null && (
              <div
                className="flex-1 min-w-[100px] rounded-xl px-3 py-2.5 text-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}
              >
                <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--muted)" }}>
                  Payout Ratio
                </p>
                <p className="text-lg font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>
                  {payoutRatio.toFixed(1)}%
                </p>
              </div>
            )}
            {sustainabilityScore != null && (
              <div
                className="flex-1 min-w-[100px] rounded-xl px-3 py-2.5 text-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}
              >
                <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--muted)" }}>
                  Sustainability
                </p>
                <div className="mt-1 flex justify-center">
                  <SustainabilityBadge score={sustainabilityScore} />
                </div>
              </div>
            )}
          </div>

          {/* Dividend History */}
          <p
            className="mb-2 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--accent)" }}
          >
            Dividend History
          </p>
          <div
            className="overflow-x-auto rounded-xl"
            style={{ border: "1px solid var(--card-border)" }}
          >
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--muted)" }}>Date</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: "var(--muted)" }}>Amount</th>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--muted)" }}>Type</th>
                </tr>
              </thead>
              <tbody>
                {visibleHistory.map((item, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: i < visibleHistory.length - 1 ? "1px solid var(--card-border)" : undefined,
                      background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                    }}
                  >
                    <td className="px-3 py-2" style={{ color: "var(--foreground)" }}>{item.date}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium" style={{ color: "var(--accent)" }}>
                      ₹{item.amount}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                        style={{ background: "rgba(201,169,110,0.06)", color: "var(--accent)" }}
                      >
                        {item.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {history.length > INITIAL_ROWS && (
            <button
              onClick={() => setShowAllHistory((v) => !v)}
              className="mt-2 text-xs underline-offset-2 hover:underline"
              style={{ color: "var(--muted)" }}
            >
              {showAllHistory ? "Show less ↑" : `Show ${history.length - INITIAL_ROWS} more ↓`}
            </button>
          )}
        </>
      )}

      {/* Top Yielders (no single stock) */}
      {!isSingleStock && topYielders.length > 0 && (
        <div>
          <p
            className="mb-2 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--accent)" }}
          >
            Top Dividend Yielders
          </p>
          <div
            className="overflow-x-auto rounded-xl"
            style={{ border: "1px solid var(--card-border)" }}
          >
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--muted)" }}>Symbol</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: "var(--muted)" }}>Yield %</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: "var(--muted)" }}>Payout %</th>
                  <th className="px-3 py-2 text-center font-medium" style={{ color: "var(--muted)" }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {visibleYielders.map((item, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: i < visibleYielders.length - 1 ? "1px solid var(--card-border)" : undefined,
                      background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                    }}
                  >
                    <td className="px-3 py-2 font-medium" style={{ color: "var(--accent)" }}>{item.symbol}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: "var(--foreground)" }}>
                      {item.yield_pct.toFixed(2)}%
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: "var(--foreground)" }}>
                      {item.payout_ratio.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-center">
                      <SustainabilityBadge score={item.sustainability_score} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {topYielders.length > INITIAL_ROWS && (
            <button
              onClick={() => setShowAllYielders((v) => !v)}
              className="mt-2 text-xs underline-offset-2 hover:underline"
              style={{ color: "var(--muted)" }}
            >
              {showAllYielders ? "Show less ↑" : `Show ${topYielders.length - INITIAL_ROWS} more ↓`}
            </button>
          )}
        </div>
      )}

      {!isSingleStock && !topYielders.length && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No dividend data available.
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
      <CardActions cardType="dividends" cardData={data} />
    </CardWrapper>
  );
}
