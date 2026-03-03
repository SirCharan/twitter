"use client";

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

export default function ProgressCard({ title, icon, steps }: Props) {
  return (
    <div
      className="rounded-2xl border px-5 py-4"
      style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          {title}
        </span>
        <div
          className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
          style={{ background: "rgba(201,169,110,0.1)", color: "var(--accent)" }}
        >
          Researching
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            {/* Icon */}
            <div className="flex h-5 w-5 shrink-0 items-center justify-center">
              {step.status === "done" && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6.5" stroke="var(--positive)" />
                  <path d="M4 7l2 2 4-4" stroke="var(--positive)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {step.status === "running" && (
                <div
                  className="h-3.5 w-3.5 rounded-full border-2 border-transparent animate-spin"
                  style={{ borderTopColor: "var(--accent)", borderRightColor: "var(--accent)" }}
                />
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
              className="flex-1 text-xs"
              style={{
                color: step.status === "pending" ? "var(--muted)" : "var(--foreground)",
                opacity: step.status === "pending" ? 0.45 : 1,
              }}
            >
              {step.status === "running" ? (
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
            {step.status === "done" && step.elapsed != null && (
              <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)" }}>
                {step.elapsed.toFixed(1)}s
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
