"use client";
import { motion } from "framer-motion";

interface Props {
  value: number; // 0–100
  label?: string;
}

export default function RiskGauge({ value, label = "Order Risk" }: Props) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const markerLeft = `${clampedValue}%`;

  const riskLabel =
    clampedValue < 34 ? "Low" : clampedValue < 67 ? "Medium" : "High";
  const riskColor =
    clampedValue < 34
      ? "var(--positive)"
      : clampedValue < 67
      ? "var(--accent)"
      : "var(--negative)";

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px]" style={{ color: "var(--muted)" }}>
          {label}
        </span>
        <span className="text-[11px] font-semibold" style={{ color: riskColor }}>
          {riskLabel}
        </span>
      </div>

      {/* Track */}
      <div className="relative h-1.5 rounded-full risk-gauge-track overflow-visible">
        {/* Animated marker */}
        <motion.div
          initial={{ left: "0%" }}
          animate={{ left: markerLeft }}
          transition={{ type: "spring", stiffness: 200, damping: 25, delay: 0.15 }}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full border-2"
          style={{
            background: riskColor,
            borderColor: "var(--background)",
            boxShadow: `0 0 6px ${riskColor}`,
          }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-1">
        <span className="text-[9px]" style={{ color: "var(--positive)", opacity: 0.7 }}>Low</span>
        <span className="text-[9px]" style={{ color: "var(--accent)", opacity: 0.7 }}>Medium</span>
        <span className="text-[9px]" style={{ color: "var(--negative)", opacity: 0.7 }}>High</span>
      </div>
    </div>
  );
}
