"use client";
import { track } from "@/lib/analytics";

export type FeatureId =
  | "market_overview"
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
  | "summarise";

export const CATEGORIES: { label: string; features: { id: FeatureId; icon: string; label: string }[] }[] = [
  {
    label: "Quick",
    features: [
      { id: "market_overview", icon: "📈", label: "Market Overview" },
      { id: "market_news",     icon: "📰", label: "News" },
      { id: "portfolio",       icon: "💼", label: "Portfolio" },
      { id: "analyse",         icon: "🔍", label: "Analyse" },
    ],
  },
  {
    label: "Research",
    features: [
      { id: "deep_research", icon: "🔬", label: "Deep Research" },
      { id: "scan",          icon: "📊", label: "Scan" },
      { id: "chart",         icon: "📈", label: "Chart" },
      { id: "compare",       icon: "⚖",  label: "Compare" },
    ],
  },
  {
    label: "Markets",
    features: [
      { id: "ipo",   icon: "🚀", label: "IPO" },
      { id: "macro", icon: "🌐", label: "Macro" },
      { id: "rrg",   icon: "🔄", label: "RRG" },
    ],
  },
  {
    label: "Tools",
    features: [
      { id: "summarise", icon: "✦", label: "Summarise" },
    ],
  },
];

interface Props {
  active: FeatureId | null;
  onSelect: (id: FeatureId | null) => void;
  disabled?: boolean;
  visible?: boolean;
}

export default function FeatureBar({ active, onSelect, disabled, visible = true }: Props) {
  if (!visible) return null;

  return (
    <div className="slide-up mb-1.5 space-y-1.5" style={{ borderTop: "1px solid var(--card-border)", paddingTop: 8 }}>
      {CATEGORIES.map((cat, catIdx) => (
        <div key={cat.label} className="stagger slide-up" style={{ ["--i" as string]: catIdx }}>
          <span
            className="mb-1 block text-[9px] font-semibold uppercase tracking-widest sm:text-[10px]"
            style={{ color: "var(--muted)", opacity: 0.6 }}
          >
            {cat.label}
          </span>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {cat.features.map((f) => {
              const isActive = active === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    track("click", "feature_chip_click", { feature: f.id, category: cat.label });
                    onSelect(isActive ? null : f.id);
                  }}
                  disabled={disabled}
                  className="bounce-tap hover-lift flex items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-medium transition-all disabled:opacity-30"
                  style={{
                    borderColor: isActive ? "var(--accent)" : "var(--card-border)",
                    background: isActive ? "rgba(201,169,110,0.1)" : "transparent",
                    color: isActive ? "var(--accent)" : "var(--muted)",
                    boxShadow: isActive ? "0 0 12px rgba(201,169,110,0.1)" : "none",
                  }}
                >
                  <span style={{ fontSize: 12 }}>{f.icon}</span>
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
