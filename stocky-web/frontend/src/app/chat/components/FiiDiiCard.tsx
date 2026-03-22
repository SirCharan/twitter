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

interface FlowEntry {
  buy: number | null;
  sell: number | null;
  net: number | null;
}

interface CashData {
  date: string | null;
  fii: FlowEntry;
  dii: FlowEntry;
}

interface OiEntry {
  long: number;
  short: number;
}

interface ParticipantOi {
  index_futures: OiEntry;
  index_options: OiEntry;
  stock_futures: OiEntry;
  stock_options: OiEntry;
}

interface FoData {
  date: string | null;
  participants: Record<string, ParticipantOi>;
}

interface NsdlData {
  date: string | null;
  equity: number | null;
  debt: number | null;
  hybrid: number | null;
  total: number | null;
}

/* ── Tile components ── */

function FlowTile({
  label,
  value,
  unit = "₹",
  suffix = " Cr",
  icon,
  colorBySign = false,
}: {
  label: string;
  value: number | null | undefined;
  unit?: string;
  suffix?: string;
  icon?: string;
  colorBySign?: boolean;
}) {
  if (value == null) return null;
  const isPositive = value >= 0;

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
        style={{
          color: colorBySign
            ? isPositive ? "var(--positive)" : "var(--negative)"
            : "var(--foreground)",
        }}
      >
        {colorBySign && isPositive ? "+" : ""}
        <AnimatedNumber value={value} prefix={unit} decimals={2} locale="en-IN" />
        {suffix}
      </p>
    </div>
  );
}

function Section({ title, icon, children, cols = 3 }: { title: string; icon?: string; children: React.ReactNode; cols?: number }) {
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
      <div className={`grid gap-2 ${cols === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
        {children}
      </div>
    </div>
  );
}

function FlowBar({ fiiNet, diiNet }: { fiiNet: number; diiNet: number }) {
  const total = Math.abs(fiiNet) + Math.abs(diiNet);
  if (total === 0) return null;
  const fiiPct = Math.round((Math.abs(fiiNet) / total) * 100);
  const diiPct = 100 - fiiPct;

  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-medium" style={{ color: fiiNet >= 0 ? "var(--positive)" : "var(--negative)" }}>
          FII: {fiiNet >= 0 ? "+" : ""}{fiiNet.toLocaleString("en-IN")} Cr
        </span>
        <span className="text-[10px] font-medium" style={{ color: diiNet >= 0 ? "var(--positive)" : "var(--negative)" }}>
          DII: {diiNet >= 0 ? "+" : ""}{diiNet.toLocaleString("en-IN")} Cr
        </span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${fiiPct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-l-full"
          style={{
            background: fiiNet >= 0
              ? "linear-gradient(90deg, rgba(34,197,94,0.7), rgba(34,197,94,0.4))"
              : "linear-gradient(90deg, rgba(239,68,68,0.7), rgba(239,68,68,0.4))",
          }}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${diiPct}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
          className="h-full rounded-r-full"
          style={{
            background: diiNet >= 0
              ? "linear-gradient(90deg, rgba(59,130,246,0.4), rgba(59,130,246,0.7))"
              : "linear-gradient(90deg, rgba(249,115,22,0.4), rgba(249,115,22,0.7))",
          }}
        />
      </div>
    </div>
  );
}

/* ── Main card ── */

export default function FiiDiiCard({ data }: Props) {
  const cash = data.cash as CashData | null;
  const fo = data.fo_participants as FoData | null;
  const nsdl = data.nsdl_fpi as NsdlData | null;

  const dateStr = cash?.date || fo?.date || nsdl?.date || "";

  return (
    <CardWrapper icon="🏛" title="FII/DII Institutional Flows">
      {/* Header */}
      <div
        className="mb-4 flex items-center justify-between rounded-xl px-4 py-2.5"
        style={{
          background: "linear-gradient(135deg, rgba(201,169,110,0.06) 0%, transparent 100%)",
          border: "1px solid rgba(201,169,110,0.08)",
        }}
      >
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 8h4l2-5 2 10 2-5h4" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Institutional Flows
          </span>
        </div>
        {dateStr && (
          <span className="text-[10px]" style={{ color: "var(--muted)" }}>
            {dateStr}
          </span>
        )}
      </div>

      {/* Cash Segment */}
      {cash && (cash.fii?.net != null || cash.dii?.net != null) && (
        <>
          <Section title="Cash Segment" icon="💰">
            <FlowTile label="FII Buy" value={cash.fii?.buy} icon="🟢" />
            <FlowTile label="FII Sell" value={cash.fii?.sell} icon="🔴" />
            <FlowTile label="FII Net" value={cash.fii?.net} icon="📊" colorBySign />
            <FlowTile label="DII Buy" value={cash.dii?.buy} icon="🟢" />
            <FlowTile label="DII Sell" value={cash.dii?.sell} icon="🔴" />
            <FlowTile label="DII Net" value={cash.dii?.net} icon="📊" colorBySign />
          </Section>

          {/* Net Flow Bar */}
          {cash.fii?.net != null && cash.dii?.net != null && (
            <FlowBar fiiNet={cash.fii.net} diiNet={cash.dii.net} />
          )}
        </>
      )}

      {/* F&O Participant OI */}
      {fo?.participants && Object.keys(fo.participants).length > 0 && (
        <Section title="F&O Participant OI" icon="📊" cols={2}>
          {Object.entries(fo.participants).map(([name, oi]) => {
            const netFut = (oi.index_futures?.long ?? 0) - (oi.index_futures?.short ?? 0);
            const netOpt = (oi.index_options?.long ?? 0) - (oi.index_options?.short ?? 0);
            return (
              <div
                key={name}
                className="rounded-xl px-3 py-2.5"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}
              >
                <p className="text-[11px] font-semibold mb-1" style={{ color: "var(--accent)" }}>
                  {name}
                </p>
                <div className="flex justify-between text-[10px]" style={{ color: "var(--muted)" }}>
                  <span>Idx Fut</span>
                  <span style={{ color: netFut >= 0 ? "var(--positive)" : "var(--negative)" }}>
                    {netFut >= 0 ? "+" : ""}{netFut.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between text-[10px]" style={{ color: "var(--muted)" }}>
                  <span>Idx Opt</span>
                  <span style={{ color: netOpt >= 0 ? "var(--positive)" : "var(--negative)" }}>
                    {netOpt >= 0 ? "+" : ""}{netOpt.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            );
          })}
        </Section>
      )}

      {/* NSDL FPI Daily */}
      {nsdl && (nsdl.equity != null || nsdl.debt != null) && (
        <Section title="NSDL FPI Daily" icon="🌐">
          <FlowTile label="Equity" value={nsdl.equity} icon="📈" colorBySign />
          <FlowTile label="Debt" value={nsdl.debt} icon="📜" colorBySign />
          {nsdl.hybrid != null && <FlowTile label="Hybrid" value={nsdl.hybrid} icon="🔄" colorBySign />}
        </Section>
      )}

      {/* No data fallback */}
      {!cash && !fo && !nsdl && (
        <div className="text-center py-6" style={{ color: "var(--muted)" }}>
          <p className="text-sm">FII/DII data is not available right now.</p>
          <p className="text-[11px] mt-1">NSE publishes this data after 6 PM IST on trading days.</p>
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
            Stocky&apos;s Flow Read
          </p>
          <div className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
            <MarkdownRich text={data.ai_analysis as string} />
          </div>
        </div>
      )}

      <CardActions cardType="fii_dii" cardData={data} />
      <Disclaimer />
    </CardWrapper>
  );
}
