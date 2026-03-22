"use client";
import { useState } from "react";
import MarkdownRich from "./MarkdownRich";
import CardWrapper from "./ui/CardWrapper";
import { motion } from "framer-motion";
import Disclaimer from "./ui/Disclaimer";
import CardActions from "./ui/CardActions";

interface ScanResult {
  symbol: string;
  ltp: number;
  change_pct: number;
  trigger: string;
  volume_ratio?: number;
  high_52w?: number;
  low_52w?: number;
  pct_from_high?: number;
  pct_from_low?: number;
  sparkline?: number[];
}

interface Props {
  data: Record<string, unknown>;
}

const SCAN_LABELS: Record<string, string> = {
  volume_pump: "Volume Pump",
  breakout: "Breakouts",
  "52w_high": "52W High",
  "52w_low": "52W Low",
  gap_up: "Gap Up",
  gap_down: "Gap Down",
  momentum: "Momentum",
  sector_movers: "Sector Movers",
  fii_dii: "FII / DII",
};

const SCAN_ICONS: Record<string, string> = {
  volume_pump: "📊",
  breakout: "🚀",
  "52w_high": "🔝",
  "52w_low": "📉",
  gap_up: "⬆",
  gap_down: "⬇",
  momentum: "💨",
};

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
      <span className="text-[10px] tabular-nums font-medium" style={{ color }}>
        {ratio.toFixed(1)}x
      </span>
    </div>
  );
}

const INITIAL_ROWS = 5;

export default function ScanCard({ data }: Props) {
  const [showAll, setShowAll] = useState(false);

  const scanType = data.scan_type as string;
  const results = (data.results as ScanResult[]) || [];
  const count = data.count as number;
  const label = SCAN_LABELS[scanType] || scanType?.replace(/_/g, " ");
  const icon = SCAN_ICONS[scanType] || "📊";
  const visible = showAll ? results : results.slice(0, INITIAL_ROWS);
  const hasMore = results.length > INITIAL_ROWS;
  const hasSparkline = results.some((r) => r.sparkline && r.sparkline.length >= 2);
  const hasVolume = results.some((r) => r.volume_ratio != null);

  if (!results.length) {
    return (
      <CardWrapper icon="🔍" title="Market Scan">
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No results for {label} scan. Markets may be closed.
        </p>
      </CardWrapper>
    );
  }

  return (
    <CardWrapper icon="🔍" title="Market Scan">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          {label}
        </span>
        <div
          className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ background: "rgba(201,169,110,0.1)", color: "var(--accent)" }}
        >
          {count} result{count !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Mobile card-stack view */}
      <div className="md:hidden space-y-2">
        {visible.map((r, i) => {
          const isPositive = r.change_pct >= 0;
          const chgColor = isPositive ? "var(--positive)" : "var(--negative)";
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 25 }}
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

      {/* Desktop table view */}
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
                <tr key={i} className="hover:opacity-80 transition-opacity">
                  <td className="py-2 font-medium" style={{ color: "var(--foreground)" }}>{r.symbol}</td>
                  {hasSparkline && (
                    <td className="py-2 text-center">
                      {r.sparkline && r.sparkline.length >= 2 ? (
                        <Sparkline data={r.sparkline} color={chgColor} />
                      ) : <span style={{ color: "var(--muted)" }}>—</span>}
                    </td>
                  )}
                  <td className="py-2 text-right tabular-nums" style={{ color: "var(--foreground)" }}>
                    {r.ltp?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 text-xs underline-offset-2 hover:underline min-h-[44px] flex items-center"
          style={{ color: "var(--muted)" }}
        >
          {showAll ? "Show less ↑" : `View all ${results.length} results ↓`}
        </button>
      )}

      {/* Stocky's Scan Read */}
      {(data.ai_analysis as string) && (
        <div
          className="rounded-xl border-l-2 px-4 py-3 mt-3"
          style={{
            borderColor: "var(--accent)",
            background: "linear-gradient(135deg, rgba(201,169,110,0.04) 0%, var(--surface) 100%)",
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--accent)" }}>
            Stocky&apos;s Scan Read
          </p>
          <div className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
            <MarkdownRich text={data.ai_analysis as string} />
          </div>
        </div>
      )}
      <CardActions cardType="scan" cardData={data} />
      <Disclaimer />
    </CardWrapper>
  );
}
