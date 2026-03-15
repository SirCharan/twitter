"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const THINKING_PHRASES = [
  "Stocky AI is thinking",
  "Processing your request",
  "Analyzing data",
  "Formulating response",
];

export default function TypingIndicator() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setPhraseIdx((i) => (i + 1) % THINKING_PHRASES.length), 3000);
    return () => clearInterval(id);
  }, []);

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
        {/* Animated brain/pulse icon */}
        <div className="thinking-orb relative flex h-6 w-6 shrink-0 items-center justify-center">
          <div className="thinking-ring absolute inset-0 rounded-full" />
          <div
            className="h-2 w-2 rounded-full"
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
            {THINKING_PHRASES[phraseIdx]}
          </motion.span>
        </AnimatePresence>

        {/* Typing dots */}
        <div className="flex items-center gap-1">
          <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
          <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
          <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
        </div>

        {/* Elapsed timer */}
        <span
          className="text-[10px] tabular-nums ml-1"
          style={{ color: "var(--accent-dim)" }}
        >
          {elapsed}s
        </span>
      </div>
    </motion.div>
  );
}
