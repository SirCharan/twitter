import type { OverviewData } from "@/lib/types";

function fmt(v: number) {
  return v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function OverviewCard({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as OverviewData;

  const ad = d.advances_declines;
  const adTotal = ad ? ad.advances + ad.declines + ad.unchanged : 0;
  const advPct = adTotal > 0 ? (ad!.advances / adTotal) * 100 : 0;
  const decPct = adTotal > 0 ? (ad!.declines / adTotal) * 100 : 0;
  const sentiment =
    !ad ? null
    : advPct > 55 ? { label: "Bullish", color: "var(--positive)", bg: "rgba(34,197,94,0.1)" }
    : decPct > 55 ? { label: "Bearish", color: "var(--negative)", bg: "rgba(239,68,68,0.1)" }
    : { label: "Neutral", color: "var(--muted)", bg: "rgba(107,107,107,0.12)" };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
          Market Overview
        </p>
        {sentiment && (
          <span
            className="rounded-md px-2 py-0.5 text-[11px] font-medium"
            style={{ background: sentiment.bg, color: sentiment.color }}
          >
            {sentiment.label}
          </span>
        )}
      </div>

      {/* Indices grid */}
      {d.indices && d.indices.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {d.indices.map((idx, i) => {
            const isPos = idx.change >= 0;
            const color = isPos ? "var(--positive)" : "var(--negative)";
            return (
              <div
                key={i}
                className="rounded-xl border p-3"
                style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
              >
                <p className="text-[11px] uppercase tracking-wide mb-1" style={{ color: "var(--muted)" }}>
                  {idx.name}
                </p>
                <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  {fmt(idx.value)}
                </p>
                <p className="text-xs font-medium mt-0.5" style={{ color }}>
                  {isPos ? "+" : ""}{fmt(idx.change)} ({isPos ? "+" : ""}{idx.pct_change.toFixed(2)}%)
                </p>
                {(idx.open || idx.high || idx.low) && (
                  <div className="mt-1.5 flex gap-2 text-[10px]" style={{ color: "var(--muted)" }}>
                    {idx.open ? <span>O: {fmt(idx.open)}</span> : null}
                    {idx.high ? <span style={{ color: "var(--positive)" }}>H: {fmt(idx.high)}</span> : null}
                    {idx.low  ? <span style={{ color: "var(--negative)" }}>L: {fmt(idx.low)}</span>  : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Breadth */}
      {ad && (
        <div
          className="rounded-xl border px-3 py-2.5"
          style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
        >
          <p className="text-[11px] uppercase tracking-wide mb-2" style={{ color: "var(--muted)" }}>
            Market Breadth
          </p>
          <div className="flex h-2 overflow-hidden rounded-full">
            <div style={{ width: `${advPct}%`, background: "var(--positive)" }} className="h-full" />
            <div style={{ width: `${100 - advPct - decPct}%`, background: "var(--muted)", opacity: 0.3 }} className="h-full" />
            <div style={{ width: `${decPct}%`, background: "var(--negative)" }} className="h-full" />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px]">
            <span style={{ color: "var(--positive)" }}>▲ {ad.advances} Up</span>
            <span style={{ color: "var(--muted)" }}>{ad.unchanged} Flat</span>
            <span style={{ color: "var(--negative)" }}>▼ {ad.declines} Down</span>
          </div>
        </div>
      )}

      {/* Gainers & Losers */}
      {(d.gainers?.length > 0 || d.losers?.length > 0) && (
        <div className="grid grid-cols-2 gap-2">
          {d.gainers && d.gainers.length > 0 && (
            <div
              className="rounded-xl border p-3"
              style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--positive)" }}>
                Top Gainers
              </p>
              <div className="space-y-1.5">
                {d.gainers.slice(0, 5).map((g, i) => (
                  <div key={i} className="flex items-center justify-between gap-1">
                    <span className="truncate text-[11px] font-medium" style={{ color: "var(--foreground)" }}>
                      {g.symbol}
                    </span>
                    <div className="text-right shrink-0">
                      <span className="block text-[11px] font-semibold" style={{ color: "var(--positive)" }}>
                        +{g.pct_change.toFixed(2)}%
                      </span>
                      {g.ltp > 0 && (
                        <span className="block text-[10px]" style={{ color: "var(--muted)" }}>
                          ₹{fmt(g.ltp)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {d.losers && d.losers.length > 0 && (
            <div
              className="rounded-xl border p-3"
              style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--negative)" }}>
                Top Losers
              </p>
              <div className="space-y-1.5">
                {d.losers.slice(0, 5).map((l, i) => (
                  <div key={i} className="flex items-center justify-between gap-1">
                    <span className="truncate text-[11px] font-medium" style={{ color: "var(--foreground)" }}>
                      {l.symbol}
                    </span>
                    <div className="text-right shrink-0">
                      <span className="block text-[11px] font-semibold" style={{ color: "var(--negative)" }}>
                        {l.pct_change.toFixed(2)}%
                      </span>
                      {l.ltp > 0 && (
                        <span className="block text-[10px]" style={{ color: "var(--muted)" }}>
                          ₹{fmt(l.ltp)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Market summary */}
      {(d.summary || (d.gainers?.length > 0) || (d.losers?.length > 0)) && (
        <div className="mt-1 rounded-lg border-l-2 px-3 py-2"
          style={{ borderColor: "var(--accent)", background: "var(--surface)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
            Stocky's Summary
          </p>
          {d.summary && (
            <p className="mt-1 text-sm leading-snug" style={{ color: "var(--foreground)" }}>
              {d.summary}
            </p>
          )}
          {d.gainers?.[0] && (
            <p className="mt-1 text-sm leading-snug" style={{ color: "var(--foreground)" }}>
              Top gainer: {d.gainers[0].symbol} +{d.gainers[0].pct_change.toFixed(1)}%
              {d.gainers[1] ? `, followed by ${d.gainers[1].symbol} +${d.gainers[1].pct_change.toFixed(1)}%` : ""}.
            </p>
          )}
          {d.losers?.[0] && (
            <p className="mt-0.5 text-sm leading-snug" style={{ color: "var(--foreground)" }}>
              Biggest drag: {d.losers[0].symbol} {d.losers[0].pct_change.toFixed(1)}%
              {d.losers[1] ? `, ${d.losers[1].symbol} ${d.losers[1].pct_change.toFixed(1)}%` : ""}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
