"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquarePlus, TrendingUp, Briefcase, BarChart3,
  Search, Newspaper, Activity, GitCompare, Globe,
  Rocket, Repeat2, FileText,
} from "lucide-react";

interface Action {
  id: string;
  label: string;
  icon: React.ReactNode;
  keywords: string;
}

const ACTIONS: Action[] = [
  { id: "new_chat",        label: "New Chat",             icon: <MessageSquarePlus size={14} />, keywords: "new chat fresh start" },
  { id: "market_overview", label: "Market Overview",      icon: <TrendingUp size={14} />,        keywords: "market overview nifty sensex indices" },
  { id: "portfolio",       label: "My Portfolio",         icon: <Briefcase size={14} />,         keywords: "portfolio holdings positions pnl" },
  { id: "analyse",         label: "Analyse Stock",        icon: <BarChart3 size={14} />,         keywords: "analyse analysis stock technical fundamental" },
  { id: "deep_research",   label: "Deep Research",        icon: <Search size={14} />,            keywords: "deep research report triad agents" },
  { id: "market_news",     label: "Market News",          icon: <Newspaper size={14} />,         keywords: "news headlines latest market news" },
  { id: "scan",            label: "Market Scan",          icon: <Activity size={14} />,          keywords: "scan screener momentum volume breakout" },
  { id: "compare",         label: "Compare Stocks",       icon: <GitCompare size={14} />,        keywords: "compare stocks versus vs peer" },
  { id: "macro",           label: "Macro Dashboard",      icon: <Globe size={14} />,             keywords: "macro rbi rates inflation forex crude gold" },
  { id: "ipo",             label: "IPO Tracker",          icon: <Rocket size={14} />,            keywords: "ipo upcoming listing subscription" },
  { id: "rrg",             label: "Sector Rotation",      icon: <Repeat2 size={14} />,           keywords: "rrg sector rotation relative strength" },
  { id: "summarise",       label: "Summarise",            icon: <FileText size={14} />,          keywords: "summarise summary text paste" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onAction: (id: string) => void;
}

export default function CommandPalette({ open, onClose, onAction }: Props) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? ACTIONS.filter((a) =>
        a.label.toLowerCase().includes(query.toLowerCase()) ||
        a.keywords.toLowerCase().includes(query.toLowerCase())
      )
    : ACTIONS;

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Reset active when filter changes
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter")     { e.preventDefault(); if (filtered[activeIdx]) { onAction(filtered[activeIdx].id); onClose(); } }
    if (e.key === "Escape")    { onClose(); }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
            onClick={onClose}
          />
          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed left-1/2 top-[20%] z-50 w-full max-w-md -translate-x-1/2 rounded-2xl border overflow-hidden shadow-2xl"
            style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
          >
            {/* Search input */}
            <div
              className="flex items-center gap-3 border-b px-4 py-3"
              style={{ borderColor: "var(--card-border)" }}
            >
              <Search size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search commands..."
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--foreground)" }}
              />
              <kbd className="kbd text-[10px]">Esc</kbd>
            </div>

            {/* Actions list */}
            <div className="max-h-72 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>No commands found</p>
              ) : (
                filtered.map((action, idx) => (
                  <motion.button
                    key={action.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    onClick={() => { onAction(action.id); onClose(); }}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors"
                    style={{
                      background: idx === activeIdx ? "rgba(201,169,110,0.08)" : "transparent",
                      color: idx === activeIdx ? "var(--accent)" : "var(--foreground)",
                    }}
                  >
                    <span style={{ color: idx === activeIdx ? "var(--accent)" : "var(--muted)" }}>
                      {action.icon}
                    </span>
                    {action.label}
                  </motion.button>
                ))
              )}
            </div>

            {/* Footer */}
            <div
              className="flex items-center gap-3 border-t px-4 py-2 text-[10px]"
              style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}
            >
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>Esc close</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
