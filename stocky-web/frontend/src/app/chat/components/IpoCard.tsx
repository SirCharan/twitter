"use client";

interface IpoItem {
  company: string;
  symbol: string;
  issue_price?: number | string;
  current_price?: number;
  listing_date?: string;
  open_date?: string;
  close_date?: string;
  current_gain?: number;
  status: string;
}

interface Props {
  data: Record<string, unknown>;
}

export default function IpoCard({ data }: Props) {
  const upcoming = (data.upcoming as IpoItem[]) || [];
  const listed = (data.listed as IpoItem[]) || [];
  const source = data.source as string;

  return (
    <div
      className="rounded-2xl border px-5 py-4"
      style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <span style={{ fontSize: 15 }}>🚀</span>
        <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          IPO Tracker
        </span>
        {source === "fallback" && (
          <span className="ml-auto text-[10px]" style={{ color: "var(--muted)" }}>
            (cached data)
          </span>
        )}
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
            Upcoming / Open
          </p>
          <div className="space-y-2">
            {upcoming.map((ipo, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl px-3 py-2"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}
              >
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--foreground)" }}>{ipo.company}</p>
                  <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                    {ipo.open_date && `Opens: ${ipo.open_date}`}
                    {ipo.close_date && ` · Closes: ${ipo.close_date}`}
                  </p>
                </div>
                {ipo.issue_price && (
                  <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>
                    ₹{ipo.issue_price}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Listed */}
      {listed.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
            Recent Listings
          </p>
          <div className="space-y-2">
            {listed.map((ipo, i) => {
              const gain = ipo.current_gain;
              const isPositive = gain != null && gain >= 0;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl px-3 py-2"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}
                >
                  <div>
                    <p className="text-xs font-medium" style={{ color: "var(--foreground)" }}>{ipo.company}</p>
                    <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                      {ipo.listing_date && `Listed: ${ipo.listing_date}`}
                      {ipo.issue_price && ` · Issue: ₹${ipo.issue_price}`}
                    </p>
                  </div>
                  <div className="text-right">
                    {ipo.current_price && (
                      <p className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                        ₹{ipo.current_price.toFixed(2)}
                      </p>
                    )}
                    {gain != null && (
                      <p
                        className="text-[10px] font-medium"
                        style={{ color: isPositive ? "var(--positive)" : "var(--negative)" }}
                      >
                        {isPositive ? "+" : ""}{gain.toFixed(2)}%
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!upcoming.length && !listed.length && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No IPO data available.
        </p>
      )}
    </div>
  );
}
