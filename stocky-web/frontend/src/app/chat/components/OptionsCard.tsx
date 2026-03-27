"use client";
import MarkdownRich from "./MarkdownRich";
import CardWrapper from "./ui/CardWrapper";
import { motion } from "framer-motion";
import AnimatedNumber from "./ui/AnimatedNumber";
import Disclaimer from "./ui/Disclaimer";
import CardActions from "./ui/CardActions";

interface Props {
  data: Record<string, unknown>;
}

interface OiEntry {
  strike: number;
  oi: number;
  oi_interpretation?: string;
}

interface ChainSummary {
  expiry: string;
  pcr: number | null;
  max_pain: number | null;
  atm_iv: number | null;
  total_call_oi: number;
  total_put_oi: number;
  top_call_oi: OiEntry[];
  top_put_oi: OiEntry[];
}

interface Signal {
  signal: string;
  strength: "Strong" | "Moderate" | "Weak";
  detail: string;
}

interface IvSkew {
  atm: number;
  otm_call_5pct: number | null;
  otm_put_5pct: number | null;
  skew_ratio: number | null;
}

interface Verdict {
  verdict: string;
  confidence: number;
  score: number;
  reasoning: string;
}

interface ExpectedMove {
  straddle_premium: number;
  atm_call_ltp: number;
  atm_put_ltp: number;
  lower: number;
  upper: number;
  pct: number;
}

/* ── Helper components ── */

function MetricTile({
  label, value, suffix = "", icon, highlight,
}: {
  label: string; value: string | number | null; suffix?: string; icon?: string; highlight?: "positive" | "negative" | "accent";
}) {
  if (value == null) return null;
  const colorMap = {
    positive: "var(--positive)",
    negative: "var(--negative)",
    accent: "var(--accent)",
  };
  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}
    >
      <div className="mb-1 flex items-center gap-1.5">
        {icon && <span className="text-[11px]">{icon}</span>}
        <p className="text-[11px] sm:text-[10px] font-medium" style={{ color: "var(--muted)" }}>{label}</p>
      </div>
      <p
        className="text-sm font-semibold"
        style={{ color: highlight ? colorMap[highlight] : "var(--foreground)" }}
      >
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}{suffix}
      </p>
    </div>
  );
}

