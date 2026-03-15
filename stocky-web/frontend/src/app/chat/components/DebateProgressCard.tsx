"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Phase {
  label: string;
  status: string;
  agent?: string;
  content?: string;
  thinking?: string;
  elapsed?: number;
  silas_final?: string;
}

interface Props {
  phases: Phase[];
}

const AGENT_META: Record<string, { icon: string; name: string; color: string }> = {
  nexus: { icon: "\u2726", name: "Nexus", color: "var(--accent)" },
  aris:  { icon: "\uD83D\uDD2C", name: "Dr. Aris Thorne", color: "#60a5fa" },
  silas: { icon: "\u2694\uFE0F", name: "Silas Vance", color: "#f87171" },
};

const THINKING_MESSAGES: Record<string, string[]> = {
  briefing:   ["Analyzing the query...", "Defining research scope...", "Assigning focus areas..."],
  thesis:     ["Scanning market data...", "Building evidence base...", "Structuring thesis...", "Assessing confidence levels..."],
  cross_exam: ["Scrutinizing claims...", "Checking data sources...", "Finding weaknesses...", "Rating evidence quality..."],
  rebuttal:   ["Defending key points...", "Conceding valid challenges...", "Updating confidence...", "Preparing final assessment..."],
  synthesis:  ["Verifying all claims...", "Weighing both perspectives...", "Calculating confidence score...", "Building final report..."],
};

const PHASE_IDS = ["briefing", "thesis", "cross_exam", "rebuttal", "synthesis"];

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
  const phaseId = PHASE_IDS[index] || "briefing";
  const agentKey = phase.agent || (index === 0 || index === 4 ? "nexus" : index === 2 ? "silas" : "aris");
  const meta = AGENT_META[agentKey] || AGENT_META.nexus;
  const thinkingTexts = THINKING_MESSAGES[phaseId] || THINKING_MESSAGES.briefing;
  const rotatingThinking = useRotatingText(thinkingTexts, isRunning);
  const liveElapsed = useElapsedTimer(isRunning);

  const preview = phase.content
    ? phase.content
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#") && !l.startsWith("---"))[0]
        ?.slice(0, 120)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 300, damping: 30 }}
      className="group"
    >
      <div className="flex items-center gap-3">
        {/* Status icon */}
        <div className="flex h-5 w-5 shrink-0 items-center justify-center">
          <AnimatePresence mode="wait">
            {isDone && (
              <motion.div
                key="done"
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="var(--positive)" strokeWidth="1.5" />
                  <path d="M5 8l2.5 2.5L11 6" stroke="var(--positive)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
            )}
            {isRunning && (
              <motion.div
                key="running"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative flex h-4 w-4 items-center justify-center"
              >
                <div
                  className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
                  style={{ borderTopColor: meta.color, borderRightColor: meta.color }}
                />
                <div className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
              </motion.div>
            )}
            {phase.status === "pending" && (
              <motion.div key="pending" className="h-2 w-2 rounded-full" style={{ background: "var(--card-border)" }} />
            )}
          </AnimatePresence>
        </div>

        {/* Agent icon + name + label */}
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <span className="text-xs shrink-0">{meta.icon}</span>
          <span
            className="text-[11px] font-semibold shrink-0"
            style={{ color: meta.color, opacity: phase.status === "pending" ? 0.4 : 1 }}
          >
            {meta.name}
          </span>
          <span
            className="text-[12px] font-medium truncate"
            style={{
              color: phase.status === "pending" ? "var(--muted)" : "var(--foreground)",
              opacity: phase.status === "pending" ? 0.4 : 0.7,
            }}
          >
            {phase.label}
          </span>
        </div>

        {/* Elapsed time */}
        {isDone && phase.elapsed != null && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-[11px] tabular-nums font-medium shrink-0"
            style={{ color: "var(--positive)" }}
          >
            {phase.elapsed.toFixed(1)}s
          </motion.span>
        )}
        {isRunning && (
          <span className="text-[11px] tabular-nums animate-pulse shrink-0" style={{ color: meta.color }}>
            {liveElapsed}s
          </span>
        )}
      </div>

      {/* Live thinking text (while running) */}
      <AnimatePresence>
        {isRunning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-1.5 ml-8 flex items-center gap-2"
          >
            <div className="flex gap-0.5">
              <div className="typing-dot h-1 w-1 rounded-full" style={{ background: meta.color }} />
              <div className="typing-dot h-1 w-1 rounded-full" style={{ background: meta.color }} />
              <div className="typing-dot h-1 w-1 rounded-full" style={{ background: meta.color }} />
            </div>
            <span
              className="text-[11px] italic"
              style={{ color: "var(--muted)" }}
            >
              {phase.thinking || rotatingThinking}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Response preview (when done) */}
      <AnimatePresence>
        {isDone && preview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-1.5 ml-8 rounded-lg px-3 py-1.5 text-[11px] leading-relaxed"
            style={{ background: `${meta.color}08`, color: "var(--muted)" }}
          >
            &quot;{preview}{preview.length >= 120 ? "..." : ""}&quot;
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function DebateProgressCard({ phases }: Props) {
  const anyRunning = phases.some((p) => p.status === "running");
  const doneCount = phases.filter((p) => p.status === "done").length;
  const progress = phases.length > 0 ? (doneCount / phases.length) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="rounded-2xl border px-5 py-4"
      style={{
        borderColor: anyRunning ? "rgba(201,169,110,0.15)" : "var(--card-border)",
        background: "var(--surface)",
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="var(--accent)" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Triad Deep Research
          </span>
        </div>
        <AnimatePresence mode="wait">
          {anyRunning && (
            <motion.div
              key="live"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{ background: "rgba(201,169,110,0.1)", color: "var(--accent)" }}
            >
              <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "var(--accent)" }} />
              Live
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Overall progress bar */}
      <div
        className="mb-4 h-0.5 w-full overflow-hidden rounded-full"
        style={{ background: "var(--card-border)" }}
      >
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            background: progress >= 100
              ? "var(--positive)"
              : "linear-gradient(90deg, var(--accent-dim), var(--accent))",
          }}
        />
      </div>

      {/* Phases */}
      <div className="space-y-3">
        {phases.map((phase, i) => (
          <PhaseRow key={i} phase={phase} index={i} />
        ))}
      </div>
    </motion.div>
  );
}
