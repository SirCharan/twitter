"use client";
import { useRef, useEffect, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { track } from "@/lib/analytics";
import MessageBubble from "./MessageBubble";
import ChatInput, { type ChatMode } from "./ChatInput";
import TypingIndicator from "./TypingIndicator";
import FeatureBar, { type FeatureId } from "./FeatureBar";
import FeaturePanel from "./FeaturePanel";
import FeedbackModal from "./FeedbackModal";

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (text: string) => void;
  onTradeAction: (actionId: string, action: "confirm" | "cancel") => void;
  onNewChat: () => void;
  onDeepResearch?: (stock: string, mode: string) => void;
  onGeneralDeepResearch?: (query: string) => void;
}

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
    case "market_overview":
      return "how's the market";
    case "market_news":
      return "market news";
    case "portfolio":
      return "my portfolio";
    case "analyse":
      return ""; // handled separately via analyseOpen
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
    case "rrg":
      return "rrg";
    case "summarise":
      return `summarise this:\n\n${params.text}`;
  }
}

export default function ChatWindow({
  messages,
  isLoading,
  onSend,
  onTradeAction,
  onNewChat,
  onDeepResearch,
  onGeneralDeepResearch,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const stockInputRef = useRef<HTMLInputElement>(null);

  // Chat mode toggle
  const [chatMode, setChatMode] = useState<ChatMode>("quick");

  // Analyse a stock (empty state picker)
  const [analyseOpen, setAnalyseOpen] = useState(false);
  const [stockQuery, setStockQuery] = useState("");
  const [analyseMode, setAnalyseMode] = useState<AnalyseMode>("full");
  const [analyseNote, setAnalyseNote] = useState("");

  // Feature bar
  const [activeFeature, setActiveFeature] = useState<FeatureId | null>(null);
  const [featureBarVisible, setFeatureBarVisible] = useState(true);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const lastMsg = messages[messages.length - 1];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (analyseOpen) setTimeout(() => stockInputRef.current?.focus(), 50);
  }, [analyseOpen]);

  // Show feature bar again after AI responds
  useEffect(() => {
    if (lastMsg?.role === "assistant" && !isLoading) {
      setFeatureBarVisible(true);
    }
  }, [lastMsg?.role, isLoading]);

  const showEmpty = messages.length === 0 && !isLoading;

  function handleAnalyseSubmit() {
    const stock = stockQuery.trim();
    if (!stock) return;
    track("feature_use", "analyse_submit", { stock, mode: analyseMode, has_note: !!analyseNote.trim() });
    const mode = ANALYSE_MODES.find((m) => m.id === analyseMode)!;
    let msg = mode.msg(stock);
    if (analyseNote.trim()) msg += ` — ${analyseNote.trim()}`;
    onSend(msg);
    setAnalyseOpen(false);
    setStockQuery("");
    setAnalyseMode("full");
    setAnalyseNote("");
  }

  const QUICK_SEND_FEATURES = new Set(["market_overview", "market_news", "portfolio"]);

  function handleFeatureSelect(id: FeatureId | null) {
    if (!id) {
      setActiveFeature(null);
      return;
    }
    // Quick-send features — send message immediately, no panel
    if (QUICK_SEND_FEATURES.has(id)) {
      handleSend(composeFeatureMessage(id, {}));
      return;
    }
    // Analyse — open the stock picker
    if (id === "analyse") {
      setAnalyseOpen(true);
      return;
    }
    // All others — open feature panel
    setAnalyseOpen(false);
    setActiveFeature(id);
    setFeatureBarVisible(false);
  }

  function handleFeatureSend(feature: FeatureId, params: Record<string, string>) {
    track("feature_use", feature, params);
    if (feature === "deep_research" && onDeepResearch) {
      onDeepResearch(params.stock || "", params.mode || "full");
    } else {
      onSend(composeFeatureMessage(feature, params));
    }
    setActiveFeature(null);
  }

  function handleSend(text: string) {
    setActiveFeature(null);
    setFeatureBarVisible(false);
    if (chatMode === "deep" && onGeneralDeepResearch) {
      onGeneralDeepResearch(text);
    } else {
      onSend(text);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div
        className="glass flex items-center justify-between px-5 py-2 sm:py-3"
        style={{ borderBottom: "1px solid var(--card-border)" }}
      >
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="Stocky" width={22} height={22} style={{ objectFit: "contain" }} />
          <span className="text-sm font-medium tracking-wide" style={{ color: "var(--foreground)" }}>
            Stocky AI
          </span>
          <div className="h-2 w-2 rounded-full" style={{ background: "var(--positive)" }} />
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://terminal.stockyai.xyz/blog"
            target="_blank"
            rel="noopener"
            className="hidden sm:inline-flex items-center rounded px-2.5 py-1 text-[11px] font-medium tracking-wide transition-opacity hover:opacity-80"
            style={{ color: "var(--accent)", border: "1px solid rgba(201,169,110,0.3)" }}
          >
            Blog
          </a>
          <a
            href="https://chat.whatsapp.com/E2iyS3SmHcj9zJq8tUyPxk"
            target="_blank"
            rel="noopener"
            className="hidden sm:inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium tracking-wide transition-opacity hover:opacity-80"
            style={{ color: "#25D366", border: "1px solid rgba(37,211,102,0.3)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </a>
          <button
            onClick={() => { setFeedbackOpen(true); track("click", "feedback_open"); }}
            className="hidden sm:inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium tracking-wide transition-opacity hover:opacity-80"
            style={{ color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", background: "none" }}
          >
            &#9993; Feedback
          </button>
          <a
            href="https://terminal.stockyai.xyz"
            target="_blank"
            rel="noopener"
            className="hidden sm:inline-flex items-center rounded px-2.5 py-1 text-[11px] font-medium tracking-wide transition-opacity hover:opacity-80"
            style={{ color: "var(--foreground)", border: "1px solid rgba(245,240,235,0.2)" }}
          >
            Terminal
          </a>
          <button
            onClick={onNewChat}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium tracking-wide transition-all hover:opacity-90"
            style={{ background: "var(--accent)", color: "var(--background)" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 1v10M1 6h10" />
            </svg>
            New
          </button>
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

              {analyseOpen && (
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
              )}
            </div>
          </div>
        )}

        <div className="mx-auto max-w-3xl space-y-5">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} onTradeAction={onTradeAction} onSend={handleSend} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input + Feature bar + Prompt helpers */}
      <div className="px-3 pb-3 pt-1.5 sm:px-4" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}>
        <div className="mx-auto max-w-3xl">
          {/* Feature bar (above input, auto-hides after selection) */}
          <FeatureBar
            active={activeFeature}
            onSelect={handleFeatureSelect}
            disabled={isLoading}
            visible={featureBarVisible && !analyseOpen}
          />

          {/* Feature panel (expands when chip selected) */}
          {activeFeature && (
            <FeaturePanel
              feature={activeFeature}
              onClose={() => { setActiveFeature(null); setFeatureBarVisible(true); }}
              onSend={handleSend}
              onFeatureSend={handleFeatureSend}
            />
          )}

          {/* Analyse stock picker (works in both empty and message states) */}
          {analyseOpen && !showEmpty && (
            <div
              className="mb-3 rounded-2xl border p-5"
              style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
            >
              <div className="mb-4 flex items-center gap-3">
                <button
                  onClick={() => { setAnalyseOpen(false); setFeatureBarVisible(true); }}
                  className="flex items-center gap-1 text-xs hover:opacity-70"
                  style={{ color: "var(--muted)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 2L4 7l5 5" />
                  </svg>
                  back
                </button>
                <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                  🔍 Analyse a stock
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

              <div className="mt-3 flex flex-wrap gap-2">
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
          )}

          <ChatInput onSend={handleSend} disabled={isLoading} mode={chatMode} onModeChange={setChatMode} />
        </div>
      </div>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}
