"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { track } from "@/lib/analytics";

export type ChatMode = "quick" | "deep";

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

export default function ChatInput({ onSend, disabled, mode, onModeChange }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const quickRef = useRef<HTMLButtonElement>(null);
  const deepRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    track("query", "chat_message", { mode, length: trimmed.length });
    setSending(true);
    onSend(trimmed);
    setText("");
    setTimeout(() => setSending(false), 300);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  // Calculate slider position based on active mode
  const isDeep = mode === "deep";
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 72 });

  useEffect(() => {
    const activeRef = isDeep ? deepRef.current : quickRef.current;
    if (activeRef) {
      setSliderStyle({
        left: activeRef.offsetLeft,
        width: activeRef.offsetWidth,
      });
    }
  }, [isDeep]);

  return (
    <div className="space-y-1.5">
      {/* Mode toggle with sliding indicator */}
      <div className="flex items-center gap-2">
        <div
          role="group"
          aria-label="Chat mode"
          className="relative inline-flex rounded-lg p-0.5"
          style={{ background: "var(--surface)", border: "1px solid var(--card-border)" }}
        >
          {/* Sliding background indicator */}
          <motion.div
            className="absolute top-0.5 bottom-0.5 rounded-md"
            animate={{ left: sliderStyle.left, width: sliderStyle.width }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              background: "rgba(201,169,110,0.12)",
            }}
          />
          <button
            ref={quickRef}
            onClick={() => { track("click", "mode_toggle", { mode: "quick" }); onModeChange("quick"); }}
            disabled={disabled}
            className="bounce-tap relative z-10 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors"
            style={{
              color: !isDeep ? "var(--accent)" : "var(--muted)",
            }}
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
            style={{
              color: isDeep ? "var(--accent)" : "var(--muted)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle
                cx="6" cy="5" r="3.5"
                stroke={isDeep ? "var(--accent)" : "var(--muted)"}
                strokeWidth="1.2"
                fill="none"
                opacity={isDeep ? 1 : 0.5}
              />
              <path
                d="M4.5 5C4.5 5 5 6.5 6 6.5S7.5 5 7.5 5"
                stroke={isDeep ? "var(--accent)" : "var(--muted)"}
                strokeWidth="0.8"
                fill="none"
                opacity={isDeep ? 1 : 0.5}
              />
              <line
                x1="6" y1="8.5" x2="6" y2="11"
                stroke={isDeep ? "var(--accent)" : "var(--muted)"}
                strokeWidth="1.2"
                opacity={isDeep ? 1 : 0.5}
              />
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
              3 agents — triad protocol
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div
        className="input-focus-ring flex items-end gap-3 rounded-2xl border px-4 py-3"
        style={{
          background: "var(--card-bg)",
          borderColor: isDeep ? "rgba(201,169,110,0.3)" : "var(--card-border)",
          transition: "border-color 0.25s ease",
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isDeep ? "Ask anything — 3 agents will research this..." : "Ask Stocky anything..."}
          disabled={disabled}
          rows={1}
          aria-label={isDeep ? "Deep research query" : "Chat message"}
          className="flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-[var(--muted)]"
          style={{ color: "var(--foreground)", transition: "height 0.15s ease" }}
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          aria-label="Send message"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all disabled:opacity-20 ${
            text.trim() && !disabled ? "send-ready" : ""
          }`}
          style={{ background: text.trim() ? "var(--accent)" : "var(--card-border)" }}
        >
          <svg
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            style={{
              transition: "transform 0.3s ease",
              transform: sending ? "rotate(45deg) scale(0.9)" : "rotate(0deg) scale(1)",
            }}
          >
            <path
              d="M3 13L13 8L3 3v4l6 1-6 1v4z"
              fill={text.trim() ? "var(--background)" : "var(--muted)"}
            />
          </svg>
        </motion.button>
      </div>
    </div>
  );
}
