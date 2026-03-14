"use client";

interface StockCompare {
  name: string;
  symbol: string;
  fundamental_score: number;
  technical_score: number;
  overall_score: number;
  pe?: number;
  roe?: number;
  debt_to_equity?: number;
  earnings_growth?: number;
  profit_margin?: number;
  market_cap?: number;
  rsi?: number;
  rsi_label?: string;
  macd_signal?: string;
  sma_signal?: string;
  price?: number;
}

interface Props {
  data: Record<string, unknown>;
}

function fmt(v: number | undefined, decimals = 1, suffix = ""): string {
  if (v == null) return "—";
  return `${v.toFixed(decimals)}${suffix}`;
}

function fmtCap(v: number | undefined): string {
  if (v == null) return "—";
  if (v >= 1e12) return `₹${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `₹${(v / 1e9).toFixed(0)}B`;
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(0)}Cr`;
  return `₹${v.toFixed(0)}`;
}

function ScoreBar({ score, max = 20 }: { score: number; max?: number }) {
  const pct = Math.min(100, (score / max) * 100);
  const color = score >= max * 0.7 ? "var(--positive)" : score >= max * 0.4 ? "var(--accent)" : "var(--negative)";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full" style={{ background: "var(--card-border)" }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] tabular-nums font-medium" style={{ color, minWidth: 28 }}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

type Row = { label: string; getValue: (s: StockCompare) => string; higher?: boolean };

const ROWS: Row[] = [
  { label: "Price", getValue: (s) => s.price ? `₹${s.price.toFixed(2)}` : "—" },
  { label: "P/E", getValue: (s) => fmt(s.pe, 1, "×") },
  { label: "ROE", getValue: (s) => fmt(s.roe, 1, "%"), higher: true },
  { label: "D/E", getValue: (s) => fmt(s.debt_to_equity, 2, "×") },
  { label: "EPS Growth", getValue: (s) => fmt(s.earnings_growth, 1, "%"), higher: true },
  { label: "Profit Margin", getValue: (s) => fmt(s.profit_margin, 1, "%"), higher: true },
  { label: "Market Cap", getValue: (s) => fmtCap(s.market_cap) },
  { label: "RSI", getValue: (s) => s.rsi ? `${s.rsi.toFixed(0)} (${s.rsi_label || ""})` : "—" },
  { label: "MACD", getValue: (s) => s.macd_signal || "—" },
  { label: "SMA", getValue: (s) => s.sma_signal || "—" },
];

export default function CompareCard({ data }: Props) {
  const stocks = (data.stocks as StockCompare[]) || [];
  if (!stocks.length) {
    return <p className="text-sm" style={{ color: "var(--muted)" }}>No comparison data.</p>;
  }

  return (
    <div
      className="rounded-2xl border px-3 py-3 sm:px-5 sm:py-4"
      style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <span style={{ fontSize: 15 }}>⚖</span>
        <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Stock Comparison
        </span>
      </div>

      {/* Scores + rows — horizontally scrollable on mobile */}
      <div className="overflow-x-auto">
      <div style={{ minWidth: Math.max(320, stocks.length * 140) }}>

      {/* Scores */}
      <div className="mb-4 grid gap-3" style={{ gridTemplateColumns: `repeat(${stocks.length}, 1fr)` }}>
        {stocks.map((s) => (
          <div key={s.symbol}>
            <p className="mb-0.5 text-xs font-medium" style={{ color: "var(--foreground)" }}>{s.symbol}</p>
            <p className="mb-2 text-[10px]" style={{ color: "var(--muted)" }}>{s.name}</p>
            <ScoreBar score={s.overall_score} max={20} />
            <p className="mt-1 text-[10px]" style={{ color: "var(--muted)" }}>
              F: {s.fundamental_score.toFixed(1)} · T: {s.technical_score.toFixed(1)}
            </p>
          </div>
        ))}
      </div>

      {/* Comparison rows */}
      <div className="space-y-0.5">
        {ROWS.map((row) => (
          <div
            key={row.label}
            className="grid items-center py-1.5"
            style={{
              gridTemplateColumns: `80px repeat(${stocks.length}, 1fr)`,
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <span className="text-[10px]" style={{ color: "var(--muted)" }}>{row.label}</span>
            {stocks.map((s) => (
              <span key={s.symbol} className="text-xs tabular-nums" style={{ color: "var(--foreground)" }}>
                {row.getValue(s)}
              </span>
            ))}
          </div>
        ))}
      </div>
      </div>{/* min-width wrapper */}
      </div>{/* overflow-x-auto */}
    </div>
  );
}
