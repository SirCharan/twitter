"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import MarkdownRich from "./MarkdownRich";
import CardWrapper from "./ui/CardWrapper";
import Disclaimer from "./ui/Disclaimer";
import CardActions from "./ui/CardActions";

interface StockRow {
  symbol: string;
  ltp: number;
  change_pct: number;
  trigger: string;
  volume_ratio?: number;
  sparkline?: number[];
  high_52w?: number;
  low_52w?: number;
  pct_from_high?: number;
  pct_from_low?: number;
}

interface Props {
  data: Record<string, unknown>;
}

const TABS = [
  { id: "gainers",       label: "Top Gainers",   icon: "🟢" },
  { id: "losers",        label: "Top Losers",    icon: "🔴" },
  { id: "volume_pump",   label: "Volume Pump",   icon: "📊" },
  { id: "breakout",      label: "Breakouts",     icon: "🚀" },
  { id: "52w_high",      label: "52W High",      icon: "🔝" },
  { id: "52w_low",       label: "52W Low",       icon: "📉" },
  { id: "sector_movers", label: "Sector Movers", icon: "🏭" },
] as const;

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 48;
  const h = 18;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function VolumeBar({ ratio }: { ratio: number }) {
  const color = ratio >= 3 ? "var(--positive)" : ratio >= 2 ? "var(--accent)" : "var(--muted)";
  const pct = Math.min(100, (ratio / 5) * 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 w-12 rounded-full" style={{ background: "var(--card-border)" }}>
        <div className="h-1 rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] tabular-nums font-medium" style={{ color }}>{ratio.toFixed(1)}x</span>
    </div>
  );
}

const INITIAL_ROWS = 5;

export default function TopStocksCard({ data }: Props) {
  const tabs = (data.tabs as Record<string, StockRow[]>) || {};
  const defaultTab = (data.default_tab as string) || "gainers";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showAll, setShowAll] = useState(false);

  const rows = tabs[activeTab] || [];
  const visible = showAll ? rows : rows.slice(0, INITIAL_ROWS);
  const hasMore = rows.length > INITIAL_ROWS;
  const hasSparkline = rows.some((r) => r.sparkline && r.sparkline.length >= 2);
  const hasVolume = activeTab === "volume_pump" && rows.some((r) => r.volume_ratio != null);

  const tabCounts = (data.tab_counts as Record<string, number>) || {};

  return (
    <CardWrapper icon="🏆" title="Top Stocks">
      {/* Tab chips */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none mb-4 -mx-1 px-1 pb-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = tabCounts[tab.id] || 0;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setShowAll(false); }}
              className="flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors shrink-0"
              style={{
                borderColor: isActive ? "var(--accent)" : "var(--card-border)",
                background: isActive ? "rgba(201,169,110,0.1)" : "transparent",
                color: isActive ? "var(--accent)" : "var(--muted)",
              }}
            >
              <span style={{ fontSize: 11 }}>{tab.icon}</span>
              {tab.label}
              {count > 0 && (
                <span
                  className="rounded-full px-1.5 text-[9px] font-semibold"
                  style={{
                    background: isActive ? "rgba(201,169,110,0.15)" : "rgba(255,255,255,0.05)",
                    color: isActive ? "var(--accent)" : "var(--muted)",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {rows.length === 0 && (
        <p className="text-sm py-4" style={{ color: "var(--muted)" }}>
          No results for this category. Markets may be closed.
        </p>
      )}

      {/* Mobile card-stack */}
      {rows.length > 0 && (
        <div className="md:hidden space-y-2">
          {visible.map((r, i) => {
            const isPositive = r.change_pct >= 0;
            const chgColor = isPositive ? "var(--positive)" : "var(--negative)";
            return (
              <motion.div
                key={`${activeTab}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, type: "spring", stiffness: 300, damping: 25 }}
                className="flex items-center justify-between rounded-xl border px-3 py-3"
                style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
              >
                <div className="flex items-center gap-3">
                  {r.sparkline && r.sparkline.length >= 2 && (
                    <Sparkline data={r.sparkline} color={chgColor} />
                  )}
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                      {r.symbol}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--muted)" }}>{r.trigger}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>
                    ₹{r.ltp?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs font-medium tabular-nums" style={{ color: chgColor }}>
                    {isPositive ? "+" : ""}{r.change_pct?.toFixed(2)}%
                  </p>
                  {r.volume_ratio != null && <VolumeBar ratio={r.volume_ratio} />}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Desktop table */}
      {rows.length > 0 && (
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: "var(--muted)" }}>
                <th className="pb-2 text-left font-medium">Symbol</th>
                {hasSparkline && <th className="pb-2 text-center font-medium">5D</th>}
                <th className="pb-2 text-right font-medium">LTP</th>
                <th className="pb-2 text-right font-medium">Chg%</th>
                {hasVolume && <th className="pb-2 text-right font-medium">Vol</th>}
                <th className="pb-2 text-left font-medium pl-4">Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
              {visible.map((r, i) => {
                const isPositive = r.change_pct >= 0;
                const chgColor = isPositive ? "var(--positive)" : "var(--negative)";
                return (
                  <motion.tr
                    key={`${activeTab}-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:opacity-80 transition-opacity"
                  >
                    <td className="py-2 font-medium" style={{ color: "var(--foreground)" }}>{r.symbol}</td>
                    {hasSparkline && (
                      <td className="py-2 text-center">
                        {r.sparkline && r.sparkline.length >= 2 ? (
                          <Sparkline data={r.sparkline} color={chgColor} />
                        ) : <span style={{ color: "var(--muted)" }}>—</span>}
                      </td>
                    )}
                    <td className="py-2 text-right tabular-nums" style={{ color: "var(--foreground)" }}>
                      ₹{r.ltp?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 text-right tabular-nums font-medium" style={{ color: chgColor }}>
                      {isPositive ? "+" : ""}{r.change_pct?.toFixed(2)}%
                    </td>
                    {hasVolume && (
                      <td className="py-2 text-right">
                        {r.volume_ratio != null ? <VolumeBar ratio={r.volume_ratio} /> : <span style={{ color: "var(--muted)" }}>—</span>}
                      </td>
                    )}
                    <td className="py-2 pl-4" style={{ color: "var(--muted)" }}>{r.trigger}</td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 text-xs underline-offset-2 hover:underline min-h-[44px] flex items-center"
          style={{ color: "var(--muted)" }}
        >
          {showAll ? "Show less ↑" : `View all ${rows.length} results ↓`}
        </button>
      )}

      {/* AI Analysis */}
      {(data.ai_analysis as string) && (
        <div
          className="rounded-xl border-l-2 px-4 py-3 mt-3"
          style={{
            borderColor: "var(--accent)",
            background: "linear-gradient(135deg, rgba(201,169,110,0.04) 0%, var(--surface) 100%)",
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--accent)" }}>
            Stocky&apos;s Market Pulse
          </p>
          <div className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
            <MarkdownRich text={data.ai_analysis as string} />
          </div>
        </div>
      )}

      <CardActions cardType="top_stocks" cardData={data} />
      <Disclaimer />
    </CardWrapper>
  );
}
