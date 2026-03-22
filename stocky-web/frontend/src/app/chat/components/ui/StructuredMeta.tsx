"use client";

import { AlertTriangle, Target, Shield, BookOpen } from "lucide-react";
import type { StructuredMeta as StructuredMetaType } from "@/lib/types";
import ActionTag from "./ActionTag";

interface Props {
  meta: StructuredMetaType;
  compact?: boolean;
}

export default function StructuredMeta({ meta, compact = false }: Props) {
  if (!meta) return null;

  const confidenceColor =
    meta.confidence >= 70 ? "#22c55e" : meta.confidence >= 40 ? "#eab308" : "#ef4444";

  return (
    <div className="mt-4 space-y-3" style={{ borderTop: "1px solid var(--card-border)", paddingTop: 12 }}>
      {/* Action Tag + Confidence */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ActionTag tag={meta.action_tag} size="md" />
          {meta.confidence_reasoning && (
            <span className="text-[11px]" style={{ color: "var(--muted)" }}>
              {meta.confidence_reasoning}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium" style={{ color: confidenceColor }}>
            {meta.confidence}% confidence
          </span>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ width: 60, background: "rgba(255,255,255,0.06)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${meta.confidence}%`, background: confidenceColor }}
            />
          </div>
        </div>
      </div>

      {/* Payoff Asymmetry Box */}
      {meta.payoff_box && !compact && (
        <div
          className="rounded-lg p-3"
          style={{ background: "rgba(201,169,110,0.06)", border: "1px solid rgba(201,169,110,0.15)" }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Target size={12} style={{ color: "var(--accent)" }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
              Payoff Asymmetry
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <div>
              <div style={{ color: "var(--muted)" }} className="mb-0.5">Upside</div>
              <div style={{ color: "#22c55e" }} className="font-medium">{meta.payoff_box.upside}</div>
            </div>
            <div>
              <div style={{ color: "var(--muted)" }} className="mb-0.5">Downside</div>
              <div style={{ color: "#ef4444" }} className="font-medium">{meta.payoff_box.downside}</div>
            </div>
            <div>
              <div style={{ color: "var(--muted)" }} className="mb-0.5">Asymmetry</div>
              <div style={{ color: "var(--accent)" }} className="font-medium">{meta.payoff_box.asymmetry}</div>
            </div>
          </div>
        </div>
      )}

      {/* Thesis Killers */}
      {meta.thesis_killers && meta.thesis_killers.length > 0 && !compact && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Shield size={12} style={{ color: "#ef4444" }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#ef4444", opacity: 0.8 }}>
              Thesis Killers
            </span>
          </div>
          <ul className="space-y-0.5">
            {meta.thesis_killers.map((killer, i) => (
              <li
                key={i}
                className="text-[11px] pl-3 relative"
                style={{ color: "var(--muted)" }}
              >
                <span className="absolute left-0" style={{ color: "#ef4444", opacity: 0.6 }}>-</span>
                {killer}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sources */}
      {meta.sources && meta.sources.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <BookOpen size={10} style={{ color: "var(--muted)", opacity: 0.5 }} />
          {meta.sources.map((src, i) => (
            <span
              key={i}
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "var(--muted)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {src.name}
              {src.freshness && (
                <span style={{ opacity: 0.5 }}> · {src.freshness}</span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