function Section({ title, icon, children, cols = 3 }: { title: string; icon?: string; children: React.ReactNode; cols?: number }) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-1.5">
        {icon && <span className="text-[11px]">{icon}</span>}
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
          {title}
        </p>
        <div className="flex-1 h-px ml-2" style={{ background: "rgba(201,169,110,0.1)" }} />
      </div>
      <div className={`grid gap-2 ${cols === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
        {children}
      </div>
    </div>
  );
}

function PcrBar({ pcr, label }: { pcr: number; label: string }) {
  // PCR range: 0.3 to 2.0, map to 0-100%
  const clampedPcr = Math.min(Math.max(pcr, 0.3), 2.0);
  const pct = Math.round(((clampedPcr - 0.3) / 1.7) * 100);
  const isBullish = pcr > 1.0;

  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-medium" style={{ color: "var(--muted)" }}>{label}</span>
        <span
          className="text-[11px] font-semibold"
          style={{ color: isBullish ? "var(--positive)" : pcr < 0.7 ? "var(--negative)" : "var(--accent)" }}
        >
          PCR: {pcr}
        </span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{
            background: isBullish
              ? "linear-gradient(90deg, rgba(34,197,94,0.5), rgba(34,197,94,0.8))"
              : pcr < 0.7
                ? "linear-gradient(90deg, rgba(239,68,68,0.5), rgba(239,68,68,0.8))"
                : "linear-gradient(90deg, rgba(201,169,110,0.4), rgba(201,169,110,0.7))",
          }}
        />
      </div>
      <div className="mt-0.5 flex justify-between text-[9px]" style={{ color: "var(--muted)", opacity: 0.5 }}>
        <span>Bearish</span>
        <span>Neutral</span>
        <span>Bullish</span>
      </div>
    </div>
  );
}

function SignalBadge({ strength }: { strength: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    Strong: { bg: "rgba(34,197,94,0.15)", text: "var(--positive)" },
    Moderate: { bg: "rgba(201,169,110,0.15)", text: "var(--accent)" },
    Weak: { bg: "rgba(255,255,255,0.08)", text: "var(--muted)" },
  };
  const c = colors[strength] || colors.Weak;
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase"
      style={{ background: c.bg, color: c.text }}
    >
      {strength}
    </span>
  );
}

/* ── Main card ── */

export default function OptionsCard({ data }: Props) {
  const symbol = data.symbol as string || "NIFTY";
  const spot = data.spot as number || 0;
  const timestamp = data.timestamp as string || "";
  const weekly = data.weekly as ChainSummary | null;
  const monthly = data.monthly as ChainSummary | null;
  const ivSkew = data.iv_skew as IvSkew | null;
  const signals = (data.signals as Signal[]) || [];
  const verdict = data.verdict as Verdict | null;
  const expectedMove = data.expected_move as ExpectedMove | null;
  const error = data.error as string | undefined;

  if (error) {
    return (
      <CardWrapper icon="📊" title="Options Analytics">
        <div className="text-center py-6" style={{ color: "var(--muted)" }}>
          <p className="text-sm">{error}</p>
        </div>
      </CardWrapper>
    );
  }

  return (
    <CardWrapper icon="📊" title="Options Analytics">
      {/* Header */}
      <div
        className="mb-4 flex items-center justify-between rounded-xl px-4 py-2.5"
        style={{
          background: "linear-gradient(135deg, rgba(201,169,110,0.06) 0%, transparent 100%)",
          border: "1px solid rgba(201,169,110,0.08)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            {symbol}
          </span>
          {spot > 0 && (
            <span className="text-[11px]" style={{ color: "var(--accent)" }}>
              Spot: <AnimatedNumber value={spot} decimals={2} locale="en-IN" />
            </span>
          )}
          {verdict && (
            <span
              className="ml-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase"
              style={{
                background: verdict.verdict.includes("BULLISH")
                  ? "rgba(34,197,94,0.15)" : verdict.verdict.includes("BEARISH")
                    ? "rgba(239,68,68,0.15)" : "rgba(201,169,110,0.15)",
                color: verdict.verdict.includes("BULLISH")
                  ? "var(--positive)" : verdict.verdict.includes("BEARISH")
                    ? "var(--negative)" : "var(--accent)",
              }}
            >
              {verdict.verdict} {verdict.confidence}%
            </span>
          )}
        </div>
        {timestamp && (
          <span className="text-[10px]" style={{ color: "var(--muted)" }}>{timestamp}</span>
        )}
      </div>

      {/* Verdict reasoning */}
      {verdict?.reasoning && (
        <p className="text-[10px] mb-3 px-1" style={{ color: "var(--muted)" }}>
          {verdict.reasoning}
        </p>
      )}

      {/* PCR Gauges */}
      {(weekly?.pcr != null || monthly?.pcr != null) && (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="text-[11px]">📈</span>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
              Put-Call Ratio
            </p>
            <div className="flex-1 h-px ml-2" style={{ background: "rgba(201,169,110,0.1)" }} />
          </div>
          {weekly?.pcr != null && <PcrBar pcr={weekly.pcr} label={`Weekly (${weekly.expiry || ""})`} />}
          {monthly?.pcr != null && <PcrBar pcr={monthly.pcr} label={`Monthly (${monthly.expiry || ""})`} />}
        </div>
      )}

      {/* Max Pain vs Spot */}
      {(weekly?.max_pain || monthly?.max_pain) && spot > 0 && (
        <Section title="Max Pain vs Spot" icon="🎯" cols={2}>
          {weekly?.max_pain && (
            <MetricTile
              label={`Weekly Max Pain (${weekly.expiry || ""})`}
              value={weekly.max_pain}
              icon="📍"
              highlight={Math.abs(weekly.max_pain - spot) / spot < 0.01 ? "accent" : undefined}
            />
          )}
          {monthly?.max_pain && (
            <MetricTile
              label={`Monthly Max Pain (${monthly.expiry || ""})`}
              value={monthly.max_pain}
              icon="📍"
            />
          )}
          {weekly?.max_pain && (
            <MetricTile
              label="Distance from Spot"
              value={`${((weekly.max_pain - spot) / spot * 100).toFixed(2)}%`}
              icon={weekly.max_pain > spot ? "⬆" : "⬇"}
              highlight={weekly.max_pain > spot ? "positive" : "negative"}
            />
          )}
          {weekly?.atm_iv != null && (
            <MetricTile label="ATM IV" value={weekly.atm_iv} suffix="%" icon="🌡" />
          )}
        </Section>
      )}

      {/* OI Concentration */}
      {weekly && (weekly.top_call_oi?.length > 0 || weekly.top_put_oi?.length > 0) && (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="text-[11px]">🏗</span>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
              OI Concentration
            </p>
            <div className="flex-1 h-px ml-2" style={{ background: "rgba(201,169,110,0.1)" }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {/* Call OI - Resistance */}
            <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}>
              <p className="text-[10px] font-semibold mb-1.5" style={{ color: "var(--negative)" }}>
                Call OI (Resistance)
              </p>
              {weekly.top_call_oi?.slice(0, 5).map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-[10px] py-0.5" style={{ color: "var(--muted)" }}>
                  <span>{entry.strike.toLocaleString("en-IN")}</span>
                  <div className="flex items-center gap-1.5">
                    {entry.oi_interpretation && (
                      <span className="text-[8px] px-1 py-0.5 rounded" style={{
                        background: entry.oi_interpretation.includes("Short Buildup") ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)",
                        color: entry.oi_interpretation.includes("Short Buildup") ? "var(--negative)" : "var(--muted)",
                      }}>{entry.oi_interpretation}</span>
                    )}
                    <span>{(entry.oi / 1000).toFixed(0)}K</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Put OI - Support */}
            <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}>
              <p className="text-[10px] font-semibold mb-1.5" style={{ color: "var(--positive)" }}>
                Put OI (Support)
              </p>
              {weekly.top_put_oi?.slice(0, 5).map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-[10px] py-0.5" style={{ color: "var(--muted)" }}>
                  <span>{entry.strike.toLocaleString("en-IN")}</span>
                  <div className="flex items-center gap-1.5">
                    {entry.oi_interpretation && (
                      <span className="text-[8px] px-1 py-0.5 rounded" style={{
                        background: entry.oi_interpretation.includes("Long Buildup") ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.05)",
                        color: entry.oi_interpretation.includes("Long Buildup") ? "var(--positive)" : "var(--muted)",
                      }}>{entry.oi_interpretation}</span>
                    )}
                    <span>{(entry.oi / 1000).toFixed(0)}K</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* IV Skew */}
      {ivSkew && (
        <Section title="IV Skew" icon="🌡" cols={2}>
          <MetricTile label="ATM IV" value={ivSkew.atm} suffix="%" icon="🎯" />
          {ivSkew.otm_call_5pct != null && (
            <MetricTile label="OTM Call (+5%)" value={ivSkew.otm_call_5pct} suffix="%" icon="📤" />
          )}
          {ivSkew.otm_put_5pct != null && (
            <MetricTile label="OTM Put (-5%)" value={ivSkew.otm_put_5pct} suffix="%" icon="📥" />
          )}
          {ivSkew.skew_ratio != null && (
            <MetricTile
              label="Put/ATM Skew"
              value={`${ivSkew.skew_ratio}x`}
              icon={ivSkew.skew_ratio > 1.2 ? "⚠" : "✅"}
              highlight={ivSkew.skew_ratio > 1.2 ? "negative" : ivSkew.skew_ratio < 0.8 ? "positive" : undefined}
            />
          )}
        </Section>
      )}

      {/* Expected Move */}
      {expectedMove && expectedMove.straddle_premium > 0 && spot > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="text-[11px]">📐</span>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
              Expected Move (ATM Straddle)
            </p>
            <div className="flex-1 h-px ml-2" style={{ background: "rgba(201,169,110,0.1)" }} />
          </div>
          <div
            className="rounded-xl px-4 py-3"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                Straddle: ₹{expectedMove.straddle_premium.toLocaleString("en-IN")} (±{expectedMove.pct}%)
              </span>
              <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                CE ₹{expectedMove.atm_call_ltp} + PE ₹{expectedMove.atm_put_ltp}
              </span>
            </div>
            {/* Range bar */}
            <div className="relative h-6 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 flex items-center"
              >
                <div className="flex-1 h-full" style={{ background: "linear-gradient(90deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))" }} />
                <div className="w-px h-full" style={{ background: "var(--accent)" }} />
                <div className="flex-1 h-full" style={{ background: "linear-gradient(90deg, rgba(34,197,94,0.05), rgba(34,197,94,0.15))" }} />
              </motion.div>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] font-medium" style={{ color: "var(--negative)" }}>
                {expectedMove.lower.toLocaleString("en-IN")}
              </span>
              <span className="text-[10px] font-semibold" style={{ color: "var(--accent)" }}>
                {spot.toLocaleString("en-IN")}
              </span>
              <span className="text-[10px] font-medium" style={{ color: "var(--positive)" }}>
                {expectedMove.upper.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Signals */}
      {signals.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="text-[11px]">⚡</span>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
              Derived Signals
            </p>
            <div className="flex-1 h-px ml-2" style={{ background: "rgba(201,169,110,0.1)" }} />
          </div>
          <div className="space-y-1.5">
            {signals.map((sig, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.2 }}
                className="flex items-start gap-2 rounded-lg px-3 py-2"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}
              >
                <SignalBadge strength={sig.strength} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold" style={{ color: "var(--foreground)" }}>{sig.signal}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>{sig.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* No data fallback */}
      {!weekly && !monthly && !error && (
        <div className="text-center py-6" style={{ color: "var(--muted)" }}>
          <p className="text-sm">Options chain data is not available right now.</p>
          <p className="text-[11px] mt-1">Check if Dhan HQ credentials are configured and market is open.</p>
        </div>
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
            Stocky&apos;s Options Read
          </p>
          <div className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
            <MarkdownRich text={data.ai_analysis as string} />
          </div>
        </div>
      )}

      <CardActions cardType="options" cardData={data} />
      <Disclaimer freshnessWarning={data.freshness_warning as string | undefined} />
    </CardWrapper>
  );
}
