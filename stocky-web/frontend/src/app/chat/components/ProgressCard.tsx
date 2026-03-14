"use client";
import { useState, useEffect } from "react";

export interface ProgressStep {
  label: string;
  status: "pending" | "running" | "done";
  elapsed?: number; // seconds
}

interface Props {
  title: string;
  icon: string;
  steps: ProgressStep[];
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

function StepRow({ step }: { step: ProgressStep }) {
  const isRunning = step.status === "running";
  const isDone = step.status === "done";
  const liveElapsed = useElapsedTimer(isRunning);

  return (
    <div
      className="flex items-center gap-3 transition-all duration-300"
      style={{
        opacity: step.status === "pending" ? 0.35 : 1,
        transform: isRunning ? "translateX(4px)" : "translateX(0)",
      }}
    >
      {/* Icon */}
      <div className="flex h-5 w-5 shrink-0 items-center justify-center">
        {isDone && (
          <div className="step-check-enter">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6.5" stroke="var(--positive)" />
              <path d="M4 7l2 2 4-4" stroke="var(--positive)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
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
        {step.status === "pending" && (
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--card-border)" }}
          />
        )}
      </div>

      {/* Label */}
      <span
        className="flex-1 text-xs transition-colors duration-300"
        style={{
          color: step.status === "pending" ? "var(--muted)" : "var(--foreground)",
        }}
      >
        {isRunning ? (
          <>
            {step.label}
            <span className="ml-1 animate-pulse" style={{ color: "var(--accent)" }}>
              ...
            </span>
          </>
        ) : (
          step.label
        )}
      </span>

      {/* Elapsed */}
      {isDone && step.elapsed != null && (
        <span className="step-check-enter text-[10px] tabular-nums" style={{ color: "var(--positive)" }}>
          {step.elapsed.toFixed(1)}s
        </span>
      )}
      {isRunning && (
        <span className="text-[10px] tabular-nums animate-pulse" style={{ color: "var(--accent)" }}>
          {liveElapsed}s
        </span>
      )}
    </div>
  );
}

export default function ProgressCard({ title, icon, steps }: Props) {
  const anyRunning = steps.some((s) => s.status === "running");
  const doneCount = steps.filter((s) => s.status === "done").length;
  const progress = steps.length > 0 ? (doneCount / steps.length) * 100 : 0;

  return (
    <div
      className="rounded-2xl border px-5 py-4 transition-colors duration-300"
      style={{
        borderColor: anyRunning ? "rgba(201,169,110,0.15)" : "var(--card-border)",
        background: "var(--surface)",
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          {title}
        </span>
        {anyRunning && (
          <div
            className="ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{ background: "rgba(201,169,110,0.1)", color: "var(--accent)" }}
          >
            <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "var(--accent)" }} />
            Researching
          </div>
        )}
        {!anyRunning && doneCount === steps.length && doneCount > 0 && (
          <div
            className="ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider step-check-enter"
            style={{ background: "rgba(34,197,94,0.1)", color: "var(--positive)" }}
          >
            Complete
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div
        className="mb-4 h-0.5 w-full overflow-hidden rounded-full"
        style={{ background: "var(--card-border)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            background: progress >= 100
              ? "var(--positive)"
              : "linear-gradient(90deg, var(--accent-dim), var(--accent))",
          }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2.5">
        {steps.map((step, i) => (
          <StepRow key={i} step={step} />
        ))}
      </div>
    </div>
  );
}
