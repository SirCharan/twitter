"use client";
import { useState } from "react";
import AnalysisCard from "./AnalysisCard";
import CardWrapper from "./ui/CardWrapper";
import { motion } from "framer-motion";

interface Props {
  data: Record<string, unknown>;
}

export default function DeepResearchCard({ data }: Props) {
  const [expanded, setExpanded] = useState(false);
  const fullReport = data.full_report as string | undefined;
  const totalElapsed = data.total_elapsed as number | undefined;
  const mode = data.mode as string | undefined;

  return (
    <CardWrapper depth="elevated">
      {/* Header badge */}
      <div className="mb-3 flex items-center gap-2">
        <div
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-wider"
          style={{ background: "rgba(201,169,110,0.1)", color: "var(--accent)" }}
        >
          <span>🔬</span>
          Deep Research
          {mode && mode !== "full" && <span className="ml-1 opacity-60">· {mode}</span>}
        </div>
        {totalElapsed != null && (
          <span className="text-[10px]" style={{ color: "var(--muted)" }}>
            {totalElapsed.toFixed(1)}s
          </span>
        )}
      </div>

      {/* Reuse AnalysisCard for the summary */}
      <AnalysisCard data={data} />

      {/* Full report toggle */}
      {fullReport && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs underline-offset-2 hover:underline"
            style={{ color: "var(--accent)" }}
          >
            {expanded ? "Hide full report ↑" : "Read full report ↓"}
          </button>

          {expanded && (
            <div
              className="mt-3 rounded-2xl border px-5 py-4 text-xs leading-relaxed"
              style={{
                borderColor: "var(--card-border)",
                background: "var(--surface)",
                color: "var(--foreground)",
                whiteSpace: "pre-wrap",
              }}
            >
              {/* Render markdown-lite: bold and headers */}
              {fullReport.split("\n").map((line, i) => {
                if (line.startsWith("## ")) {
                  return (
                    <p key={i} className="mb-2 mt-4 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                      {line.slice(3)}
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
                if (line.trim() === "") return <div key={i} className="h-2" />;
                return (
                  <p key={i} className="mb-1" style={{ color: "var(--foreground)", opacity: 0.88 }}>
                    {line}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      )}
    </CardWrapper>
  );
}
