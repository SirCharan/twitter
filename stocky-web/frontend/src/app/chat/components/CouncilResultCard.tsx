"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CardWrapper from "./ui/CardWrapper";
import MarkdownRich from "./MarkdownRich";
import Disclaimer from "./ui/Disclaimer";
import type { CouncilData } from "@/lib/types";

interface Props {
  data: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Collapsible section
// ---------------------------------------------------------------------------
function CollapsibleSection({
  title,
  badge,
  badgeColor,
  elapsed,
  children,
  defaultOpen = false,
}: {
  title: string;
  badge?: string;
  badgeColor?: string;
  elapsed?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t" style={{ borderColor: "var(--card-border)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-1 py-2.5"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            {open ? "▾" : "▸"}
          </span>
          <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            {title}
          </span>
          {badge && (
            <span
              className="rounded px-1.5 py-0.5 text-[9px] font-bold"
              style={{
                background: (badgeColor || "var(--accent)") + "18",
                color: badgeColor || "var(--accent)",
              }}
            >
              {badge}
            </span>
          )}
        </div>
        {elapsed != null && (
          <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)" }}>
            {elapsed}s
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-1 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatPrice(val?: number | null): string {
  if (val == null) return "—";
  return `₹${val.toLocaleString("en-IN")}`;
}

function confidenceColor(score: number): string {
  if (score >= 70) return "var(--positive)";
  if (score >= 40) return "#f59e0b";
  return "var(--negative)";
}

function riskColor(probability: number): string {
  if (probability >= 50) return "var(--negative)";
  if (probability >= 30) return "#f59e0b";
  return "var(--positive)";
}

function actionColor(action: string): string {
  switch (action.toUpperCase()) {
    case "BUY": return "var(--positive)";
    case "SELL": return "var(--negative)";
    case "HOLD": return "#f59e0b";
    default: return "var(--muted)";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CouncilResultCard({ data: rawData }: Props) {
  const d = rawData as unknown as Partial<CouncilData>;
  const s = d?.synthesis;
  const agents = d?.agents || [];
  const steps = d?.steps || [];
  const rebuttals = d?.rebuttals || [];
  const trade = s?.trade;
  const confidence = s?.confidence_score ?? 65;

  if (!s?.executive_summary && steps.length === 0) {
    return (
      <CardWrapper depth="elevated">
        <p className="p-4 text-sm" style={{ color: "var(--muted)" }}>
          Council research completed but no data received.
        </p>
      </CardWrapper>
    );
  }

  return (
    <CardWrapper depth="elevated">
      <div className="space-y-4 p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🏛️</span>
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--accent)" }}
            >
              Stocky Council Report
            </span>
          </div>
          {d?.total_elapsed != null && (
            <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)" }}>
              {d.total_elapsed.toFixed(1)}s
            </span>
          )}
        </div>

        {/* Confidence Meter */}
        {s?.confidence_score != null && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                Confidence Score
              </span>
              <span className="text-sm font-bold tabular-nums" style={{ color: confidenceColor(confidence) }}>
                {confidence}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--card-border)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: confidenceColor(confidence) }}
                initial={{ width: 0 }}
                animate={{ width: `${confidence}%` }}
                transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.2 }}
              />
            </div>
          </div>
        )}

        {/* Executive Summary */}
        {s?.executive_summary && (
          <div>
            <h4 className="mb-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--accent)" }}>
              Executive Summary
            </h4>
            <MarkdownRich text={s.executive_summary} />
          </div>
        )}

        {/* Bull / Bear Cases */}
        {(s?.bull_case || s?.bear_case) && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {s.bull_case && (
              <div className="rounded-xl border p-3" style={{ borderColor: "rgba(34,197,94,0.2)", background: "rgba(34,197,94,0.03)" }}>
                <h5 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--positive)" }}>
                  Bull Case
                </h5>
                <div className="text-xs leading-relaxed" style={{ color: "var(--foreground)" }}>
                  <MarkdownRich text={s.bull_case} />
                </div>
              </div>
            )}
            {s.bear_case && (
              <div className="rounded-xl border p-3" style={{ borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.03)" }}>
                <h5 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--negative)" }}>
                  Bear Case
                </h5>
                <div className="text-xs leading-relaxed" style={{ color: "var(--foreground)" }}>
                  <MarkdownRich text={s.bear_case} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Key Risks */}
        {(s?.key_risks?.length ?? 0) > 0 && (
          <div>
            <h4 className="mb-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--accent)" }}>
              Key Risks
            </h4>
            <div className="space-y-1">
              {s!.key_risks.map((risk, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg px-2 py-1.5"
                  style={{ background: "rgba(255,255,255,0.02)" }}>
                  <span className="text-xs" style={{ color: "var(--foreground)" }}>
                    {risk.risk}
                  </span>
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                    style={{ background: riskColor(risk.probability) + "18", color: riskColor(risk.probability) }}>
                    {risk.probability}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actionable Trade */}
        {trade && trade.action !== "HOLD" && trade.entry != null && (
          <div className="rounded-xl border p-3" style={{ borderColor: "rgba(201,169,110,0.3)", background: "rgba(201,169,110,0.04)" }}>
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase"
                style={{ background: actionColor(trade.action) + "22", color: actionColor(trade.action) }}>
                {trade.action}
              </span>
              <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                @ {formatPrice(trade.entry)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
              <div>
                <span style={{ color: "var(--muted)" }}>T1: </span>
                <span style={{ color: "var(--positive)" }}>{formatPrice(trade.target_1)}</span>
              </div>
              <div>
                <span style={{ color: "var(--muted)" }}>T2: </span>
                <span style={{ color: "var(--positive)" }}>{formatPrice(trade.target_2)}</span>
              </div>
              <div>
                <span style={{ color: "var(--muted)" }}>SL: </span>
                <span style={{ color: "var(--negative)" }}>{formatPrice(trade.stoploss)}</span>
              </div>
              <div>
                <span style={{ color: "var(--muted)" }}>R:R: </span>
                <span style={{ color: "var(--accent)" }}>{trade.risk_reward}</span>
              </div>
            </div>
            <div className="mt-1.5 flex gap-3 text-[10px]" style={{ color: "var(--muted)" }}>
              <span>Size: {trade.sizing}</span>
              <span>Timeframe: {trade.timeframe}</span>
            </div>
          </div>
        )}

        {/* Agent Sections (collapsible) */}
        {steps.length > 0 && (
          <div>
            {agents.map((agent) => {
              const agentStep = steps.find((s) => s.agent === agent.short && s.step >= 3 && s.step <= 7);
              if (!agentStep?.content) return null;
              return (
                <CollapsibleSection
                  key={agent.short}
                  title={`${agent.icon} ${agent.name}`}
                  badge={agent.short}
                  badgeColor={agent.color}
                  elapsed={agentStep.elapsed}
                >
                  <MarkdownRich text={agentStep.content} />
                </CollapsibleSection>
              );
            })}
          </div>
        )}

        {/* Rebuttals */}
        {rebuttals.length > 0 && (
          <CollapsibleSection
            title="Rebuttals & Conflicts"
            badge={`${rebuttals.length}`}
            badgeColor="#f59e0b"
            elapsed={rebuttals[0]?.elapsed}
          >
            {rebuttals.map((r, i) => (
              <div key={i} className="mb-2">
                <MarkdownRich text={r.content as string} />
              </div>
            ))}
          </CollapsibleSection>
        )}

        {/* Sources */}
        {(s?.sources?.length ?? 0) > 0 && (
          <div>
            <h4 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--positive)" }}>
              Sources Verified
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {s!.sources.map((src, i) => (
                <span key={i} className="rounded-full px-2 py-0.5 text-[10px]"
                  style={{ background: "rgba(34,197,94,0.1)", color: "var(--positive)" }}>
                  {src}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Unverified Claims */}
        {(s?.unverified_claims?.length ?? 0) > 0 && (
          <div>
            <h4 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--negative)" }}>
              Unverified Claims
            </h4>
            <div className="space-y-1">
              {s!.unverified_claims.map((claim, i) => (
                <p key={i} className="text-xs" style={{ color: "var(--muted)" }}>
                  {claim}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <Disclaimer />
      </div>
    </CardWrapper>
  );
}
