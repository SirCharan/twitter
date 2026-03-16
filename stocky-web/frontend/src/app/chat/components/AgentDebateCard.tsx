"use client";
import React, { useState } from "react";
import MarkdownRich from "./MarkdownRich";
import CardWrapper from "./ui/CardWrapper";
import { motion } from "framer-motion";

interface AgentSection {
  agent: string;
  content: string;
  elapsed?: number;
}

interface TriadData {
  query: string;
  briefing: AgentSection;
  thesis: AgentSection;
  cross_examination: AgentSection;
  rebuttal: AgentSection;
  final_assessment: AgentSection;
  synthesis: string;
  synthesis_elapsed: number;
  confidence_score: number;
  sources_verified: string[];
  unverified_claims: string[];
  total_elapsed: number;
}

interface Props {
  data: Record<string, unknown>;
}

function ConfidenceMeter({ score }: { score: number }) {
  const color = score >= 70 ? "var(--positive)" : score >= 40 ? "#eab308" : "#ef4444";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--card-border)" }}>
        <div
          className="h-full rounded-full bar-fill"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span className="text-sm font-bold tabular-nums" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

function CollapsibleSection({
  title,
  icon,
  accentColor,
  agentName,
  elapsed,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: string;
  accentColor: string;
  agentName: string;
  elapsed?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="rounded-xl border transition-colors"
      style={{ borderColor: open ? `${accentColor}20` : "var(--card-border)", background: "var(--surface)" }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left"
      >
        <span className="text-xs">{icon}</span>
        <span className="flex-1 text-[12px] font-medium" style={{ color: "var(--foreground)" }}>
          {title}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ background: `${accentColor}15`, color: accentColor }}
        >
          {agentName}
        </span>
        {elapsed != null && (
          <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)" }}>
            {elapsed.toFixed(1)}s
          </span>
        )}
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className="shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="var(--muted)" strokeWidth="1.2" />
        </svg>
      </button>
      {open && (
        <div
          className="border-t px-4 py-3 text-xs leading-relaxed"
          style={{ borderColor: "var(--card-border)" }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default function AgentDebateCard({ data }: Props) {
  const d = data as unknown as Partial<TriadData>;

  // Defensive: bail gracefully if critical data is missing
  if (!d.synthesis && !d.thesis) {
    return (
      <CardWrapper depth="elevated">
        <p className="text-sm" style={{ color: "var(--muted)" }}>Deep research completed but no data received.</p>
      </CardWrapper>
    );
  }

  return (
    <CardWrapper depth="elevated">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="var(--accent)" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--accent)" }}
          >
            Triad Deep Research
          </span>
        </div>
        <div className="divider-gradient flex-1" />
        <span className="text-[10px] tabular-nums font-medium" style={{ color: "var(--muted)" }}>
          {(d.total_elapsed ?? 0).toFixed(1)}s
        </span>
      </div>

      {/* Confidence Score */}
      {d.confidence_score != null && (
        <div
          className="mb-4 rounded-xl border px-4 py-3"
          style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
              Confidence Score
            </span>
          </div>
          <ConfidenceMeter score={d.confidence_score} />
        </div>
      )}

      {/* Final Synthesis — main answer */}
      {d.synthesis && (
        <div
          className="mb-4 rounded-2xl border px-4 py-4 sm:px-5"
          style={{
            borderColor: "rgba(201,169,110,0.12)",
            background: "linear-gradient(135deg, rgba(201,169,110,0.03) 0%, var(--card-bg) 100%)",
          }}
        >
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs">{"\u2726"}</span>
            <div className="h-1 w-6 rounded-full" style={{ background: "var(--accent)" }} />
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--accent)" }}
            >
              Nexus — Final Synthesis
            </span>
            {d.synthesis_elapsed != null && (
              <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)" }}>
                {d.synthesis_elapsed.toFixed(1)}s
              </span>
            )}
          </div>
          <div className="text-xs leading-relaxed">
            <MarkdownRich text={d.synthesis} />
          </div>
        </div>
      )}

      {/* Agent debate sections (collapsed by default) */}
      <div className="space-y-2">
        {d.thesis?.content && (
          <CollapsibleSection
            title="Initial Thesis"
            icon={"\uD83D\uDD2C"}
            accentColor="#60a5fa"
            agentName={d.thesis.agent}
            elapsed={d.thesis.elapsed}
          >
            <MarkdownRich text={d.thesis.content} />
          </CollapsibleSection>
        )}

        {d.cross_examination?.content && (
          <CollapsibleSection
            title="Cross-Examination"
            icon={"\u2694\uFE0F"}
            accentColor="#f87171"
            agentName={d.cross_examination.agent}
            elapsed={d.cross_examination.elapsed}
          >
            <MarkdownRich text={d.cross_examination.content} />
          </CollapsibleSection>
        )}

        {d.rebuttal?.content && (
          <CollapsibleSection
            title="Rebuttal"
            icon={"\uD83D\uDD04"}
            accentColor="#60a5fa"
            agentName={d.rebuttal.agent}
            elapsed={d.rebuttal.elapsed}
          >
            <MarkdownRich text={d.rebuttal.content} />
          </CollapsibleSection>
        )}

        {d.final_assessment?.content && (
          <CollapsibleSection
            title="Final Assessment"
            icon={"\u2694\uFE0F"}
            accentColor="#f87171"
            agentName={d.final_assessment.agent}
          >
            <MarkdownRich text={d.final_assessment.content} />
          </CollapsibleSection>
        )}

        {d.briefing?.content && (
          <CollapsibleSection
            title="Research Briefing"
            icon={"\uD83C\uDFAF"}
            accentColor="var(--accent)"
            agentName={d.briefing.agent}
            elapsed={d.briefing.elapsed}
          >
            <MarkdownRich text={d.briefing.content} />
          </CollapsibleSection>
        )}
      </div>

      {/* Sources & Unverified Claims */}
      <div className="mt-4 space-y-3">
        {(d.sources_verified?.length ?? 0) > 0 && (
          <div
            className="rounded-xl border px-4 py-3"
            style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--positive)" }}>
              Sources Verified
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {d.sources_verified!.map((src, i) => (
                <span
                  key={i}
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                  style={{ background: "rgba(34,197,94,0.08)", color: "var(--positive)" }}
                >
                  {src}
                </span>
              ))}
            </div>
          </div>
        )}

        {(d.unverified_claims?.length ?? 0) > 0 && (
          <div
            className="rounded-xl border px-4 py-3"
            style={{ borderColor: "rgba(239,68,68,0.15)", background: "var(--surface)" }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#ef4444" }}>
              Unverified Claims
            </span>
            <ul className="mt-2 space-y-1">
              {d.unverified_claims!.map((claim, i) => (
                <li key={i} className="text-[11px] leading-relaxed" style={{ color: "var(--muted)" }}>
                  {claim}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </CardWrapper>
  );
}
