"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { track } from "@/lib/analytics";

export type ChatMode = "quick" | "deep";

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  /** Optional forwarded ref so parent (ChatWindow) can focus the textarea */
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  /** When true, shows a stop button instead of send */
  isStreaming?: boolean;
  /** Called when user clicks stop button */
  onStop?: () => void;
}

export default function ChatInput({ onSend, disabled, mode, onModeChange, textareaRef: externalRef, isStreaming, onStop }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const [rippleKey, setRippleKey] = useState(0);
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalRef ?? internalRef;
  const quickRef = useRef<HTMLButtonElement>(null);
  const deepRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      // Cap height at 40px on mobile, 60px on desktop — compact prompt
      const maxH = typeof window !== "undefined" && window.innerWidth < 768 ? 40 : 60;
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxH)}px`;
    }
  }, [text, textareaRef]);

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    track("query", "chat_message", { mode, length: trimmed.length });
    setSending(true);
    setShowCheck(true);
    setRippleKey((k) => k + 1);
    onSend(trimmed);
    setText("");
    setTimeout(() => setSending(false), 300);
    setTimeout(() => setShowCheck(false), 800);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const isDeep = mode === "deep";
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 72 });
  const toggleContainerRef = useRef<HTMLDivElement>(null);

  // Measure slider position — useLayoutEffect runs before paint for instant visual update
  const measureSlider = useCallback(() => {
    const activeRef = isDeep ? deepRef.current : quickRef.current;
    if (activeRef) {
      setSliderStyle({
        left: activeRef.offsetLeft,
        width: activeRef.offsetWidth,
      });
    }
  }, [isDeep]);

  // Primary measurement: runs synchronously before paint
  useLayoutEffect(() => {
    measureSlider();
  }, [measureSlider]);

  // Fallback: ResizeObserver recalculates if layout shifts (font loading, orientation change)
  useEffect(() => {
    const container = toggleContainerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => measureSlider());
    ro.observe(container);
    return () => ro.disconnect();
  }, [measureSlider]);

  return (
    <div className="space-y-1.5">
      {/* Mode toggle with sliding indicator */}
      <div className="flex items-center gap-2">
        <div
          ref={toggleContainerRef}
          role="group"
          aria-label="Chat mode"
          className="relative inline-flex items-center rounded-lg p-0.5 min-h-[44px]"
          style={{ background: "var(--surface)", border: "1px solid var(--card-border)" }}
        >
          {/* Sliding background indicator */}
          <motion.div
            className="absolute top-0.5 bottom-0.5 rounded-md"
            animate={{ left: sliderStyle.left, width: sliderStyle.width }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{ background: "rgba(201,169,110,0.12)" }}
          />
          <button
            ref={quickRef}
            onClick={() => { track("click", "mode_toggle", { mode: "quick" }); onModeChange("quick"); }}
            disabled={disabled}
            className="bounce-tap relative z-10 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors"
            style={{ color: !isDeep ? "var(--accent)" : "var(--muted)" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M6.5 1L2 7h3.5L5 11l5-6H6.5L7 1z"
                fill={!isDeep ? "var(--accent)" : "var(--muted)"}
                opacity={!isDeep ? 1 : 0.5}
              />
            </svg>
            Quick
          </button>
          <button
            ref={deepRef}
            onClick={() => { track("click", "mode_toggle", { mode: "deep" }); onModeChange("deep"); }}
            disabled={disabled}
            className="bounce-tap relative z-10 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors"
            style={{ color: isDeep ? "var(--accent)" : "var(--muted)" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="5" r="3.5" stroke={isDeep ? "var(--accent)" : "var(--muted)"} strokeWidth="1.2" fill="none" opacity={isDeep ? 1 : 0.5} />
              <path d="M4.5 5C4.5 5 5 6.5 6 6.5S7.5 5 7.5 5" stroke={isDeep ? "var(--accent)" : "var(--muted)"} strokeWidth="0.8" fill="none" opacity={isDeep ? 1 : 0.5} />
              <line x1="6" y1="8.5" x2="6" y2="11" stroke={isDeep ? "var(--accent)" : "var(--muted)"} strokeWidth="1.2" opacity={isDeep ? 1 : 0.5} />
            </svg>
            Deep Research
          </button>
        </div>
        <AnimatePresence>
          {isDeep && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 0.7, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="text-[10px] font-medium uppercase tracking-wider"
              style={{ color: "var(--accent)" }}
            >
              6 agents — council protocol
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div
        className="input-focus-ring flex items-end gap-2 rounded-2xl border px-3 py-1.5 sm:px-4 sm:py-3"
        style={{
          background: "var(--card-bg)",
          borderColor: isDeep ? "rgba(201,169,110,0.3)" : "var(--card-border)",
          transition: "border-color 0.25s ease",
        }}
      >
        <textarea
          ref={textareaRef as React.RefObject<HTMLTextAreaElement>}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isDeep ? "Ask anything — 6 agents will research this..." : "Ask Stocky anything..."}
          disabled={disabled}
          rows={1}
          aria-label={isDeep ? "Deep research query" : "Chat message"}
          inputMode="text"
          autoComplete="off"
          autoCorrect="on"
          autoCapitalize="sentences"
          spellCheck={true}
          // 16px minimum prevents iOS auto-zoom
          className="flex-1 resize-none bg-transparent text-base md:text-sm leading-relaxed outline-none placeholder:text-[var(--muted)]"
          style={{ color: "var(--foreground)", transition: "height 0.15s ease" }}
        />
        <AnimatePresence mode="wait">
          {isStreaming ? (
            <motion.button
              key="stop"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onStop?.()}
              aria-label="Stop generation"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all"
              style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="2" y="2" width="10" height="10" rx="2" fill="#ef4444" />
              </svg>
            </motion.button>
          ) : (
            <motion.button
              key="send"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={handleSubmit}
              disabled={disabled || !text.trim()}
              aria-label="Send message"
              data-analytics="send"
              className={`relative overflow-hidden flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all disabled:opacity-20 ${
                text.trim() && !disabled ? "send-ready" : ""
              }`}
              style={{ background: text.trim() ? "var(--accent)" : "var(--card-border)" }}
            >
              {/* Ripple burst on send */}
              <AnimatePresence>
                {rippleKey > 0 && (
                  <motion.span
                    key={rippleKey}
                    initial={{ scale: 0, opacity: 0.3 }}
                    animate={{ scale: 2.5, opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="absolute inset-0 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.4)" }}
                  />
                )}
              </AnimatePresence>
              {/* Icon: arrow or checkmark */}
              <AnimatePresence mode="wait">
                {showCheck ? (
                  <motion.svg
                    key="check"
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 45 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    width="16" height="16" viewBox="0 0 16 16" fill="none"
                  >
                    <path d="M3 8l4 4 6-7" stroke="var(--background)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </motion.svg>
                ) : (
                  <motion.svg
                    key="arrow"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    width="16" height="16" viewBox="0 0 16 16" fill="none"
                    style={{
                      transform: sending ? "rotate(45deg) scale(0.9)" : "rotate(0deg) scale(1)",
                      transition: "transform 0.3s ease",
                    }}
                  >
                    <path d="M3 13L13 8L3 3v4l6 1-6 1v4z" fill={text.trim() ? "var(--background)" : "var(--muted)"} />
                  </motion.svg>
                )}
              </AnimatePresence>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
