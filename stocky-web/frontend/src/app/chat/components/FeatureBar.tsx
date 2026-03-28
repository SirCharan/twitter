"use client";
import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { track } from "@/lib/analytics";
import {
  TrendingUp, Newspaper, Briefcase, Search, Trophy,
  Microscope, BarChart3, LineChart, Scale,
  Rocket, Globe, RefreshCw, Sparkles,
  Calendar, Coins, Factory, Gauge, Megaphone, ArrowLeftRight, Activity,
} from "lucide-react";

export type FeatureId =
  | "market_overview"
  | "top_stocks"
  | "market_news"
  | "portfolio"
  | "analyse"
  | "deep_research"
  | "scan"
  | "chart"
  | "compare"
  | "ipo"
  | "macro"
  | "rrg"
  | "summarise"
  | "earnings"
  | "dividends"
  | "sectors"
  | "valuation"
  | "announcements"
  | "fii_dii"
  | "options";

export const CATEGORIES: { label: string; features: { id: FeatureId; icon: ReactNode; label: string }[] }[] = [
  {
    label: "Quick",
    features: [
      { id: "market_overview", icon: <TrendingUp size={12} />, label: "Market Overview" },
      { id: "top_stocks",      icon: <Trophy size={12} />,     label: "Top Stocks" },
      { id: "market_news",     icon: <Newspaper size={12} />,  label: "News" },
      { id: "portfolio",       icon: <Briefcase size={12} />,  label: "Portfolio" },
      { id: "analyse",         icon: <Search size={12} />,     label: "Analyse" },
    ],
  },
  {
    label: "Research",
    features: [
      { id: "deep_research", icon: <Microscope size={12} />, label: "Deep Research" },
      { id: "scan",          icon: <BarChart3 size={12} />,  label: "Scan" },
      { id: "chart",         icon: <LineChart size={12} />,  label: "Chart" },
      { id: "compare",       icon: <Scale size={12} />,      label: "Compare" },
      { id: "options",        icon: <Activity size={12} />,   label: "Options" },
    ],
  },
  {
    label: "Markets",
    features: [
      { id: "ipo",       icon: <Rocket size={12} />,    label: "IPO" },
      { id: "macro",     icon: <Globe size={12} />,     label: "Macro" },
      { id: "rrg",       icon: <RefreshCw size={12} />, label: "RRG" },
      { id: "sectors",   icon: <Factory size={12} />,   label: "Sectors" },
      { id: "valuation", icon: <Gauge size={12} />,     label: "Valuation" },
      { id: "fii_dii",  icon: <ArrowLeftRight size={12} />, label: "FII/DII" },
    ],
  },
  {
    label: "Data",
    features: [
      { id: "earnings",      icon: <Calendar size={12} />,  label: "Earnings" },
      { id: "dividends",     icon: <Coins size={12} />,     label: "Dividends" },
      { id: "announcements", icon: <Megaphone size={12} />, label: "Announcements" },
    ],
  },
  {
    label: "Tools",
    features: [
      { id: "summarise", icon: <Sparkles size={12} />, label: "Summarise" },
    ],
  },
];

// Flat list of all features for mobile single-row view
const ALL_FEATURES = CATEGORIES.flatMap((c) => c.features);

interface Props {
  active: FeatureId | null;
  onSelect: (id: FeatureId | null) => void;
  disabled?: boolean;
  visible?: boolean;
}

function FeatureChip({
  f, isActive, disabled, onSelect,
}: {
  f: { id: FeatureId; icon: ReactNode; label: string };
  isActive: boolean;
  disabled?: boolean;
  onSelect: (id: FeatureId | null) => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        track("click", "feature_chip_click", { feature: f.id });
        onSelect(isActive ? null : f.id);
      }}
      disabled={disabled}
      aria-label={f.label}
      aria-pressed={isActive}
      className="relative flex items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1.5 sm:py-1 text-[11px] font-medium transition-colors disabled:opacity-30 min-h-[44px] sm:min-h-0"
      style={{
        borderColor: isActive ? "var(--accent)" : "var(--card-border)",
        background: isActive ? "rgba(201,169,110,0.1)" : "transparent",
        color: isActive ? "var(--accent)" : "var(--muted)",
        boxShadow: isActive ? "0 0 12px rgba(201,169,110,0.1)" : "none",
      }}
    >
      <span className="flex items-center" style={{ fontSize: 12 }}>{f.icon}</span>
      {f.label}
    </motion.button>
  );
}

export default function FeatureBar({ active, onSelect, disabled, visible = true }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: 8, height: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          role="toolbar"
          aria-label="Feature shortcuts"
          className="mb-1.5 overflow-hidden hidden sm:block"
          style={{ borderTop: "1px solid var(--card-border)", paddingTop: 8 }}
        >
          {/* Mobile: single scrollable row, no category labels */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none sm:hidden">
            {ALL_FEATURES.map((f) => (
              <FeatureChip
                key={f.id}
                f={f}
                isActive={active === f.id}
                disabled={disabled}
                onSelect={onSelect}
              />
            ))}
          </div>

          {/* Desktop: categorized rows */}
          <div className="hidden sm:block space-y-1.5">
            {CATEGORIES.map((cat, catIdx) => (
              <motion.div
                key={cat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: catIdx * 0.05, duration: 0.25 }}
              >
                <span
                  className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--muted)", opacity: 0.6 }}
                >
                  {cat.label}
                </span>
                <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                  {cat.features.map((f) => (
                    <FeatureChip
                      key={f.id}
                      f={f}
                      isActive={active === f.id}
                      disabled={disabled}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
