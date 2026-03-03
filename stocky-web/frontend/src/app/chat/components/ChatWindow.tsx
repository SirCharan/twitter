"use client";
import { useRef, useEffect, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import TypingIndicator from "./TypingIndicator";
import FeatureBar, { type FeatureId } from "./FeatureBar";
import FeaturePanel from "./FeaturePanel";

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (text: string) => void;
  onTradeAction: (actionId: string, action: "confirm" | "cancel") => void;
  onMenuClick: () => void;
}

const QUICK_ACTIONS = [
  { label: "Market overview", text: "how's the market" },
  { label: "Check portfolio", text: "my portfolio" },
  { label: "Latest news",     text: "market news" },
];

const ANALYSE_MODES = [
  { id: "full",       label: "Full Analysis", msg: (s: string) => `how is ${s} doing` },
  { id: "news",       label: "News",          msg: (s: string) => `${s} latest news` },
  { id: "financials", label: "Financials",    msg: (s: string) => `${s} quarterly results and financials` },
  { id: "technical",  label: "Technical",     msg: (s: string) => `${s} technical analysis` },
] as const;
type AnalyseMode = typeof ANALYSE_MODES[number]["id"];

/** Compose the chat message for each feature */
function composeFeatureMessage(feature: FeatureId, params: Record<string, string>): string {
  switch (feature) {
    case "deep_research": {
      const mode = params.mode ?? "full";
      const modeLabel: Record<string, string> = {
        full: "full deep research report",
        news: "deep research focusing on news and sentiment",
        broker: "deep research focusing on broker recommendations",
        technical: "deep research focusing on technical analysis",
      };
      return `deep research on ${params.stock} — ${modeLabel[mode] ?? "full report"}`;
    }
    case "scan":
      return `market scan — ${params.scan?.replace(/_/g, " ") ?? "volume pump"}`;
    case "chart":
      return `${params.type === "analysis" ? "analysis chart" : "chart"} for ${params.stock}`;
    case "compare":
      return `compare stocks: ${params.stocks}`;
    case "ipo":
      return "ipo tracker";
    case "macro":
      return "macro dashboard";
    case "summarise":
      return `summarise this:\n\n${params.text}`;
  }
}

