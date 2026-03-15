"use client";
import type { PriceData } from "@/lib/types";
import CardWrapper from "./ui/CardWrapper";
import { motion } from "framer-motion";

export default function PriceCard({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as PriceData;
  const isPositive = d.change >= 0;
  const changeColor = isPositive ? "var(--positive)" : "var(--negative)";

  return (
    <CardWrapper icon="💰">
    <div className="space-y-3">
      {/* Symbol + LTP */}
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          {d.symbol}
        </p>
        <div className="text-right">
          <p className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>
            ₹{d.ltp.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </p>
          <p className="text-sm font-medium" style={{ color: changeColor }}>
            {isPositive ? "+" : ""}{d.change.toFixed(2)} ({isPositive ? "+" : ""}{d.pct_change.toFixed(2)}%)
          </p>
        </div>
      </div>

      {/* OHLC Grid */}
      <div
        className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border p-3"
        style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
      >
        <div>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Open</p>
          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            ₹{d.open.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Prev Close</p>
          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            ₹{d.prev_close.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "var(--muted)" }}>High</p>
          <p className="text-sm font-medium" style={{ color: "var(--positive)" }}>
            ₹{d.high.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Low</p>
          <p className="text-sm font-medium" style={{ color: "var(--negative)" }}>
            ₹{d.low.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Volume */}
      {d.volume > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "var(--muted)" }}>Volume</span>
          <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
            {d.volume.toLocaleString("en-IN")}
          </span>
        </div>
      )}
    </div>
    </CardWrapper>
  );
}
