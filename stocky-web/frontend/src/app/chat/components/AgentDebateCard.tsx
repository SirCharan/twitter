"use client";
import React, { useState } from "react";
import MarkdownRich from "./MarkdownRich";

interface AgentData {
  model: string;
  response: string;
  elapsed: number;
}

interface DebateData {
  query: string;
  agent_a: AgentData;
  agent_b: AgentData | null;
  synthesis: string;
  synthesis_elapsed: number;
  total_elapsed: number;
}

interface Props {
  data: Record<string, unknown>;
}

/* ── Collapsible agent section ── */
function AgentSection({
  title,
  model,
  elapsed,
  content,
  accentColor,
  icon,
}: {
  title: string;
  model: string;
  elapsed: number;
  content: string;
  accentColor: string;
  icon: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-xl border transition-colors"
      style={{ borderColor: open ? "rgba(201,169,110,0.12)" : "var(--card-border)", background: "var(--surface)" }}
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
          {model}
        </span>
        <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)" }}>
          {elapsed.toFixed(1)}s
        </span>
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
          <MarkdownRich text={content} />
        </div>
      )}
    </div>
  );
}

/* ── Main card ── */
export default function AgentDebateCard({ data }: Props) {
  const d = data as unknown as DebateData;

  return (
    <div className="max-w-full">
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
            Stocky AI Debate
          </span>
        </div>
        <div className="divider-gradient flex-1" />
        <span className="text-[10px] tabular-nums font-medium" style={{ color: "var(--muted)" }}>
          {d.total_elapsed.toFixed(1)}s
        </span>
      </div>

      {/* Synthesis — main answer */}
      <div
        className="mb-4 rounded-2xl border px-4 py-4 sm:px-5"
        style={{
          borderColor: "rgba(201,169,110,0.12)",
          background: "linear-gradient(135deg, rgba(201,169,110,0.03) 0%, var(--card-bg) 100%)",
        }}
      >
        <div className="mb-3 flex items-center gap-2">
          <div className="h-1 w-6 rounded-full" style={{ background: "var(--accent)" }} />
          <span
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--accent)" }}
          >
            Final Synthesis
          </span>
          <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)" }}>
            {d.synthesis_elapsed.toFixed(1)}s
          </span>
        </div>
        <div className="text-xs leading-relaxed">
          <MarkdownRich text={d.synthesis} />
        </div>
      </div>

      {/* Agent sections (collapsed by default) */}
      <div className="space-y-2">
        <AgentSection
          title="Stocky Quick"
          icon="⚡"
          model={d.agent_a.model}
          elapsed={d.agent_a.elapsed}
          content={d.agent_a.response}
          accentColor="var(--positive)"
        />
        {d.agent_b && (
          <AgentSection
            title="Stocky Deep"
            icon="🔬"
            model={d.agent_b.model}
            elapsed={d.agent_b.elapsed}
            content={d.agent_b.response}
            accentColor="#818cf8"
          />
        )}
      </div>
    </div>
  );
}
