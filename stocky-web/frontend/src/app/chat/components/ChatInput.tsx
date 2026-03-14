import { useState, useRef, useEffect } from "react";

export type ChatMode = "quick" | "deep";

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

export default function ChatInput({ onSend, disabled, mode, onModeChange }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="space-y-1.5">
      {/* Mode toggle */}
      <div className="flex items-center gap-1">
        <div
          className="inline-flex rounded-lg p-0.5"
          style={{ background: "var(--surface)", border: "1px solid var(--card-border)" }}
        >
          <button
            onClick={() => onModeChange("quick")}
            disabled={disabled}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-all"
            style={{
              background: mode === "quick" ? "rgba(201,169,110,0.12)" : "transparent",
              color: mode === "quick" ? "var(--accent)" : "var(--muted)",
              borderRight: "1px solid var(--card-border)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M6.5 1L2 7h3.5L5 11l5-6H6.5L7 1z"
                fill={mode === "quick" ? "var(--accent)" : "var(--muted)"}
                opacity={mode === "quick" ? 1 : 0.5}
              />
            </svg>
            Quick
          </button>
          <button
            onClick={() => onModeChange("deep")}
            disabled={disabled}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-all"
            style={{
              background: mode === "deep" ? "rgba(201,169,110,0.12)" : "transparent",
              color: mode === "deep" ? "var(--accent)" : "var(--muted)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle
                cx="6" cy="5" r="3.5"
                stroke={mode === "deep" ? "var(--accent)" : "var(--muted)"}
                strokeWidth="1.2"
                fill="none"
                opacity={mode === "deep" ? 1 : 0.5}
              />
              <path
                d="M4.5 5C4.5 5 5 6.5 6 6.5S7.5 5 7.5 5"
                stroke={mode === "deep" ? "var(--accent)" : "var(--muted)"}
                strokeWidth="0.8"
                fill="none"
                opacity={mode === "deep" ? 1 : 0.5}
              />
              <line
                x1="6" y1="8.5" x2="6" y2="11"
                stroke={mode === "deep" ? "var(--accent)" : "var(--muted)"}
                strokeWidth="1.2"
                opacity={mode === "deep" ? 1 : 0.5}
              />
            </svg>
            Deep Research
          </button>
        </div>
        {mode === "deep" && (
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: "var(--accent)", opacity: 0.7 }}
          >
            2 agents will debate
          </span>
        )}
      </div>

      {/* Input */}
      <div
        className="input-focus-ring flex items-end gap-3 rounded-2xl border px-4 py-3"
        style={{
          background: "var(--card-bg)",
          borderColor: mode === "deep" ? "rgba(201,169,110,0.3)" : "var(--card-border)",
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mode === "deep" ? "Ask anything — agents will debate this..." : "Ask Stocky anything..."}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-[var(--muted)]"
          style={{ color: "var(--foreground)" }}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all disabled:opacity-20"
          style={{ background: text.trim() ? "var(--accent)" : "var(--card-border)" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 13L13 8L3 3v4l6 1-6 1v4z"
              fill={text.trim() ? "var(--background)" : "var(--muted)"}
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
