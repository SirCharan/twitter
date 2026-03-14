"use client";
import { useState } from "react";

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

function MarkdownLite({ text }: { text: string }) {
  return (
    <div className="space-y-1">
      {text.split("\n").map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <p key={i} className="mb-2 mt-4 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              {line.slice(3)}
            </p>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <p key={i} className="mb-1 mt-3 text-xs font-semibold" style={{ color: "var(--foreground)" }}>
              {line.slice(4)}
            </p>
          );
        }
        if (line.startsWith("**") && line.endsWith("**")) {
          return (
            <p key={i} className="mb-1 font-medium" style={{ color: "var(--accent)" }}>
              {line.slice(2, -2)}
            </p>
          );
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <p key={i} className="mb-0.5 pl-3" style={{ color: "var(--foreground)", opacity: 0.88 }}>
              <span style={{ color: "var(--accent)", marginRight: 6 }}>-</span>
              {line.slice(2)}
            </p>
          );
        }
        if (line.trim() === "") return <div key={i} className="h-2" />;
        return (
          <p key={i} className="mb-0.5" style={{ color: "var(--foreground)", opacity: 0.88 }}>
            {line}
          </p>
        );
      })}
    </div>
  );
}

function AgentSection({
  title,
  model,
  elapsed,
  content,
  defaultOpen,
  accentColor,
}: {
  title: string;
  model: string;
  elapsed: number;
  content: string;
  defaultOpen: boolean;
  accentColor: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="rounded-xl border"
      style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: accentColor }}
        />
        <span className="flex-1 text-xs font-medium" style={{ color: "var(--foreground)" }}>
          {title}
        </span>
        <span className="text-[10px] font-medium" style={{ color: "var(--muted)" }}>
          {model}
        </span>
        <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)" }}>
          {elapsed.toFixed(1)}s
        </span>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className="shrink-0 transition-transform"
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
          <MarkdownLite text={content} />
        </div>
      )}
    </div>
  );
}

export default function AgentDebateCard({ data }: Props) {
  const d = data as unknown as DebateData;

  return (
    <div>
      {/* Header badge */}
      <div className="mb-3 flex items-center gap-2">
        <div
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-wider"
          style={{ background: "rgba(201,169,110,0.1)", color: "var(--accent)" }}
        >
          Agent Debate
        </div>
        <span className="text-[10px]" style={{ color: "var(--muted)" }}>
          {d.total_elapsed.toFixed(1)}s total
        </span>
      </div>

      {/* Synthesis — main answer */}
      <div
        className="mb-3 rounded-2xl border px-5 py-4"
        style={{ borderColor: "rgba(201,169,110,0.2)", background: "var(--card-bg)" }}
      >
        <p
          className="mb-3 text-[10px] font-medium uppercase tracking-wider"
          style={{ color: "var(--accent)" }}
        >
          Final Synthesis
        </p>
        <div className="text-xs leading-relaxed">
          <MarkdownLite text={d.synthesis} />
        </div>
      </div>

      {/* Agent sections (collapsed by default) */}
      <div className="space-y-2">
        <AgentSection
          title="Quick Agent"
          model={d.agent_a.model}
          elapsed={d.agent_a.elapsed}
          content={d.agent_a.response}
          defaultOpen={false}
          accentColor="var(--positive)"
        />
        {d.agent_b && (
          <AgentSection
            title="Deep Agent"
            model={d.agent_b.model}
            elapsed={d.agent_b.elapsed}
            content={d.agent_b.response}
            defaultOpen={false}
            accentColor="#6366f1"
          />
        )}
      </div>
    </div>
  );
}
