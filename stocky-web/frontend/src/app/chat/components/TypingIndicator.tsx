"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const QUICK_PHRASES = [
  "Scanning market data",
  "Pulling live quotes",
  "Checking technicals",
  "Processing signals",
  "Formulating response",
  "Crunching numbers",
  "Reading charts",
  "Analysing context",
];

const DEEP_PHRASES = [
  "Initialising 3 agents",
  "Cross-referencing sources",
  "Building research brief",
  "Synthesising findings",
  "Debating positions",
  "Stress-testing thesis",
  "Consolidating insights",
  "Preparing final report",
];

interface Props {
  mode?: "quick" | "deep";
}

export default function TypingIndicator({ mode = "quick" }: Props) {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const phrases = mode === "deep" ? DEEP_PHRASES : QUICK_PHRASES;

  useEffect(() => {
    setPhraseIdx(0);
    setElapsed(0);
  }, [mode]);

  useEffect(() => {
    const id = setInterval(() => setPhraseIdx((i) => (i + 1) % phrases.length), 3000);
    return () => clearInterval(id);
  }, [phrases.length]);

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="flex items-center gap-1"
    >
      <div
        className="thinking-container flex items-center gap-3 rounded-2xl px-5 py-3"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
      >
        {/* Animated orb with secondary ring */}
        <div className="relative flex h-7 w-7 shrink-0 items-center justify-center">
          <div className="thinking-ring absolute inset-0 rounded-full" />
          {/* Secondary ring at offset phase */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{ scale: [1, 1.6, 1], opacity: [0.15, 0, 0.15] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
            style={{ border: "1px solid var(--accent)" }}
          />
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: "var(--accent)" }}
          />
        </div>

        {/* Rotating phrase */}
        <AnimatePresence mode="wait">
          <motion.span
            key={phraseIdx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="text-xs tracking-wide"
            style={{ color: "var(--muted)" }}
          >
            {phrases[phraseIdx]}
          </motion.span>
        </AnimatePresence>

        {/* Typing dots */}
        <div className="flex items-center gap-1">
          <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
          <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
          <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
        </div>

        {/* Elapsed timer — show helper text for deep mode when long */}
        <span
          className="text-[10px] tabular-nums ml-1"
          style={{ color: "var(--accent-dim)" }}
        >
          {elapsed}s
        </span>
        {mode === "deep" && elapsed > 5 && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            className="text-[10px] ml-0.5"
            style={{ color: "var(--muted)" }}
          >
            · usually 30–60s
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}
