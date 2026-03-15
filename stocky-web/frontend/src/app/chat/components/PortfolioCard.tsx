import type { PortfolioData } from "@/lib/types";

function formatINR(v: number) {
  return "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function PnlText({ value, showSign = true }: { value: number; showSign?: boolean }) {
  const color = value >= 0 ? "var(--positive)" : "var(--negative)";
  const sign = showSign && value >= 0 ? "+" : "";
  return (
    <span style={{ color }}>
      {sign}{formatINR(value)}
    </span>
  );
}

function PctBadge({ value }: { value: number }) {
  const color = value >= 0 ? "var(--positive)" : "var(--negative)";
  const bg = value >= 0 ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)";
  return (
    <span
      className="bounce-in inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium"
      style={{ color, background: bg }}
    >
      {value >= 0 ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

function getUnderlying(symbol: string): string {
  const m = symbol.match(/^(.+?)(\d{2}[A-Z]{3})/);
  return m ? m[1] : symbol;
}

function getContractLabel(symbol: string): string {
  const m = symbol.match(/^.+?(\d{2}[A-Z]{3})(\d+)(CE|PE|FUT)$/);
  if (!m) return symbol;
  return `${m[1]} ${m[2]} ${m[3]}`;
}

type Position = PortfolioData["trading"]["positions"][number];

function groupByUnderlying(positions: Position[]) {
  const groups: Record<string, Position[]> = {};
  for (const p of positions) {
    const key = getUnderlying(p.symbol);
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

export default function PortfolioCard({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as PortfolioData;
  const inv = d.investments;
  const trd = d.trading;

  return (
    <div className="space-y-4">
      {/* ── Overall Day P&L ── */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
          Portfolio
        </p>
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
          Day P&L: <span className="font-medium"><PnlText value={d.day_pnl} /></span>
        </div>
      </div>

      {/* ── Investments Section ── */}
      <div
        className="rounded-xl border p-4"
        style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-md text-xs"
            style={{ background: "rgba(201,169,110,0.12)", color: "var(--accent)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Investments
          </span>
          <span className="text-[11px]" style={{ color: "var(--muted)" }}>
            {inv.count} holding{inv.count !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Value cards */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded-lg p-2.5" style={{ background: "var(--card-bg)" }}>
            <p className="text-[11px] mb-0.5" style={{ color: "var(--muted)" }}>Invested</p>
            <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              {formatINR(inv.invested)}
            </p>
          </div>
          <div className="rounded-lg p-2.5" style={{ background: "var(--card-bg)" }}>
            <p className="text-[11px] mb-0.5" style={{ color: "var(--muted)" }}>Current</p>
            <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              {formatINR(inv.current)}
            </p>
          </div>
        </div>

        {/* Return */}
        <div
          className="flex items-center justify-between rounded-lg px-3 py-2"
          style={{ background: "var(--card-bg)" }}
        >
          <span className="text-xs" style={{ color: "var(--muted)" }}>Total Return</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium"><PnlText value={inv.pnl} /></span>
            <PctBadge value={inv.pct} />
          </div>
        </div>

        {/* Top holdings */}
        {inv.top_holdings.length > 0 && (
          <>
            <div className="divider-gradient my-3" />
            <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
              Top Holdings
            </p>
            <div className="space-y-1.5">
              {inv.top_holdings.map((h, i) => (
                <div key={h.symbol} className="slide-up stagger flex items-center justify-between text-xs" style={{ ["--i" as string]: i }}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium" style={{ color: "var(--foreground)" }}>{h.symbol}</span>
                    <span style={{ color: "var(--muted)" }}>{h.qty} qty</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PnlText value={h.pnl} />
                    <PctBadge value={h.pct} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Trading Section ── */}
      <div
        className="rounded-xl border p-4"
        style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-md text-xs"
            style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Trading
          </span>
          <span className="text-[11px]" style={{ color: "var(--muted)" }}>
            {trd.open_count} open · {trd.closed_count} closed
          </span>
        </div>

        {/* Day P&L + Realised */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded-lg p-2.5" style={{ background: "var(--card-bg)" }}>
            <p className="text-[11px] mb-0.5" style={{ color: "var(--muted)" }}>Day P&L</p>
            <p className="text-sm font-semibold"><PnlText value={trd.day_pnl} /></p>
          </div>
          <div className="rounded-lg p-2.5" style={{ background: "var(--card-bg)" }}>
            <p className="text-[11px] mb-0.5" style={{ color: "var(--muted)" }}>Realised</p>
            <p className="text-sm font-semibold"><PnlText value={trd.realised} /></p>
          </div>
        </div>

        {/* Open positions grouped by underlying */}
        {trd.positions.length > 0 ? (
          <>
            <div className="divider-gradient my-3" />
            <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
              Positions
            </p>
            <div className="space-y-3">
              {groupByUnderlying(trd.positions).map(([underlying, positions]) => {
                const groupPnl = positions.reduce((s, p) => s + p.pnl, 0);
                return (
                  <div
                    key={underlying}
                    className="rounded-lg border overflow-hidden"
                    style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}
                  >
                    {/* Group header */}
                    <div
                      className="flex items-center justify-between px-3 py-2"
                      style={{ borderBottom: "1px solid var(--card-border)" }}
                    >
                      <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                        {underlying}
                      </span>
                      <span className="text-xs font-medium">
                        <PnlText value={groupPnl} />
                      </span>
                    </div>

                    {/* Column headers */}
                    <div
                      className="grid px-3 py-1.5 text-[10px] uppercase tracking-wider"
                      style={{
                        gridTemplateColumns: "1fr auto auto auto auto",
                        color: "var(--muted)",
                        borderBottom: "1px solid var(--card-border)",
                      }}
                    >
                      <span>Contract</span>
                      <span className="text-right w-12">Qty</span>
                      <span className="text-right w-16">Avg</span>
                      <span className="text-right w-16">LTP</span>
                      <span className="text-right w-20">P&L</span>
                    </div>

                    {/* Position rows */}
                    {positions.map((p) => (
                      <div
                        key={`${p.symbol}-${p.product}`}
                        className="grid px-3 py-1.5 text-xs"
                        style={{
                          gridTemplateColumns: "1fr auto auto auto auto",
                          borderBottom: "1px solid var(--card-border)",
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span style={{ color: "var(--foreground)" }}>{getContractLabel(p.symbol)}</span>
                          <span
                            className="rounded px-1 py-0.5 text-[9px] font-medium"
                            style={{
                              background: p.product === "MIS" ? "rgba(99,102,241,0.1)" : "rgba(168,85,247,0.1)",
                              color: p.product === "MIS" ? "#818cf8" : "#a855f7",
                            }}
                          >
                            {p.product}
                          </span>
                        </div>
                        <span
                          className="text-right w-12"
                          style={{ color: p.qty > 0 ? "var(--positive)" : "var(--negative)" }}
                        >
                          {p.qty > 0 ? "+" : ""}{p.qty}
                        </span>
                        <span className="text-right w-16" style={{ color: "var(--muted)" }}>
                          {p.avg.toLocaleString("en-IN")}
                        </span>
                        <span className="text-right w-16" style={{ color: "var(--foreground)" }}>
                          {p.ltp.toLocaleString("en-IN")}
                        </span>
                        <span className="text-right w-20">
                          <PnlText value={p.pnl} />
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-xs text-center py-2" style={{ color: "var(--muted)" }}>
            No trading positions today
          </p>
        )}
      </div>
    </div>
  );
}
