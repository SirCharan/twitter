"use client";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import type { FeatureId } from "./FeatureBar";

interface Props {
  feature: FeatureId;
  onClose: () => void;
  onSend: (text: string) => void;
  onFeatureSend: (feature: FeatureId, params: Record<string, string>) => void;
}

const FEATURE_META: Record<FeatureId, { icon: string; label: string }> = {
  market_overview: { icon: "📈", label: "Market Overview" },
  top_stocks:      { icon: "🏆", label: "Top Stocks Dashboard" },
  market_news:     { icon: "📰", label: "News" },
  portfolio:       { icon: "💼", label: "Portfolio" },
  analyse:         { icon: "🔍", label: "Analyse" },
  deep_research:   { icon: "🔬", label: "Deep Research" },
  scan:            { icon: "📊", label: "Market Scan" },
  chart:           { icon: "📈", label: "Chart" },
  compare:         { icon: "⚖",  label: "Compare Stocks" },
  ipo:             { icon: "🚀", label: "IPO Tracker" },
  macro:           { icon: "🌐", label: "Macro View" },
  rrg:             { icon: "🔄", label: "Sector Rotation (RRG)" },
  summarise:       { icon: "✦",  label: "Summarise" },
  earnings:        { icon: "📅", label: "Earnings Calendar" },
  dividends:       { icon: "💰", label: "Dividend Tracker" },
  sectors:         { icon: "🏭", label: "Sector Performance" },
  valuation:       { icon: "📊", label: "Market Valuation" },
  announcements:   { icon: "📢", label: "Corporate Announcements" },
  fii_dii:         { icon: "🏛", label: "FII/DII Flows" },
  options:          { icon: "📊", label: "Options Analytics" },
};

function Chip({
  label, selected, onClick,
}: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bounce-tap rounded-full border px-3 py-1.5 text-xs font-medium transition-all"
      style={{
        borderColor: selected ? "var(--accent)" : "var(--card-border)",
        background: selected ? "rgba(201,169,110,0.08)" : "transparent",
        color: selected ? "var(--accent)" : "var(--muted)",
      }}
    >
      {label}
    </button>
  );
}

function StockInput({
  value, onChange, placeholder, inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "e.g. Reliance, TCS, HDFC Bank..."}
      className="w-full rounded-xl border bg-transparent px-4 py-3 text-sm outline-none transition-all"
      style={{
        borderColor: value ? "var(--accent)" : "var(--card-border)",
        color: "var(--foreground)",
        boxShadow: value ? "0 0 0 1px var(--accent-dim), 0 0 12px rgba(201,169,110,0.08)" : "none",
      }}
    />
  );
}

function SubmitBtn({
  label, disabled, onClick,
}: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="bounce-tap mt-4 w-full rounded-xl py-3 text-sm font-medium transition-all"
      style={{
        background: !disabled ? "var(--accent)" : "var(--card-border)",
        color: !disabled ? "#0A0A0A" : "var(--muted)",
        cursor: !disabled ? "pointer" : "not-allowed",
      }}
    >
      {label}
    </button>
  );
}

/* ────────────────────────────────────────────────── */
/* Individual feature panels                         */
/* ────────────────────────────────────────────────── */

function DeepResearchPanel({ onSubmit }: { onSubmit: (p: Record<string, string>) => void }) {
  const [stock, setStock] = useState("");
  const [mode, setMode] = useState("full");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const modes = ["Full Report", "News Focus", "Broker Calls", "Technical"];
  const modeMap: Record<string, string> = {
    "Full Report": "full", "News Focus": "news",
    "Broker Calls": "broker", "Technical": "technical",
  };
  return (
    <>
      <StockInput value={stock} onChange={setStock} inputRef={ref} />
      <div className="mt-3 flex flex-wrap gap-2">
        {modes.map((m) => (
          <Chip key={m} label={m} selected={mode === modeMap[m]} onClick={() => setMode(modeMap[m])} />
        ))}
      </div>
      <SubmitBtn
        label="Run Deep Research →"
        disabled={!stock.trim()}
        onClick={() => onSubmit({ stock: stock.trim(), mode })}
      />
    </>
  );
}

