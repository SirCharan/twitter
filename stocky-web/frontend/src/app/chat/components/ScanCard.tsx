"use client";

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
}

interface Props {
  data: Record<string, unknown>;
}

const SCAN_LABELS: Record<string, string> = {
  volume_pump: "Volume Pump",
  breakout: "Breakouts",
  "52w_high": "52W High",
  "52w_low": "52W Low",
  sector_movers: "Sector Movers",
  fii_dii: "FII / DII",
};

export default function ScanCard({ data }: Props) {
  const scanType = data.scan_type as string;
  const results = (data.results as ScanResult[]) || [];
  const count = data.count as number;

  const label = SCAN_LABELS[scanType] || scanType?.replace(/_/g, " ");

  if (!results.length) {
    return (
      <div
        className="rounded-2xl border px-5 py-4"
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
      className="rounded-2xl border px-5 py-4"
      style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <span style={{ fontSize: 15 }}>📊</span>
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
              <th className="pb-2 text-right font-medium">LTP</th>
              <th className="pb-2 text-right font-medium">Chg%</th>
              <th className="pb-2 text-left font-medium pl-4">Signal</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {results.map((r, i) => {
              const isPositive = r.change_pct >= 0;
              return (
                <tr key={i} className="hover:opacity-80 transition-opacity">
                  <td className="py-2 font-medium" style={{ color: "var(--foreground)" }}>
                    {r.symbol}
                  </td>
                  <td className="py-2 text-right tabular-nums" style={{ color: "var(--foreground)" }}>
                    {r.ltp?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </td>
                  <td
                    className="py-2 text-right tabular-nums font-medium"
                    style={{ color: isPositive ? "var(--positive)" : "var(--negative)" }}
                  >
                    {isPositive ? "+" : ""}{r.change_pct?.toFixed(2)}%
                  </td>
                  <td className="py-2 pl-4" style={{ color: "var(--muted)" }}>
                    {r.trigger}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
