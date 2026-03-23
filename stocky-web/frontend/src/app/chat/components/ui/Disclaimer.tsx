"use client";

import { AlertTriangle, Clock } from "lucide-react";

interface Props {
  freshnessWarning?: string;
}

export default function Disclaimer({ freshnessWarning }: Props = {}) {
  return (
    <>
      {freshnessWarning && (
        <div
          className="mt-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5"
          style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.15)" }}
        >
          <Clock size={10} style={{ color: "rgba(251,191,36,0.7)", flexShrink: 0 }} />
          <p className="text-[10px] leading-tight" style={{ color: "rgba(251,191,36,0.7)" }}>
            {freshnessWarning}
          </p>
        </div>
      )}
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
    </>
  );
}