function ScanPanel({ onSubmit }: { onSubmit: (p: Record<string, string>) => void }) {
  const [scan, setScan] = useState("volume_pump");
  const scans = [
    { id: "volume_pump", label: "Volume Pump" },
    { id: "breakout", label: "Breakouts" },
    { id: "52w_high", label: "52W High" },
    { id: "52w_low", label: "52W Low" },
    { id: "sector_movers", label: "Sector Movers" },
    { id: "fii_dii", label: "FII / DII" },
  ];
  return (
    <>
      <p className="mb-3 text-xs" style={{ color: "var(--muted)" }}>
        Select a scan type to run across all NSE-listed stocks
      </p>
      <div className="flex flex-wrap gap-2">
        {scans.map((s) => (
          <Chip key={s.id} label={s.label} selected={scan === s.id} onClick={() => setScan(s.id)} />
        ))}
      </div>
      <SubmitBtn label="Scan Now →" disabled={false} onClick={() => onSubmit({ scan })} />
    </>
  );
}

function ChartPanel({ onSubmit }: { onSubmit: (p: Record<string, string>) => void }) {
  const [stock, setStock] = useState("");
  const [type, setType] = useState("tradingview");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <>
      <StockInput value={stock} onChange={setStock} inputRef={ref} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Chip label="TradingView (live)" selected={type === "tradingview"} onClick={() => setType("tradingview")} />
        <Chip label="Analysis Chart"    selected={type === "analysis"}     onClick={() => setType("analysis")} />
      </div>
      <SubmitBtn
        label="Show Chart →"
        disabled={!stock.trim()}
        onClick={() => onSubmit({ stock: stock.trim(), type })}
      />
    </>
  );
}

function ComparePanel({ onSubmit }: { onSubmit: (p: Record<string, string>) => void }) {
  const [stocks, setStocks] = useState(["", ""]);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  function setStock(i: number, v: string) {
    const next = [...stocks];
    next[i] = v;
    setStocks(next);
  }

  const valid = stocks.filter((s) => s.trim()).length >= 2;

  return (
    <>
      <div className="space-y-2">
        {stocks.map((s, i) => (
          <input
            key={i}
            ref={i === 0 ? ref : undefined}
            type="text"
            value={s}
            onChange={(e) => setStock(i, e.target.value)}
            placeholder={`Stock ${i + 1} — e.g. ${["Reliance", "TCS", "HDFC"][i]}`}
            className="w-full rounded-xl border bg-transparent px-4 py-3 text-sm outline-none transition-all"
            style={{
              borderColor: s ? "var(--accent)" : "var(--card-border)",
              color: "var(--foreground)",
              boxShadow: s ? "0 0 0 1px var(--accent-dim), 0 0 12px rgba(201,169,110,0.08)" : "none",
            }}
          />
        ))}
      </div>
      {stocks.length < 3 && (
        <button
          onClick={() => setStocks([...stocks, ""])}
          className="bounce-tap mt-2 text-xs underline-offset-2 hover:underline"
          style={{ color: "var(--muted)" }}
        >
          + Add third stock
        </button>
      )}
      <SubmitBtn
        label="Compare →"
        disabled={!valid}
        onClick={() => onSubmit({ stocks: stocks.filter((s) => s.trim()).join(",") })}
      />
    </>
  );
}

function SimplePanel({
  description, btnLabel, onSubmit,
}: { description: string; btnLabel: string; onSubmit: () => void }) {
  return (
    <>
      <p className="mb-4 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
        {description}
      </p>
      <SubmitBtn label={btnLabel} disabled={false} onClick={onSubmit} />
    </>
  );
}

function SummarisePanel({ onSubmit }: { onSubmit: (p: Record<string, string>) => void }) {
  const [text, setText] = useState("");
  return (
    <>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste article text, earnings report, or any content to summarise..."
        rows={5}
        className="w-full resize-none rounded-xl border bg-transparent px-4 py-3 text-sm outline-none transition-all"
        style={{
          borderColor: text ? "var(--accent)" : "var(--card-border)",
          color: "var(--foreground)",
          boxShadow: text ? "0 0 0 1px var(--accent-dim), 0 0 12px rgba(201,169,110,0.08)" : "none",
        }}
        autoFocus
      />
      <SubmitBtn
        label="Summarise →"
        disabled={!text.trim()}
        onClick={() => onSubmit({ text: text.trim() })}
      />
    </>
  );
}

