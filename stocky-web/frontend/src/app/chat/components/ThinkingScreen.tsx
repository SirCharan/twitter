"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  mode?: "quick" | "deep";
  intent?: string;
}

type Step = { label: string; done: boolean; active: boolean };

function getSteps(intent: string, mode: string): string[] {
  const t = intent.toLowerCase();

  if (mode === "deep") {
    return [
      "INITIALISING 3 AGENTS",
      "SCANNING NEWS FEEDS",
      "BUILDING THESIS",
      "CROSS-EXAMINING CLAIMS",
      "REBUTTAL ROUND",
      "SYNTHESISING FINAL REPORT",
    ];
  }
  if (/news/.test(t)) {
    return [
      "CONNECTING TO NEWS FEEDS",
      "FETCHING HEADLINES",
      "RUNNING SENTIMENT ANALYSIS",
      "GENERATING AI SUMMARY",
    ];
  }
  if (/analy[sz]|how is|how's/.test(t)) {
    // Try to extract a stock name from the intent
    const stockMatch = t.match(/(?:how is|how's|analyse|analyze)\s+([a-z\s&]+?)(?:\s|$)/i);
    const stock = stockMatch ? stockMatch[1].trim().toUpperCase() : "STOCK";
    return [
      `FETCHING ${stock} PRICE DATA`,
      "LOADING TECHNICAL INDICATORS",
      "ANALYSING FUNDAMENTALS",
      "CHECKING SHAREHOLDING",
      "GENERATING VERDICT",
    ];
  }
  if (/portfolio|holding|position/.test(t)) {
    return [
      "CONNECTING TO ZERODHA",
      "LOADING HOLDINGS",
      "CALCULATING P&L",
      "BUILDING REPORT",
    ];
  }
  if (/scan/.test(t)) {
    return [
      "LOADING MARKET DATA",
      "SCANNING 1,200+ STOCKS",
      "RANKING BY SIGNAL STRENGTH",
      "COMPILING RESULTS",
    ];
  }
  if (/chart/.test(t)) {
    return [
      "FETCHING OHLC DATA",
      "COMPUTING INDICATORS",
      "RENDERING CHART",
    ];
  }
  if (/macro/.test(t)) {
    return [
      "FETCHING RBI DATA",
      "LOADING FII/DII FLOWS",
      "CHECKING FOREX & COMMODITIES",
      "BUILDING MACRO DASHBOARD",
    ];
  }
  if (/overview|market/.test(t)) {
    return [
      "FETCHING INDEX DATA",
      "LOADING MARKET BREADTH",
      "SCANNING MOVERS",
      "BUILDING OVERVIEW",
    ];
  }
  if (/compare/.test(t)) {
    return [
      "FETCHING STOCK DATA",
      "SCORING FUNDAMENTALS",
      "RANKING TECHNICALS",
      "COMPARING PEERS",
    ];
  }
  if (/ipo/.test(t)) {
    return [
      "LOADING IPO CALENDAR",
      "FETCHING SUBSCRIPTION DATA",
      "CHECKING LISTING RETURNS",
    ];
  }
  if (/rrg|sector/.test(t)) {
    return [
      "LOADING SECTORAL DATA",
      "COMPUTING RRG VECTORS",
      "MAPPING ROTATION QUADRANTS",
    ];
  }
  return [
    "PROCESSING QUERY",
    "FETCHING CONTEXT",
    "FORMULATING RESPONSE",
  ];
}

// Progress stage milestones: [targetPct, delayMs]
const PROGRESS_STAGES: [number, number][] = [
  [20, 400],
  [45, 1200],
  [65, 2500],
  [80, 5000],
  [88, 10000],
];

export default function ThinkingScreen({ mode = "quick", intent = "" }: Props) {
  const steps = getSteps(intent, mode);
  const [revealedCount, setRevealedCount] = useState(1);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const stageRef = useRef(0);
  const progressRef = useRef(0);

  // Reveal steps one-by-one with ~1.8s interval
  useEffect(() => {
    if (revealedCount >= steps.length) return;
    const id = setTimeout(
      () => setRevealedCount((c) => Math.min(c + 1, steps.length)),
      1800,
    );
    return () => clearTimeout(id);
  }, [revealedCount, steps.length]);

  // Advance progress through stages
  useEffect(() => {
    function advance() {
      const stage = stageRef.current;
      if (stage >= PROGRESS_STAGES.length) return;
      const [target, delay] = PROGRESS_STAGES[stage];
      stageRef.current = stage + 1;
      const id = setTimeout(() => {
        progressRef.current = target;
        setProgress(target);
        advance();
      }, delay);
      return id;
    }
    const id = advance();
    return () => { if (id) clearTimeout(id); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Elapsed timer
  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const stepList: Step[] = steps.map((label, i) => ({
    label,
    done: i < revealedCount - 1,
    active: i === revealedCount - 1,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="terminal-scanlines rounded-2xl border overflow-hidden"
      style={{
        background: "var(--card-bg)",
        borderColor: "rgba(201,169,110,0.25)",
        fontFamily: "ui-monospace, 'Cascadia Code', 'Fira Code', monospace",
      }}
    >
      {/* Header row */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{
          borderColor: "rgba(201,169,110,0.12)",
          background: "rgba(201,169,110,0.04)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-widest" style={{ color: "var(--accent)" }}>
            &gt; STOCKY AI
          </span>
          {mode === "deep" && (
            <span
              className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest"
              style={{ background: "rgba(201,169,110,0.1)", color: "var(--accent)" }}
            >
              TRIAD
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)" }}>
            {elapsed}s
          </span>
          <span className="term-cursor" />
        </div>
      </div>

      {/* Step lines */}
      <div className="relative z-10 px-4 py-3 space-y-1.5 min-h-[88px]">
        <AnimatePresence mode="popLayout">
          {stepList.map(
            (step, i) =>
              i < revealedCount && (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-2"
                >
                  {/* Status icon */}
                  <span className="w-3 shrink-0 text-[11px]" style={{ color: step.done ? "var(--positive)" : "var(--accent)" }}>
                    {step.done ? "✓" : "▶"}
                  </span>
                  <span
                    className="text-[11px] tracking-wider"
                    style={{
                      color: step.done
                        ? "rgba(255,255,255,0.35)"
                        : step.active
                        ? "var(--accent)"
                        : "var(--muted)",
                    }}
                  >
                    {step.label}
                    {step.active && (
                      <motion.span
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        style={{ color: "var(--accent)" }}
                      >
                        ...
                      </motion.span>
                    )}
                  </span>
                </motion.div>
              ),
          )}
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="relative z-10 px-4 pb-3">
        <div className="flex items-center gap-3">
          {/* Bar track */}
          <div
            className="flex-1 rounded-full overflow-hidden"
            style={{ height: 4, background: "rgba(255,255,255,0.05)" }}
          >
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, var(--accent), var(--positive))",
                boxShadow: "0 0 8px rgba(201,169,110,0.4)",
              }}
            />
          </div>
          {/* Percentage */}
          <span
            className="text-[10px] tabular-nums font-bold tracking-wider w-8 text-right"
            style={{ color: "var(--accent)" }}
          >
            {progress}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}
