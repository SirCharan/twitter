"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatMessage } from "@/lib/types";
import { track } from "@/lib/analytics";
import MessageBubble from "./MessageBubble";
import ChatInput, { type ChatMode } from "./ChatInput";
import TypingIndicator from "./TypingIndicator";
import { SkeletonFor } from "./SkeletonCard";
import FeatureBar, { type FeatureId, CATEGORIES } from "./FeatureBar";
import FeaturePanel from "./FeaturePanel";
import FeedbackModal from "./FeedbackModal";
import Header from "./Header";

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (text: string) => void;
  onTradeAction: (actionId: string, action: "confirm" | "cancel") => void;
  onNewChat: () => void;
  onDeepResearch?: (stock: string, mode: string) => void;
  onGeneralDeepResearch?: (query: string) => void;
  onToggleSidebar?: () => void;
}

const ANALYSE_MODES = [
  { id: "full",       label: "Full Analysis", msg: (s: string) => `how is ${s} doing` },
  { id: "news",       label: "News",          msg: (s: string) => `${s} latest news` },
  { id: "financials", label: "Financials",    msg: (s: string) => `${s} quarterly results and financials` },
  { id: "technical",  label: "Technical",     msg: (s: string) => `${s} technical analysis` },
] as const;
type AnalyseMode = typeof ANALYSE_MODES[number]["id"];

