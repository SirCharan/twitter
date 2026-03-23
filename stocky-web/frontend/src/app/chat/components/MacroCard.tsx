"use client";
import MarkdownRich from "./MarkdownRich";
import CardWrapper from "./ui/CardWrapper";
import { motion } from "framer-motion";
import AnimatedNumber from "./ui/AnimatedNumber";
import Disclaimer from "./ui/Disclaimer";
import CardActions from "./ui/CardActions";

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
      <div className="mb-1 flex items-center gap-1.5">
        {icon && <span className="text-[11px]">{icon}</span>}
        <p className="text-[11px] sm:text-[10px] font-medium" style={{ color: "var(--muted)" }}>{label}</p>
      </div>
      <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
        {typeof value === "number"
          ? <AnimatedNumber value={value} prefix={unit} decimals={2} locale="en-IN" />
          : `${unit ?? ""}${value}`}
      </p>
      {changePct != null && (
        <p
          className="mt-0.5 text-[11px] sm:text-[10px] font-medium"
          style={{ color: isPositive ? "var(--positive)" : "var(--negative)" }}
        >
          {isPositive ? "+" : ""}{changePct.toFixed(2)}%
        </p>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-1.5">
        {icon && <span className="text-[11px]">{icon}</span>}
        <p
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--accent)" }}
        >
          {title}
        </p>
        <div className="flex-1 h-px ml-2" style={{ background: "rgba(201,169,110,0.1)" }} />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{children}</div>
    </div>
  );
}

export default function MacroCard({ data }: Props) {
  const forex = data.forex as Record<string, PricePoint | undefined>;
  const commodities = data.commodities as Record<string, PricePoint | undefined>;
  const indices = data.indices as Record<string, PricePoint | undefined>;
  const crypto = data.crypto as Record<string, PricePoint | undefined>;
  const bonds = data.bonds as Record<string, PricePoint | undefined> | undefined;
  const rbi = data.rbi as { repo_rate: number; note: string } | undefined;

  return (
    <CardWrapper icon="🌐" title="Macro Dashboard">
      {/* Header */}
      <div
        className="mb-4 flex items-center gap-2 rounded-xl px-4 py-2.5"
        style={{
          background: "linear-gradient(135deg, rgba(201,169,110,0.06) 0%, transparent 100%)",
          border: "1px solid rgba(201,169,110,0.08)",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="var(--accent)" strokeWidth="1.3" />
          <path d="M3 8h10M8 3c-1.5 2-1.5 8 0 10M8 3c1.5 2 1.5 8 0 10" stroke="var(--accent)" strokeWidth="1" />
        </svg>
        <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          Macro Dashboard
        </span>
      </div>

      {/* RBI */}
      {rbi && (
        <Section title="RBI Policy" icon="🏦">
          <MacroTile label="Repo Rate" value={`${rbi.repo_rate}%`} icon="📌" />
        </Section>
      )}

      {/* Bonds */}
      {bonds && (
        <Section title="Bonds" icon="📜">
          {bonds.india_10y && (
            <MacroTile label="India 10Y" value={bonds.india_10y.price} changePct={bonds.india_10y.change_pct} icon="🇮🇳" />
          )}
          {bonds.us_10y && (
            <MacroTile label="US 10Y" value={bonds.us_10y.price} changePct={bonds.us_10y.change_pct} icon="🇺🇸" />
          )}
        </Section>
      )}

      {/* Forex */}
      {forex && (
        <Section title="Forex" icon="💱">
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
        <Section title="Commodities" icon="⛏">
          {commodities.gold && (
            <MacroTile label="Gold (USD/oz)" value={commodities.gold.price} changePct={commodities.gold.change_pct} icon="🥇" unit="$" />
          )}
          {commodities.gold_inr && (
            <MacroTile label="Gold (INR/10g)" value={commodities.gold_inr.price} changePct={commodities.gold_inr.change_pct} icon="🇮🇳" unit="₹" />
          )}
          {commodities.crude && (
            <MacroTile label="Crude (USD/bbl)" value={commodities.crude.price} changePct={commodities.crude.change_pct} icon="🛢" unit="$" />
          )}
          {commodities.crude_inr && (
            <MacroTile label="Crude (INR/bbl)" value={commodities.crude_inr.price} changePct={commodities.crude_inr.change_pct} icon="🇮🇳" unit="₹" />
          )}
          {commodities.silver && (
            <MacroTile label="Silver (USD/oz)" value={commodities.silver.price} changePct={commodities.silver.change_pct} icon="🥈" unit="$" />
          )}
        </Section>
      )}

      {/* Global Indices */}
      {indices && (
        <Section title="Global Indices" icon="📈">
          {indices.nifty && (
            <MacroTile label="Nifty 50" value={indices.nifty.price} changePct={indices.nifty.change_pct} />
          )}
          {indices.vix && (
            <MacroTile label="India VIX" value={indices.vix.price} changePct={indices.vix.change_pct} icon="🌡" />
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
      {crypto && (crypto.btc || crypto.eth) && (
        <Section title="Crypto" icon="🪙">
          {crypto.btc && (
            <MacroTile label="Bitcoin" value={crypto.btc.price} changePct={crypto.btc.change_pct} icon="₿" unit="$" />
          )}
          {crypto.eth && (
            <MacroTile label="Ethereum" value={crypto.eth.price} changePct={crypto.eth.change_pct} icon="⟠" unit="$" />
          )}
        </Section>
      )}

      {/* Stocky's Macro Read */}
      {(data.ai_analysis as string) && (
        <div
          className="rounded-xl border-l-2 px-4 py-3 mt-3"
          style={{
            borderColor: "var(--accent)",
            background: "linear-gradient(135deg, rgba(201,169,110,0.04) 0%, var(--surface) 100%)",
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--accent)" }}>
            Stocky&apos;s Macro Read
          </p>
          <div className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
            <MarkdownRich text={data.ai_analysis as string} />
          </div>
        </div>
      )}
      <CardActions cardType="macro" cardData={data} />
      <Disclaimer freshnessWarning={data.freshness_warning as string | undefined} />
    </CardWrapper>
  );
}
