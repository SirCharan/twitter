"use client";
import { useState } from "react";

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
      <div
        className="rounded-2xl border px-3 py-3 sm:px-5 sm:py-4"
        style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
      >
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No results for {label} scan. Markets may be closed.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border px-3 py-3 sm:px-5 sm:py-4"
      style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
    >
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

      {/* Results table */}
      <div className="overflow-x-auto">
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
                  <td className="py-2 font-medium" style={{ color: "var(--foreground)" }}>
                    {r.symbol}
                  </td>
                  {hasSparkline && (
                    <td className="py-2 text-center">
                      {r.sparkline && r.sparkline.length >= 2 ? (
                        <Sparkline data={r.sparkline} color={chgColor} />
                      ) : (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      )}
                    </td>
                  )}
                  <td className="py-2 text-right tabular-nums" style={{ color: "var(--foreground)" }}>
                    {r.ltp?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </td>
                  <td
                    className="py-2 text-right tabular-nums font-medium"
                    style={{ color: chgColor }}
                  >
                    {isPositive ? "+" : ""}{r.change_pct?.toFixed(2)}%
                  </td>
                  {hasVolume && (
                    <td className="py-2 text-right">
                      {r.volume_ratio != null ? (
                        <VolumeBar ratio={r.volume_ratio} />
                      ) : (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      )}
                    </td>
                  )}
                  <td className="py-2 pl-4" style={{ color: "var(--muted)" }}>
                    {r.trigger}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 text-xs underline-offset-2 hover:underline"
          style={{ color: "var(--muted)" }}
        >
          {showAll ? "Show less ↑" : `View all ${results.length} results ↓`}
        </button>
      )}
    </div>
  );
}
