"use client";
import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatMessage } from "@/lib/types";
import { trackEvent, track } from "@/lib/analytics";
import { Search } from "lucide-react";
import MessageBubble from "./MessageBubble";
import ChatInput, { type ChatMode } from "./ChatInput";
import TypingIndicator from "./TypingIndicator";
import { SkeletonFor } from "./SkeletonCard";
import FeatureBar, { type FeatureId, CATEGORIES } from "./FeatureBar";
import FeaturePanel from "./FeaturePanel";
import FeedbackModal from "./FeedbackModal";
import Header from "./Header";
import SuggestionChips from "./SuggestionChips";
import CommandPalette from "./CommandPalette";
import ThinkingScreen from "./ThinkingScreen";
import { useMediaQuery } from "../hooks/useMediaQuery";

export interface ChatWindowHandle {
  openFeatureBar: () => void;
  enterDeepResearch: () => void;
}

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (text: string, deep?: boolean) => void;
  onTradeAction: (actionId: string, action: "confirm" | "cancel") => void;
  onNewChat: () => void;
  onDeepResearch?: (stock: string, mode: string) => void;
  onGeneralDeepResearch?: (query: string) => void;
  onCouncilResearch?: (query: string) => void;
  onToggleSidebar?: () => void;
  onRemoveLastAssistant?: () => void;
  onStop?: () => void;
  hideHeaderOnMobile?: boolean;
}

const ANALYSE_MODES = [
  { id: "full",       label: "Full Analysis", msg: (s: string) => `how is ${s} doing` },
  { id: "news",       label: "News",          msg: (s: string) => `${s} latest news` },
  { id: "financials", label: "Financials",    msg: (s: string) => `${s} quarterly results and financials` },
  { id: "technical",  label: "Technical",     msg: (s: string) => `${s} technical analysis` },
] as const;
type AnalyseMode = typeof ANALYSE_MODES[number]["id"];

