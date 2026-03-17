"use client";
import { useEffect } from "react";
import { motion } from "framer-motion";
import type { TradeConfirmData } from "@/lib/types";
import { track } from "@/lib/analytics";
import RiskGauge from "./ui/RiskGauge";

interface Props {
  data: Record<string, unknown>;
  actionId: string;
  onAction: (actionId: string, action: "confirm" | "cancel") => void;
}

export default function TradeConfirmation({ data, actionId, onAction }: Props) {
  const d = data as unknown as TradeConfirmData;
  const isBuy = d.txn_type === "BUY";
  const accentColor = isBuy ? "var(--positive)" : "var(--negative)";
  const accentBg = isBuy ? "rgba(0,255,170,0.08)" : "rgba(255,59,92,0.08)";
  const estValue = d.price && d.qty ? d.price * d.qty : null;

  const riskScore = !estValue ? 25
    : estValue < 10_000 ? 20
    : estValue < 50_000 ? 45
    : estValue < 200_000 ? 70
    : 90;

  // Keyboard shortcuts: Enter to confirm, Escape to cancel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onAction(actionId, "confirm"); }
      if (e.key === "Escape") onAction(actionId, "cancel");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [actionId, onAction]);

  return (
    <motion.div
      role="alertdialog"
      aria-label={`Confirm ${d.txn_type} order for ${d.symbol}`}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: accentColor, background: "var(--surface)" }}
    >
      {/* Warning strip */}
      <div
        className="flex items-center gap-2 px-4 py-2 text-[11px] font-medium"
        style={{
          background: "rgba(201,169,110,0.07)",
          borderBottom: "1px solid rgba(201,169,110,0.12)",
          color: "var(--accent)",
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Review before executing — this will place a real order
      </div>

      {/* Header: direction badge + symbol */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl text-base font-bold shrink-0"
          style={{ background: accentBg, color: accentColor, border: `1.5px solid ${accentColor}` }}
        >
          {isBuy ? "B" : "S"}
        </div>
        <div>
          <p className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
            {d.symbol}
            <span className="ml-1.5 text-xs font-normal" style={{ color: "var(--muted)" }}>
              {d.exchange}
            </span>
          </p>
          <p className="text-xs font-medium" style={{ color: accentColor }}>
            {d.txn_type} · {d.order_type} · {d.product}
          </p>
        </div>
      </div>

      <div className="divider-gradient mx-4" />

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3">
        <div>
          <p className="text-[11px] mb-0.5" style={{ color: "var(--muted)" }}>Quantity</p>
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{d.qty}</p>
        </div>
        <div>
          <p className="text-[11px] mb-0.5" style={{ color: "var(--muted)" }}>Price</p>
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            {d.price
              ? `₹${d.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
              : "Market"}
          </p>
        </div>
      </div>

      {/* Est. Value — prominent row */}
      {estValue && (
        <div className="mx-4 mb-3 rounded-xl px-3 py-2.5" style={{ background: "var(--card-bg)" }}>
          <p className="text-[11px] mb-0.5" style={{ color: "var(--muted)" }}>Estimated Value</p>
          <p className="text-xl font-bold" style={{ color: accentColor }}>
            ₹{estValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </p>
        </div>
      )}

      {/* Risk gauge */}
      <RiskGauge value={riskScore} />

      {/* Buttons */}
      <div className="flex flex-col gap-2 px-4 pb-3">
        <button
          onClick={() => { track("trade_action", "trade_confirm", { action_id: actionId, symbol: d.symbol }); onAction(actionId, "confirm"); }}
          className="confirm-pulse w-full rounded-xl py-2.5 text-sm font-semibold tracking-wide transition-all hover:opacity-90 flex items-center justify-center gap-2"
          style={{ background: accentColor, color: "#0A0A0A" }}
        >
          Confirm {d.txn_type}
          <kbd className="kbd text-[10px]">Enter</kbd>
        </button>
        <button
          onClick={() => { track("trade_action", "trade_cancel", { action_id: actionId, symbol: d.symbol }); onAction(actionId, "cancel"); }}
          className="w-full rounded-xl border py-2 text-xs font-medium tracking-wide transition-all hover:opacity-80 flex items-center justify-center gap-2"
          style={{ borderColor: "var(--card-border)", color: "var(--muted)", background: "transparent" }}
        >
          Cancel
          <kbd className="kbd text-[10px]">Esc</kbd>
        </button>
      </div>

      {/* Disclaimer */}
      <p className="px-4 pb-3 text-[10px] text-center" style={{ color: "var(--muted)", opacity: 0.5 }}>
        This will execute a live order on your Zerodha account
      </p>
    </motion.div>
  );
}
