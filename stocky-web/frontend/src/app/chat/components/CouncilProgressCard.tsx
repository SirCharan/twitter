"use client";

import { motion, AnimatePresence } from "framer-motion";
import CardWrapper from "./ui/CardWrapper";

interface AgentMeta {
  name: string;
  short: string;
  icon: string;
  color: string;
  skills: string[];
}

interface StepData {
  step: number;
  label: string;
  agent: string | null;
  status: "pending" | "running" | "done";
  content?: string;
  elapsed?: number;
  thinking?: string;
}

interface Props {
  data: Record<string, unknown>;
}

const ROUND_LABELS: Record<number, string> = {
  1: "Intelligence Gathering",
  2: "Debate & Rebuttals",
  3: "Final Verdict",
};

export default function CouncilProgressCard({ data }: Props) {
  const agents = (data?.agents as AgentMeta[]) || [];
  const steps = (data?.steps as StepData[]) || [];
  const currentRound = (data?.currentRound as number) || 1;
  const currentStep = (data?.currentStep as number) || 1;

  const doneCount = steps.filter((s) => s.status === "done").length;
  const progressPct = Math.round((doneCount / Math.max(steps.length, 1)) * 100);

  // Find which agent is currently active
  const runningStep = steps.find((s) => s.status === "running");
  const activeAgent = runningStep?.agent;

  return (
    <CardWrapper depth="elevated">
      <div className="space-y-3 p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🏛️</span>
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--accent)" }}
            >
              Stocky Council
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <motion.div
              className="h-2 w-2 rounded-full"
              style={{ background: "#22c55e" }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[10px] font-medium" style={{ color: "#22c55e" }}>
              LIVE
            </span>
          </div>
        </div>

        {/* Agent Avatars */}
        {agents.length > 0 && (
          <div className="flex items-center gap-1.5">
            {agents.map((agent) => (
              <motion.div
                key={agent.short}
                className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium"
                style={{
                  background: activeAgent === agent.short ? agent.color + "22" : "transparent",
                  border: `1px solid ${activeAgent === agent.short ? agent.color : "var(--card-border)"}`,
                  color: activeAgent === agent.short ? agent.color : "var(--muted)",
                }}
                animate={activeAgent === agent.short ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <span>{agent.icon}</span>
                <span>{agent.short}</span>
              </motion.div>
            ))}
          </div>
        )}

        {/* Round + Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span style={{ color: "var(--muted)" }}>
              Round {currentRound} of 3: {ROUND_LABELS[currentRound] || ""}
            </span>
            <span style={{ color: "var(--muted)" }}>
              Step {Math.min(currentStep, steps.length)}/{steps.length}
            </span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full"
            style={{ background: "var(--card-border)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: "var(--accent)" }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-0.5">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5"
              style={{
                background: step.status === "running" ? "rgba(201,169,110,0.06)" : "transparent",
              }}
            >
              {/* Status icon */}
              <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                {step.status === "done" ? (
                  <motion.svg
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    width="14" height="14" viewBox="0 0 14 14" fill="none"
                  >
                    <circle cx="7" cy="7" r="7" fill="var(--positive)" opacity={0.15} />
                    <path d="M4 7l2 2 4-4" stroke="var(--positive)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </motion.svg>
                ) : step.status === "running" ? (
                  <motion.div
                    className="h-3 w-3 rounded-full"
                    style={{ border: "2px solid var(--accent)" }}
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                ) : (
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: "var(--card-border)" }}
                  />
                )}
              </div>

              {/* Step label */}
              <span
                className="flex-1 text-xs"
                style={{
                  color: step.status === "done"
                    ? "var(--muted)"
                    : step.status === "running"
                      ? "var(--foreground)"
                      : "var(--card-border)",
                }}
              >
                {step.step}. {step.label}
              </span>

              {/* Agent badge */}
              {step.agent && (
                <span
                  className="rounded px-1.5 py-0.5 text-[9px] font-bold"
                  style={{
                    background: (agents.find((a) => a.short === step.agent)?.color || "var(--muted)") + "18",
                    color: agents.find((a) => a.short === step.agent)?.color || "var(--muted)",
                    opacity: step.status === "pending" ? 0.4 : 1,
                  }}
                >
                  {step.agent}
                </span>
              )}

              {/* Elapsed */}
              {step.elapsed != null && (
                <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)" }}>
                  {step.elapsed}s
                </span>
              )}
            </motion.div>
          ))}
        </div>

        {/* Thinking text for running step */}
        <AnimatePresence>
          {runningStep?.thinking && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 0.6, y: 0 }}
              exit={{ opacity: 0 }}
              className="pl-9 text-[10px] italic"
              style={{ color: "var(--accent)" }}
            >
              {runningStep.thinking}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </CardWrapper>
  );
}