const CARD_KEYWORDS = /\b(analy[sz]|market|overview|portfolio|scan|chart|compare|ipo|macro|rrg|news|deep research|how is|how's|earnings?|dividends?|sectors?|valuation|announcements?)\b/i;

function inferSkeletonType(text: string): string | undefined {
  const t = text.toLowerCase();
  if (/\b(analy[sz]|how is|how's)\b/.test(t)) return "analysis";
  if (/\boverview\b|\bmarket\b/.test(t) && !/\bnews\b/.test(t)) return "overview";
  if (/\bnews\b/.test(t)) return "news";
  if (/\bscan\b/.test(t)) return "scan";
  if (/\bchart\b/.test(t)) return "chart";
  if (/\bmacro\b/.test(t)) return "macro";
  if (/\bportfolio\b/.test(t)) return "portfolio";
  if (/\bearnings?\b/.test(t)) return "earnings";
  if (/\bdividends?\b/.test(t)) return "dividends";
  if (/\bsectors?\b/.test(t)) return "sectors";
  if (/\bvaluation\b/.test(t)) return "valuation";
  if (/\bannouncements?\b/.test(t)) return "announcements";
  return undefined;
}

const FEATURE_TOOLTIPS: Partial<Record<FeatureId, string>> = {
  market_overview: "Live indices, gainers, losers & market breadth",
  market_news: "Latest market news with AI sentiment analysis",
  portfolio: "Your Zerodha holdings & trading P&L",
  ipo: "Upcoming IPOs, subscriptions & listing returns",
  macro: "RBI rates, inflation, forex, crude & FII/DII flows",
  rrg: "Sector rotation analysis relative to Nifty 50",
  sectors: "Sector-wise performance across 1D, 1W, 1M timeframes",
  valuation: "Market PE/PB and most/least expensive Nifty stocks",
  earnings: "Upcoming earnings dates and EPS surprise history",
  dividends: "Dividend history, yields, and sustainability scores",
  announcements: "Latest corporate actions and announcements",
};

function composeFeatureMessage(feature: FeatureId, params: Record<string, string>): string {
  switch (feature) {
    case "market_overview": return "how's the market";
    case "market_news": return "market news";
    case "portfolio": return "my portfolio";
    case "analyse": return "";
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
    case "scan": return `market scan — ${params.scan?.replace(/_/g, " ") ?? "volume pump"}`;
    case "chart": return `${params.type === "analysis" ? "analysis chart" : "chart"} for ${params.stock}`;
    case "compare": return `compare stocks: ${params.stocks}`;
    case "ipo": return "ipo tracker";
    case "macro": return "macro dashboard";
    case "rrg": return "rrg";
    case "summarise": return `summarise this:\n\n${params.text}`;
    case "earnings": return params.stock ? `earnings for ${params.stock}` : "earnings calendar";
    case "dividends": return params.stock ? `dividends for ${params.stock}` : "dividends";
    case "sectors": return "sector performance";
    case "valuation": return "market valuation";
    case "announcements": return "corporate announcements";
  }
}

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

const ChatWindow = forwardRef<ChatWindowHandle, Props>(function ChatWindow({
  messages,
  isLoading,
  onSend,
  onTradeAction,
  onNewChat,
  onDeepResearch,
  onGeneralDeepResearch,
  onCouncilResearch,
  onToggleSidebar,
  onRemoveLastAssistant,
  onStop,
  hideHeaderOnMobile = false,
}, ref) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stockInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Chat mode — lifted here so FAB and nav can control it
  const [chatMode, setChatMode] = useState<ChatMode>("quick");

  const [analyseOpen, setAnalyseOpen] = useState(false);
  const [stockQuery, setStockQuery] = useState("");
  const [analyseMode, setAnalyseMode] = useState<AnalyseMode>("full");
  const [analyseNote, setAnalyseNote] = useState("");

  const [activeFeature, setActiveFeature] = useState<FeatureId | null>(null);
  const [featureBarVisible, setFeatureBarVisible] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Expose imperative handle so ChatShell can drive feature bar + deep research mode
  useImperativeHandle(ref, () => ({
    openFeatureBar() {
      setFeatureBarVisible(true);
      setActiveFeature(null);
    },
    enterDeepResearch() {
      setChatMode("deep");
      // Focus textarea after a tick
      setTimeout(() => textareaRef.current?.focus(), 50);
    },
  }));

  const lastMsg = messages[messages.length - 1];
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const lastAssistantIdx = messages.map((m) => m.role).lastIndexOf("assistant");

  const handleRegenerate = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser && onRemoveLastAssistant) {
      onRemoveLastAssistant();
      handleSend(lastUser.content);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, onRemoveLastAssistant]);

  const hasActiveProgress = lastMsg?.type === "debate_progress" || lastMsg?.type === "progress";
  const showSkeleton = isLoading && !hasActiveProgress && lastUserMsg && CARD_KEYWORDS.test(lastUserMsg.content);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (analyseOpen) setTimeout(() => stockInputRef.current?.focus(), 50);
  }, [analyseOpen]);

  // Feature bar stays hidden after responses — user toggles via "Tools & shortcuts" button

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen((prev) => !prev); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function handleCmdAction(id: string) {
    if (id === "new_chat") { onNewChat(); return; }
    handleFeatureSelect(id as FeatureId);
  }

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

  const QUICK_SEND_FEATURES = new Set(["market_overview", "market_news", "portfolio", "ipo", "macro", "rrg", "sectors", "valuation", "announcements"]);

  function handleFeatureSelect(id: FeatureId | null) {
    if (!id) { setActiveFeature(null); return; }
    if (QUICK_SEND_FEATURES.has(id)) {
      handleSend(composeFeatureMessage(id, {}));
      return;
    }
    if (id === "analyse") { setAnalyseOpen(true); return; }
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
    // Deep Research mode → route to 6-Agent Council
    if (chatMode === "deep" && onCouncilResearch) {
      onCouncilResearch(text);
      return;
    }
    onSend(text);
  }

  // Input bar positioning: fixed above bottom nav on mobile, static on desktop
  const inputBarStyle = !isDesktop
    ? {
        bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))",
        background: "var(--background)",
        borderTop: "1px solid var(--card-border)",
      }
    : undefined;

  return (
    <div className="flex h-full flex-col relative">
      {/* Header — desktop always, mobile only when not replaced by MobileHeader */}
      <div className={hideHeaderOnMobile ? "hidden md:block" : undefined}>
        <Header
          onNewChat={onNewChat}
          onToggleSidebar={onToggleSidebar ?? (() => {})}
          onFeedbackOpen={() => setFeedbackOpen(true)}
        />
      </div>

      {/* Top-bar progress strip */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="progress-strip h-[2px] w-full"
            initial={{ scaleX: 0, transformOrigin: "left" }}
            animate={{ scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: chatMode === "deep" ? 18 : 6, ease: "easeInOut" }}
            style={{ background: "linear-gradient(90deg, var(--accent), var(--positive))" }}
          />
        )}
      </AnimatePresence>

      {/* Messages scroll area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={`relative flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-6 ${!isDesktop ? "chat-scroll-mobile-pad" : "pb-6"}`}
        role="log"
        aria-live="polite"
        aria-busy={isLoading}
        aria-label="Chat messages"
      >
        {showEmpty && (
          <div className="flex h-full flex-col items-center pt-[4vh] sm:pt-0 sm:justify-center">
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.03, 0.06, 0.03] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none absolute"
              style={{
                width: 500, height: 500,
                background: "radial-gradient(circle, rgba(201,169,110,0.06) 0%, transparent 70%)",
                filter: "blur(40px)",
              }}
            />
            <div className="relative w-full max-w-lg text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-mark.png" alt="Stocky" width={56} height={56}
                className="breathe mx-auto mb-2 sm:mb-4 w-10 h-10 sm:w-14 sm:h-14" style={{ objectFit: "contain" }}
              />
              <p className="gradient-text-shimmer bounce-in text-2xl sm:text-3xl font-light tracking-widest">Stocky</p>
              <p className="mt-1.5 sm:mt-3 text-xs sm:text-sm" style={{ color: "var(--muted)", minHeight: "1.5em" }}>
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

              {/* Feature card grid */}
              {!analyseOpen && activeFeature === null && (
                <div className="mt-3 sm:mt-6 w-full space-y-1 sm:space-y-3 text-left">
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
                            onClick={() => handleFeatureSelect(f.id)}
                            data-analytics={`chip-${f.id}`}
                            title={FEATURE_TOOLTIPS[f.id as FeatureId]}
                            className="flex items-center gap-1.5 rounded-xl border px-2 py-2 sm:px-3 sm:py-2.5 text-left transition-colors duration-200 hover:border-[var(--accent-dim)]"
                            style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
                          >
                            <span className="text-xs sm:text-sm">{f.icon}</span>
                            <span className="text-[11px] sm:text-xs font-medium" style={{ color: "var(--muted)" }}>
                              {f.label}
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Inline FeaturePanel on empty state */}
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
          {messages.map((msg, idx) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onTradeAction={onTradeAction}
              onSend={handleSend}
              onRegenerate={handleRegenerate}
              isLastAssistant={idx === lastAssistantIdx}
              isLoading={isLoading}
            />
          ))}
          {!isLoading && lastMsg?.role === "assistant" && (
            <SuggestionChips message={lastMsg} onSend={handleSend} />
          )}
          {isLoading && !hasActiveProgress && (
            showSkeleton ? (
              <>
                <ThinkingScreen mode={chatMode} intent={lastUserMsg?.content ?? ""} />
                <SkeletonFor type={lastUserMsg ? inferSkeletonType(lastUserMsg.content) : undefined} />
              </>
            ) : (
              <ThinkingScreen mode={chatMode} intent={lastUserMsg?.content ?? ""} />
            )
          )}
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
              className="fixed right-3 sm:right-6 z-30 rounded-full border p-2.5 shadow-lg backdrop-blur-sm transition-colors hover:bg-white/5"
              style={{
                bottom: !isDesktop
                  ? "calc(8rem + env(safe-area-inset-bottom, 0px))"
                  : "7rem",
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

      {/* Deep Research FAB — mobile only, always visible */}
      <AnimatePresence>
        {!isDesktop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.3 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => {
              setChatMode("deep");
              setTimeout(() => textareaRef.current?.focus(), 50);
            }}
            className="fixed z-30 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold pointer-events-auto"
            style={{
              bottom: "calc(8.25rem + env(safe-area-inset-bottom, 0px))",
              background: chatMode === "deep"
                ? "linear-gradient(135deg, var(--accent), #B8894E)"
                : "rgba(201,169,110,0.12)",
              color: chatMode === "deep" ? "#0A0A0A" : "var(--accent)",
              border: chatMode === "deep" ? "none" : "1px solid rgba(201,169,110,0.3)",
              boxShadow: chatMode === "deep"
                ? "0 4px 20px rgba(201,169,110,0.4)"
                : "0 2px 12px rgba(0,0,0,0.3)",
              letterSpacing: "0.02em",
            }}
            aria-label="Toggle Deep Research mode"
            aria-pressed={chatMode === "deep"}
            data-analytics="mode-deep"
          >
            <Search size={11} strokeWidth={2.5} />
            Deep Research
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input bar — fixed above bottom nav on mobile, static on desktop */}
      <div
        className={`px-3 pt-2 pb-3 sm:px-4 ${!isDesktop ? "fixed left-0 right-0 z-30" : "relative"}`}
        style={inputBarStyle}
      >
        <div className="mx-auto max-w-3xl">
          {/* Feature bar toggle — only show toggle when messages exist */}
          {!showEmpty && !analyseOpen && !isLoading && (
            <div className="flex justify-center mb-1">
              <button
                onClick={() => setFeatureBarVisible((v) => !v)}
                className="text-[10px] px-3 py-1 rounded-full border transition-colors hover:border-[var(--accent-dim)]"
                style={{
                  color: "var(--muted)",
                  borderColor: featureBarVisible ? "var(--accent)" : "var(--card-border)",
                  background: featureBarVisible ? "rgba(201,169,110,0.06)" : "transparent",
                  opacity: 0.7,
                }}
              >
                {featureBarVisible ? "Hide tools ↑" : "Tools & shortcuts ↓"}
              </button>
            </div>
          )}

          {/* Feature bar */}
          <FeatureBar
            active={activeFeature}
            onSelect={handleFeatureSelect}
            disabled={isLoading}
            visible={featureBarVisible && !analyseOpen && !showEmpty && !isLoading}
          />

          {/* Feature panel */}
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

          {/* Analyse stock picker */}
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

          <ChatInput
            textareaRef={textareaRef}
            onSend={handleSend}
            disabled={isLoading}
            mode={chatMode}
            onModeChange={setChatMode}
            isStreaming={isLoading}
            onStop={onStop}
          />
        </div>
      </div>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} onAction={handleCmdAction} />
    </div>
  );
});

export default ChatWindow;