export default function ChatWindow({
  messages,
  isLoading,
  onSend,
  onTradeAction,
  onMenuClick,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const stockInputRef = useRef<HTMLInputElement>(null);

  // Analyse a stock (empty state picker)
  const [analyseOpen, setAnalyseOpen] = useState(false);
  const [stockQuery, setStockQuery] = useState("");
  const [analyseMode, setAnalyseMode] = useState<AnalyseMode>("full");
  const [analyseNote, setAnalyseNote] = useState("");

  // Feature bar
  const [activeFeature, setActiveFeature] = useState<FeatureId | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (analyseOpen) setTimeout(() => stockInputRef.current?.focus(), 50);
  }, [analyseOpen]);

  const showEmpty = messages.length === 0 && !isLoading;

  function handleAnalyseSubmit() {
    const stock = stockQuery.trim();
    if (!stock) return;
    const mode = ANALYSE_MODES.find((m) => m.id === analyseMode)!;
    let msg = mode.msg(stock);
    if (analyseNote.trim()) msg += ` — ${analyseNote.trim()}`;
    onSend(msg);
    setAnalyseOpen(false);
    setStockQuery("");
    setAnalyseMode("full");
    setAnalyseNote("");
  }

  function handleFeatureSend(feature: FeatureId, params: Record<string, string>) {
    onSend(composeFeatureMessage(feature, params));
    setActiveFeature(null);
  }

  function handleSend(text: string) {
    setActiveFeature(null);
    onSend(text);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div
        className="glass flex items-center gap-3 px-5 py-3"
        style={{ borderBottom: "1px solid var(--card-border)" }}
      >
        <button onClick={onMenuClick} className="md:hidden" style={{ color: "var(--muted)" }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 5h14M3 10h14M3 15h14" />
          </svg>
        </button>
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="Stocky" width={22} height={22} style={{ objectFit: "contain" }} />
          <span className="text-sm font-medium tracking-wide" style={{ color: "var(--foreground)" }}>
            Stocky AI
          </span>
          <div className="h-2 w-2 rounded-full" style={{ background: "var(--positive)" }} />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {showEmpty && (
          <div className="flex h-full flex-col items-center justify-center">
            <div
              className="pointer-events-none absolute"
              style={{
                width: 500, height: 500,
                background: "radial-gradient(circle, rgba(201,169,110,0.03) 0%, transparent 70%)",
              }}
            />
            <div className="relative w-full max-w-sm text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-mark.png" alt="Stocky" width={56} height={56}
                className="mx-auto mb-4" style={{ objectFit: "contain", opacity: 0.85 }}
              />
              <p className="gradient-text-shimmer text-3xl font-light tracking-widest">Stocky</p>
              <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
                Your AI trading assistant. Ask me anything.
              </p>

              {analyseOpen ? (
                /* Grok-style stock picker */
                <div
                  className="mt-8 rounded-2xl border p-5 text-left"
                  style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <button
                      onClick={() => setAnalyseOpen(false)}
                      className="flex items-center gap-1 text-xs hover:opacity-70"
                      style={{ color: "var(--muted)" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M9 2L4 7l5 5" />
                      </svg>
                      back
                    </button>
                    <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                      Analyse a stock
                    </span>
                  </div>

                  <input
                    ref={stockInputRef}
                    type="text"
                    value={stockQuery}
                    onChange={(e) => setStockQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAnalyseSubmit()}
                    placeholder="e.g. Reliance, TCS, HDFC Bank..."
                    className="w-full rounded-xl border bg-transparent px-4 py-3 text-sm outline-none"
                    style={{ borderColor: stockQuery ? "var(--accent)" : "var(--card-border)", color: "var(--foreground)" }}
                  />

                  <div className="mt-4 flex flex-wrap gap-2">
                    {ANALYSE_MODES.map((m) => {
                      const sel = analyseMode === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => setAnalyseMode(m.id)}
                          className="rounded-full border px-3 py-1.5 text-xs font-medium transition-all"
                          style={{
                            borderColor: sel ? "var(--accent)" : "var(--card-border)",
                            background: sel ? "rgba(201,169,110,0.08)" : "transparent",
                            color: sel ? "var(--accent)" : "var(--muted)",
                          }}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>

                  <textarea
                    value={analyseNote}
                    onChange={(e) => setAnalyseNote(e.target.value)}
                    placeholder="Add a custom note… (optional)"
                    rows={2}
                    className="mt-4 w-full resize-none rounded-xl border bg-transparent px-4 py-3 text-xs outline-none"
                    style={{ borderColor: "var(--card-border)", color: "var(--foreground)" }}
                  />

                  <button
                    onClick={handleAnalyseSubmit}
                    disabled={!stockQuery.trim()}
                    className="mt-4 w-full rounded-xl py-3 text-sm font-medium transition-all"
                    style={{
                      background: stockQuery.trim() ? "var(--accent)" : "var(--card-border)",
                      color: stockQuery.trim() ? "#0A0A0A" : "var(--muted)",
                      cursor: stockQuery.trim() ? "pointer" : "not-allowed",
                    }}
                  >
                    Analyse →
                  </button>
                </div>
              ) : (
                /* Quick action chips */
                <div className="mt-8 flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => setAnalyseOpen(true)}
                    className="suggestion-chip rounded-full border px-4 py-2 text-xs"
                    style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "rgba(201,169,110,0.06)" }}
                  >
                    Analyse a stock
                  </button>
                  {QUICK_ACTIONS.map((s) => (
                    <button
                      key={s.text}
                      onClick={() => handleSend(s.text)}
                      className="suggestion-chip rounded-full border px-4 py-2 text-xs"
                      style={{ borderColor: "var(--card-border)", color: "var(--foreground)", background: "transparent" }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mx-auto max-w-3xl space-y-5">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} onTradeAction={onTradeAction} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input + Feature bar */}
      <div className="px-4 pb-4 pt-2">
        <div className="mx-auto max-w-3xl">
          {/* Feature panel (slide up above input) */}
          {activeFeature && (
            <FeaturePanel
              feature={activeFeature}
              onClose={() => setActiveFeature(null)}
              onSend={handleSend}
              onFeatureSend={handleFeatureSend}
            />
          )}

          <ChatInput onSend={handleSend} disabled={isLoading} />

          <FeatureBar
            active={activeFeature}
            onSelect={setActiveFeature}
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
