"use client";

import { AlertTriangle } from "lucide-react";

export default function Disclaimer() {
  return (
    <div
      className="mt-4 flex items-center gap-1.5 border-t pt-3"
      style={{ borderColor: "var(--card-border)" }}
    >
      <AlertTriangle
        size={11}
        style={{ color: "var(--muted)", opacity: 0.5, flexShrink: 0 }}
      />
      <p
        className="text-[10px] leading-tight"
        style={{ color: "var(--muted)", opacity: 0.5 }}
      >
        This is not financial advice. For educational purposes only. Verify all
        data independently before making investment decisions.
      </p>
    </div>
  );
}
