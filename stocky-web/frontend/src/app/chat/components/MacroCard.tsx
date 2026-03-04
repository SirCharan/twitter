"use client";

interface PricePoint {
  price: number;
  change?: number;
  change_pct?: number;
}

interface Props {
  data: Record<string, unknown>;
}

function MacroTile({
  label,
  value,
  changePct,
  unit = "",
  icon,
}: {
  label: string;
  value: string | number | undefined;
  changePct?: number;
  unit?: string;
  icon?: string;
}) {
  if (value == null) return null;
  const isPositive = (changePct ?? 0) >= 0;

  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}
    >
      <p className="mb-0.5 text-[10px]" style={{ color: "var(--muted)" }}>
        {icon && <span className="mr-1">{icon}</span>}
        {label}
      </p>
      <p className="text-sm font-medium tabular-nums" style={{ color: "var(--foreground)" }}>
        {unit}{typeof value === "number" ? value.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : value}
      </p>
      {changePct != null && (
        <p
          className="mt-0.5 text-[10px] font-medium"
          style={{ color: isPositive ? "var(--positive)" : "var(--negative)" }}
        >
          {isPositive ? "+" : ""}{changePct.toFixed(2)}%
        </p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
        {title}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{children}</div>
    </div>
  );
}

export default function MacroCard({ data }: Props) {
  const forex = data.forex as Record<string, PricePoint | undefined>;
  const commodities = data.commodities as Record<string, PricePoint | undefined>;
  const indices = data.indices as Record<string, PricePoint | undefined>;
  const crypto = data.crypto as Record<string, PricePoint | undefined>;
  const rbi = data.rbi as { repo_rate: number; note: string } | undefined;

  return (
    <div
      className="rounded-2xl border px-3 py-3 sm:px-5 sm:py-4"
      style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <span style={{ fontSize: 15 }}>🌐</span>
        <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Macro Dashboard
        </span>
      </div>

      {/* RBI */}
      {rbi && (
        <Section title="RBI Policy">
          <MacroTile label="Repo Rate" value={`${rbi.repo_rate}%`} icon="🏦" />
        </Section>
      )}

      {/* Forex */}
      {forex && (
        <Section title="Forex">
          {forex.usd_inr && (
            <MacroTile label="USD/INR" value={forex.usd_inr.price} changePct={forex.usd_inr.change_pct} icon="💵" />
          )}
          {forex.eur_inr && (
            <MacroTile label="EUR/INR" value={forex.eur_inr.price} changePct={forex.eur_inr.change_pct} icon="💶" />
          )}
          {forex.gbp_inr && (
            <MacroTile label="GBP/INR" value={forex.gbp_inr.price} changePct={forex.gbp_inr.change_pct} icon="💷" />
          )}
        </Section>
      )}

      {/* Commodities */}
      {commodities && (
        <Section title="Commodities">
          {commodities.gold && (
            <MacroTile label="Gold (USD/oz)" value={commodities.gold.price} changePct={commodities.gold.change_pct} icon="🥇" unit="$" />
          )}
          {commodities.crude && (
            <MacroTile label="Crude (USD/bbl)" value={commodities.crude.price} changePct={commodities.crude.change_pct} icon="🛢" unit="$" />
          )}
          {commodities.silver && (
            <MacroTile label="Silver (USD/oz)" value={commodities.silver.price} changePct={commodities.silver.change_pct} icon="🥈" unit="$" />
          )}
        </Section>
      )}

      {/* Global Indices */}
      {indices && (
        <Section title="Global Indices">
          {indices.nifty && (
            <MacroTile label="Nifty 50" value={indices.nifty.price} changePct={indices.nifty.change_pct} />
          )}
          {indices.vix && (
            <MacroTile label="India VIX" value={indices.vix.price} changePct={indices.vix.change_pct} />
          )}
          {indices.dow && (
            <MacroTile label="Dow Jones" value={indices.dow.price} changePct={indices.dow.change_pct} />
          )}
          {indices.nasdaq && (
            <MacroTile label="Nasdaq" value={indices.nasdaq.price} changePct={indices.nasdaq.change_pct} />
          )}
          {indices.sp500 && (
            <MacroTile label="S&P 500" value={indices.sp500.price} changePct={indices.sp500.change_pct} />
          )}
        </Section>
      )}

      {/* Crypto */}
      {crypto?.btc && (
        <Section title="Crypto">
          <MacroTile label="Bitcoin" value={crypto.btc.price} changePct={crypto.btc.change_pct} icon="₿" unit="$" />
        </Section>
      )}
    </div>
  );
}
