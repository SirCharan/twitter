"use client";
import { useState, useEffect } from "react";

interface Phase {
  label: string;
  status: string;
  content?: string;
  thinking?: string;
  elapsed?: number;
}

interface Props {
  phases: Phase[];
}

const THINKING_MESSAGES = [
  ["Scanning market data...", "Analyzing fundamentals...", "Reviewing technicals...", "Processing news sentiment..."],
  ["Cross-referencing findings...", "Deep-diving into data...", "Evaluating macro trends...", "Critiquing initial analysis..."],
  ["Merging perspectives...", "Weighing both analyses...", "Building final verdict..."],
];

function useRotatingText(texts: string[], active: boolean, intervalMs = 3000) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % texts.length), intervalMs);
    return () => clearInterval(id);
  }, [active, texts.length, intervalMs]);
  return texts[index];
}

function useElapsedTimer(active: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) { setElapsed(0); return; }
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [active]);
  return elapsed;
}

function PhaseRow({ phase, index }: { phase: Phase; index: number }) {
  const isRunning = phase.status === "running";
  const isDone = phase.status === "done";
  const rotatingThinking = useRotatingText(THINKING_MESSAGES[index] || THINKING_MESSAGES[0], isRunning);
  const liveElapsed = useElapsedTimer(isRunning);

  // Preview: first meaningful line of agent response
  const preview = phase.content
    ? phase.content
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#") && !l.startsWith("---"))[0]
        ?.slice(0, 120)
    : null;

  return (
    <div className="group">
      <div className="flex items-center gap-3">
        {/* Status icon */}
        <div className="flex h-5 w-5 shrink-0 items-center justify-center">
          {isDone && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="var(--positive)" strokeWidth="1.5" />
              <path d="M5 8l2.5 2.5L11 6" stroke="var(--positive)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {isRunning && (
            <div className="relative flex h-4 w-4 items-center justify-center">
              <div
                className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
                style={{ borderTopColor: "var(--accent)", borderRightColor: "var(--accent)" }}
              />
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
            </div>
          )}
          {phase.status === "pending" && (
            <div className="h-2 w-2 rounded-full" style={{ background: "var(--card-border)" }} />
          )}
        </div>

        {/* Label */}
        <span
          className="flex-1 text-[13px] font-medium"
          style={{
            color: phase.status === "pending" ? "var(--muted)" : "var(--foreground)",
            opacity: phase.status === "pending" ? 0.4 : 1,
          }}
        >
          {phase.label}
        </span>

        {/* Elapsed time */}
        {isDone && phase.elapsed != null && (
          <span className="text-[11px] tabular-nums font-medium" style={{ color: "var(--positive)" }}>
            {phase.elapsed.toFixed(1)}s
          </span>
        )}
        {isRunning && (
          <span className="text-[11px] tabular-nums animate-pulse" style={{ color: "var(--accent)" }}>
            {liveElapsed}s
          </span>
        )}
      </div>

      {/* Thinking text (while running) */}
      {isRunning && (
        <div className="mt-1.5 ml-8 flex items-center gap-2">
          <div className="flex gap-0.5">
            <div className="typing-dot h-1 w-1 rounded-full" style={{ background: "var(--accent)" }} />
            <div className="typing-dot h-1 w-1 rounded-full" style={{ background: "var(--accent)" }} />
            <div className="typing-dot h-1 w-1 rounded-full" style={{ background: "var(--accent)" }} />
          </div>
          <span
            className="text-[11px] italic transition-opacity duration-500"
            style={{ color: "var(--muted)" }}
          >
            {phase.thinking || rotatingThinking}
          </span>
        </div>
      )}

      {/* Response preview (when done) */}
      {isDone && preview && (
        <div
          className="mt-1.5 ml-8 rounded-lg px-3 py-1.5 text-[11px] leading-relaxed"
          style={{ background: "rgba(201,169,110,0.04)", color: "var(--muted)" }}
        >
          &quot;{preview}{preview.length >= 120 ? "..." : ""}&quot;
        </div>
      )}
    </div>
  );
}

export default function DebateProgressCard({ phases }: Props) {
  const anyRunning = phases.some((p) => p.status === "running");

  return (
    <div
      className="rounded-2xl border px-5 py-4"
      style={{
        borderColor: anyRunning ? "rgba(201,169,110,0.15)" : "var(--card-border)",
        background: "var(--surface)",
      }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="var(--accent)" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Agent Debate
          </span>
        </div>
        {anyRunning && (
          <div
            className="ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{ background: "rgba(201,169,110,0.1)", color: "var(--accent)" }}
          >
            <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "var(--accent)" }} />
            Live
          </div>
        )}
      </div>

      {/* Phases */}
      <div className="space-y-3">
        {phases.map((phase, i) => (
          <PhaseRow key={i} phase={phase} index={i} />
        ))}
      </div>
    </div>
  );
}