function OptionalStockPanel({
  description, placeholder, btnLabel, onSubmit,
}: {
  description: string;
  placeholder: string;
  btnLabel: string;
  onSubmit: (stock: string) => void;
}) {
  const [stock, setStock] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <>
      <p className="mb-3 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
        {description}
      </p>
      <StockInput value={stock} onChange={setStock} placeholder={placeholder} inputRef={ref} />
      <SubmitBtn label={btnLabel} disabled={false} onClick={() => onSubmit(stock.trim())} />
    </>
  );
}

/* ────────────────────────────────────────────────── */
/* Main FeaturePanel component                        */
/* ────────────────────────────────────────────────── */

export default function FeaturePanel({ feature, onClose, onFeatureSend }: Props) {
  const { icon, label } = FEATURE_META[feature];

  function submit(params: Record<string, string>) {
    onFeatureSend(feature, params);
    onClose();
  }

  function renderInner() {
    switch (feature) {
      case "deep_research": return <DeepResearchPanel onSubmit={submit} />;
      case "scan":          return <ScanPanel onSubmit={submit} />;
      case "chart":         return <ChartPanel onSubmit={submit} />;
      case "compare":       return <ComparePanel onSubmit={submit} />;
      case "ipo":           return (
        <SimplePanel
          description="Load the latest IPO data — upcoming listings, open subscriptions, and recent listing returns."
          btnLabel="Load IPO Tracker →"
          onSubmit={() => submit({})}
        />
      );
      case "macro":         return (
        <SimplePanel
          description="View the macro dashboard — RBI repo rate, CPI inflation, G-Sec yield, USD/INR, crude oil, gold, and FII/DII flows."
          btnLabel="Load Macro Dashboard →"
          onSubmit={() => submit({})}
        />
      );
      case "rrg":           return (
        <SimplePanel
          description="View the Relative Rotation Graph — see which sectors are Leading, Weakening, Lagging, or Improving relative to Nifty 50."
          btnLabel="Load RRG →"
          onSubmit={() => submit({})}
        />
      );
      case "summarise":     return <SummarisePanel onSubmit={submit} />;
      case "earnings":      return <OptionalStockPanel description="View upcoming earnings dates and EPS surprise history for Nifty-50 stocks." placeholder="Leave empty for Nifty-50 upcoming..." btnLabel="Load Earnings →" onSubmit={(stock) => submit(stock ? { stock } : {})} />;
      case "dividends":     return <OptionalStockPanel description="View dividend history, yields, and sustainability scores." placeholder="Leave empty for top dividend yielders..." btnLabel="Load Dividends →" onSubmit={(stock) => submit(stock ? { stock } : {})} />;
      case "sectors":       return (
        <SimplePanel
          description="View sector-wise performance across 1-day, 1-week, and 1-month timeframes for all NSE sectors."
          btnLabel="Load Sectors →"
          onSubmit={() => submit({})}
        />
      );
      case "valuation":     return (
        <SimplePanel
          description="View market-wide valuation metrics — PE, PB, and the most/least expensive Nifty-50 stocks."
          btnLabel="Load Valuation →"
          onSubmit={() => submit({})}
        />
      );
      case "announcements": return (
        <SimplePanel
          description="Latest corporate announcements — earnings results, dividends, bonuses, splits, board meetings."
          btnLabel="Load Announcements →"
          onSubmit={() => submit({})}
        />
      );
      case "fii_dii": return (
        <SimplePanel
          description="Real-time FII/DII cash flows, F&O participant OI, and NSDL FPI data with AI analysis."
          btnLabel="Load FII/DII Flows →"
          onSubmit={() => submit({})}
        />
      );
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="mb-3 rounded-2xl border p-5"
      style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={onClose}
          className="bounce-tap flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
          style={{ color: "var(--muted)" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 2L4 7l5 5" />
          </svg>
          back
        </button>
        <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
          {icon} {label}
        </span>
      </div>

      {renderInner()}
    </motion.div>
  );
}