// Feature keywords that return card-type responses (show skeleton instead of typing indicator)
const CARD_KEYWORDS = /\b(analy[sz]|market|overview|portfolio|scan|chart|compare|ipo|macro|rrg|news|deep research|how is|how's)\b/i;

/** Infer the skeleton type from user message content */
function inferSkeletonType(text: string): string | undefined {
  const t = text.toLowerCase();
  if (/\b(analy[sz]|how is|how's)\b/.test(t)) return "analysis";
  if (/\boverview\b|\bmarket\b/.test(t) && !/\bnews\b/.test(t)) return "overview";
  if (/\bnews\b/.test(t)) return "news";
  if (/\bscan\b/.test(t)) return "scan";
  if (/\bchart\b/.test(t)) return "chart";
  if (/\bmacro\b/.test(t)) return "macro";
  if (/\bportfolio\b/.test(t)) return "portfolio";
  return undefined;
}

/** Hover tooltips for quick-send feature cards */
const FEATURE_TOOLTIPS: Partial<Record<FeatureId, string>> = {
  market_overview: "Live indices, gainers, losers & market breadth",
  market_news: "Latest market news with AI sentiment analysis",
  portfolio: "Your Zerodha holdings & trading P&L",
  ipo: "Upcoming IPOs, subscriptions & listing returns",
  macro: "RBI rates, inflation, forex, crude & FII/DII flows",
  rrg: "Sector rotation analysis relative to Nifty 50",
};

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

/** Typewriter hook */
function useTypewriter(text: string, speed = 40) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return displayed;
}

export default function ChatWindow({
  messages,
  isLoading,
  onSend,
  onTradeAction,
  onNewChat,
  onDeepResearch,
  onGeneralDeepResearch,
  onToggleSidebar,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
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

  // Scroll-to-bottom FAB
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const lastMsg = messages[messages.length - 1];
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");

  // Should we show skeleton (card loading) vs typing indicator?
  const showSkeleton = isLoading && lastUserMsg && CARD_KEYWORDS.test(lastUserMsg.content);

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

  // Track scroll position for FAB
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 200);
  }, []);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const showEmpty = messages.length === 0 && !isLoading;

  // Typewriter for subtitle
  const subtitle = useTypewriter(showEmpty ? "Your AI trading assistant. Ask me anything." : "", 35);

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

  const QUICK_SEND_FEATURES = new Set(["market_overview", "market_news", "portfolio", "ipo", "macro", "rrg"]);

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
      <Header
        onNewChat={onNewChat}
        onToggleSidebar={onToggleSidebar ?? (() => {})}
        onFeedbackOpen={() => setFeedbackOpen(true)}
      />

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-6"
        role="log"
        aria-live="polite"
        aria-busy={isLoading}
        aria-label="Chat messages"
      >
        {showEmpty && (
          <div className="flex h-full flex-col items-center justify-center">
            <div
              className="pointer-events-none absolute"
              style={{
                width: 500, height: 500,
                background: "radial-gradient(circle, rgba(201,169,110,0.03) 0%, transparent 70%)",
              }}
            />
            <div className="relative w-full max-w-lg text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-mark.png" alt="Stocky" width={56} height={56}
                className="breathe mx-auto mb-4" style={{ objectFit: "contain" }}
              />
              <p className="gradient-text-shimmer bounce-in text-3xl font-light tracking-widest">Stocky</p>
              <p className="mt-3 text-sm" style={{ color: "var(--muted)", minHeight: "1.5em" }}>
                {subtitle}
                <span
                  className="inline-block w-0.5 h-4 ml-0.5 align-middle"
                  style={{
                    background: "var(--accent)",
                    animation: subtitle.length < 41 ? "pulse-dot 1s infinite" : "none",
                    opacity: subtitle.length < 41 ? 1 : 0,
                  }}
                />
              </p>

              {/* Feature card grid — all features organized by category */}
              {!analyseOpen && activeFeature === null && (
                <div className="mt-6 w-full space-y-2 sm:space-y-3 text-left">
                  {CATEGORIES.map((cat, catIdx) => (
                    <motion.div
                      key={cat.label}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: catIdx * 0.06, duration: 0.3 }}
                    >
                      <span
                        className="mb-1 sm:mb-1.5 block text-[9px] font-semibold uppercase tracking-widest hidden sm:block"
                        style={{ color: "var(--muted)", opacity: 0.6 }}
                      >
                        {cat.label}
                      </span>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {cat.features.map((f, i) => (
                          <motion.button
                            key={f.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: catIdx * 0.06 + i * 0.04, duration: 0.25 }}
                            whileHover={{ y: -2, boxShadow: "0 0 16px rgba(201,169,110,0.06)" }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              track("click", "empty_card", { feature: f.id, category: cat.label });
                              handleFeatureSelect(f.id);
                            }}
                            title={FEATURE_TOOLTIPS[f.id as FeatureId]}
                            className="flex items-center gap-1.5 rounded-xl border px-2.5 py-2 sm:px-3 sm:py-2.5 text-left transition-colors duration-200 hover:border-[var(--accent-dim)]"
                            style={{
                              borderColor: "var(--card-border)",
                              background: "var(--surface)",
                            }}
                          >
                            <span className="text-sm">{f.icon}</span>
                            <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                              {f.label}
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Inline FeaturePanel on empty state (for panel-opening features) */}
              <AnimatePresence>
                {!analyseOpen && activeFeature !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: 12, height: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="mt-6 w-full max-w-sm mx-auto overflow-hidden"
                  >
                    <FeaturePanel
                      feature={activeFeature}
                      onClose={() => { setActiveFeature(null); }}
                      onSend={handleSend}
                      onFeatureSend={handleFeatureSend}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {analyseOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="mt-8 rounded-2xl border p-5 text-left"
                    style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <button
                        onClick={() => setAnalyseOpen(false)}
                        className="bounce-tap flex items-center gap-1 text-xs hover:opacity-70"
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
                      className="w-full rounded-xl border bg-transparent px-4 py-3 text-sm outline-none transition-all"
                      style={{
                        borderColor: stockQuery ? "var(--accent)" : "var(--card-border)",
                        color: "var(--foreground)",
                        boxShadow: stockQuery ? "0 0 0 1px var(--accent-dim), 0 0 12px rgba(201,169,110,0.08)" : "none",
                      }}
                    />

                    <div className="mt-4 flex flex-wrap gap-2">
                      {ANALYSE_MODES.map((m) => {
                        const sel = analyseMode === m.id;
                        return (
                          <motion.button
                            key={m.id}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setAnalyseMode(m.id)}
                            className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                            style={{
                              borderColor: sel ? "var(--accent)" : "var(--card-border)",
                              background: sel ? "rgba(201,169,110,0.08)" : "transparent",
                              color: sel ? "var(--accent)" : "var(--muted)",
                            }}
                          >
                            {m.label}
                          </motion.button>
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

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleAnalyseSubmit}
                      disabled={!stockQuery.trim()}
                      className="mt-4 w-full rounded-xl py-3 text-sm font-medium transition-colors"
                      style={{
                        background: stockQuery.trim() ? "var(--accent)" : "var(--card-border)",
                        color: stockQuery.trim() ? "#0A0A0A" : "var(--muted)",
                        cursor: stockQuery.trim() ? "pointer" : "not-allowed",
                      }}
                    >
                      Analyse →
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-3xl space-y-3 sm:space-y-5">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} onTradeAction={onTradeAction} onSend={handleSend} />
          ))}
          {isLoading && (showSkeleton ? <SkeletonFor type={lastUserMsg ? inferSkeletonType(lastUserMsg.content) : undefined} /> : <TypingIndicator />)}
          <div ref={bottomRef} />
        </div>

        {/* Scroll to bottom FAB */}
        <AnimatePresence>
          {showScrollBtn && messages.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              onClick={scrollToBottom}
              className="fixed bottom-28 right-3 sm:right-6 z-30 rounded-full border p-2.5 shadow-lg backdrop-blur-sm transition-colors hover:bg-white/5"
              style={{
                background: "var(--glass)",
                borderColor: "var(--card-border)",
              }}
              aria-label="Scroll to bottom"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M4 6l4 4 4-4" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Input + Feature bar + Prompt helpers */}
      <div className="px-3 pb-3 pt-1.5 sm:px-4" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}>
        <div className="mx-auto max-w-3xl">
          {/* Feature bar (above input, auto-hides after selection) */}
          <FeatureBar
            active={activeFeature}
            onSelect={handleFeatureSelect}
            disabled={isLoading}
            visible={featureBarVisible && !analyseOpen && !showEmpty && !isLoading}
          />

          {/* Feature panel (expands when chip selected, only in message state) */}
          <AnimatePresence>
            {activeFeature && !showEmpty && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="overflow-hidden"
              >
                <FeaturePanel
                  feature={activeFeature}
                  onClose={() => { setActiveFeature(null); setFeatureBarVisible(true); }}
                  onSend={handleSend}
                  onFeatureSend={handleFeatureSend}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Analyse stock picker (works in both empty and message states) */}
          <AnimatePresence>
            {analyseOpen && !showEmpty && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="mb-3 rounded-2xl border p-5"
                style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
              >
                <div className="mb-4 flex items-center gap-3">
                  <button
                    onClick={() => { setAnalyseOpen(false); setFeatureBarVisible(true); }}
                    className="bounce-tap flex items-center gap-1 text-xs hover:opacity-70"
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
                  className="w-full rounded-xl border bg-transparent px-4 py-3 text-sm outline-none transition-all"
                  style={{
                    borderColor: stockQuery ? "var(--accent)" : "var(--card-border)",
                    color: "var(--foreground)",
                    boxShadow: stockQuery ? "0 0 0 1px var(--accent-dim), 0 0 12px rgba(201,169,110,0.08)" : "none",
                  }}
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  {ANALYSE_MODES.map((m) => {
                    const sel = analyseMode === m.id;
                    return (
                      <motion.button
                        key={m.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setAnalyseMode(m.id)}
                        className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                        style={{
                          borderColor: sel ? "var(--accent)" : "var(--card-border)",
                          background: sel ? "rgba(201,169,110,0.08)" : "transparent",
                          color: sel ? "var(--accent)" : "var(--muted)",
                        }}
                      >
                        {m.label}
                      </motion.button>
                    );
                  })}
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAnalyseSubmit}
                  disabled={!stockQuery.trim()}
                  className="mt-4 w-full rounded-xl py-3 text-sm font-medium transition-colors"
                  style={{
                    background: stockQuery.trim() ? "var(--accent)" : "var(--card-border)",
                    color: stockQuery.trim() ? "#0A0A0A" : "var(--muted)",
                    cursor: stockQuery.trim() ? "pointer" : "not-allowed",
                  }}
                >
                  Analyse →
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          <ChatInput onSend={handleSend} disabled={isLoading} mode={chatMode} onModeChange={setChatMode} />
        </div>
      </div>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}
