"use client";
import { useState } from "react";
import { Calendar } from "lucide-react";
import MarkdownRich from "./MarkdownRich";
import CardWrapper from "./ui/CardWrapper";
import Disclaimer from "./ui/Disclaimer";
import CardActions from "./ui/CardActions";

interface UpcomingEarning {
  symbol: string;
  company: string;
  date: string;
  estimate_eps: number | null;
}

interface EpsSurprise {
  symbol: string;
  quarter: string;
  estimated_eps: number;
  actual_eps: number;
  surprise_pct: number;
}

interface Props {
  data: Record<string, unknown>;
}

const INITIAL_ROWS = 5;

export default function EarningsCard({ data }: Props) {
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [showAllSurprises, setShowAllSurprises] = useState(false);

  const upcoming = (data.upcoming as UpcomingEarning[]) || [];
  const surprises = (data.surprises as EpsSurprise[]) || [];

  const visibleUpcoming = showAllUpcoming ? upcoming : upcoming.slice(0, INITIAL_ROWS);
  const visibleSurprises = showAllSurprises ? surprises : surprises.slice(0, INITIAL_ROWS);

  return (
    <CardWrapper
      icon={<Calendar size={16} style={{ color: "var(--accent)" }} />}
      title="Earnings Calendar"
      badge={
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ background: "rgba(201,169,110,0.1)", color: "var(--accent)" }}
        >
          {upcoming.length + surprises.length} items
        </span>
      }
    >
      {/* Upcoming Earnings */}
      {upcoming.length > 0 && (
        <div className="mb-4">
          <p
            className="mb-2 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--accent)" }}
          >
            Upcoming Earnings
          </p>
          <div
            className="overflow-x-auto rounded-xl"
            style={{ border: "1px solid var(--card-border)" }}
          >
            <table className="w-full text-xs">
              <thead>
                <tr
                  style={{ borderBottom: "1px solid var(--card-border)" }}
                >
                  <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--muted)" }}>Symbol</th>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--muted)" }}>Company</th>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--muted)" }}>Date</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: "var(--muted)" }}>Est. EPS</th>
                </tr>
              </thead>
              <tbody>
                {visibleUpcoming.map((item, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: i < visibleUpcoming.length - 1 ? "1px solid var(--card-border)" : undefined,
                      background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                    }}
                  >
                    <td className="px-3 py-2 font-medium" style={{ color: "var(--accent)" }}>{item.symbol}</td>
                    <td className="px-3 py-2" style={{ color: "var(--foreground)" }}>{item.company}</td>
                    <td className="px-3 py-2" style={{ color: "var(--muted)" }}>{item.date}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: "var(--foreground)" }}>
                      {item.estimate_eps != null ? `₹${item.estimate_eps}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {upcoming.length > INITIAL_ROWS && (
            <button
              onClick={() => setShowAllUpcoming((v) => !v)}
              className="mt-2 text-xs underline-offset-2 hover:underline"
              style={{ color: "var(--muted)" }}
            >
              {showAllUpcoming ? "Show less ↑" : `Show ${upcoming.length - INITIAL_ROWS} more ↓`}
            </button>
          )}
        </div>
      )}

      {/* EPS Surprise History */}
      {surprises.length > 0 && (
        <div className="mb-1">
          <p
            className="mb-2 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--muted)" }}
          >
            EPS Surprise History
          </p>
          <div
            className="overflow-x-auto rounded-xl"
            style={{ border: "1px solid var(--card-border)" }}
          >
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--muted)" }}>Symbol</th>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--muted)" }}>Quarter</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: "var(--muted)" }}>Est.</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: "var(--muted)" }}>Actual</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: "var(--muted)" }}>Surprise</th>
                </tr>
              </thead>
              <tbody>
                {visibleSurprises.map((item, i) => {
                  const isPositive = item.surprise_pct >= 0;
                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom: i < visibleSurprises.length - 1 ? "1px solid var(--card-border)" : undefined,
                        background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                      }}
                    >
                      <td className="px-3 py-2 font-medium" style={{ color: "var(--accent)" }}>{item.symbol}</td>
                      <td className="px-3 py-2" style={{ color: "var(--foreground)" }}>{item.quarter}</td>
                      <td className="px-3 py-2 text-right tabular-nums" style={{ color: "var(--muted)" }}>
                        ₹{item.estimated_eps}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums" style={{ color: "var(--foreground)" }}>
                        ₹{item.actual_eps}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums"
                          style={{
                            background: isPositive ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                            color: isPositive ? "var(--positive)" : "var(--negative)",
                          }}
                        >
                          {isPositive ? "+" : ""}{item.surprise_pct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {surprises.length > INITIAL_ROWS && (
            <button
              onClick={() => setShowAllSurprises((v) => !v)}
              className="mt-2 text-xs underline-offset-2 hover:underline"
              style={{ color: "var(--muted)" }}
            >
              {showAllSurprises ? "Show less ↑" : `Show ${surprises.length - INITIAL_ROWS} more ↓`}
            </button>
          )}
        </div>
      )}

      {!upcoming.length && !surprises.length && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No earnings data available.
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
      <CardActions cardType="earnings" cardData={data} />
    </CardWrapper>
  );
}
