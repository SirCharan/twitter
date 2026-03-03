"use client";

export type FeatureId =
  | "deep_research"
  | "scan"
  | "chart"
  | "compare"
  | "ipo"
  | "macro"
  | "summarise";

const FEATURES: { id: FeatureId; icon: string; label: string }[] = [
  { id: "deep_research", icon: "🔬", label: "Deep Research" },
  { id: "scan",          icon: "📊", label: "Scan" },
  { id: "chart",         icon: "📈", label: "Chart" },
  { id: "compare",       icon: "⚖",  label: "Compare" },
  { id: "ipo",           icon: "🚀", label: "IPO" },
  { id: "macro",         icon: "🌐", label: "Macro" },
  { id: "summarise",     icon: "✦",  label: "Summarise" },
];

interface Props {
  active: FeatureId | null;
  onSelect: (id: FeatureId | null) => void;
  disabled?: boolean;
}

export default function FeatureBar({ active, onSelect, disabled }: Props) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {FEATURES.map((f) => {
        const isActive = active === f.id;
        return (
          <button
            key={f.id}
            onClick={() => onSelect(isActive ? null : f.id)}
            disabled={disabled}
            className="flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-medium transition-all disabled:opacity-30"
            style={{
              borderColor: isActive ? "var(--accent)" : "var(--card-border)",
              background: isActive ? "rgba(201,169,110,0.1)" : "transparent",
              color: isActive ? "var(--accent)" : "var(--muted)",
            }}
          >
            <span style={{ fontSize: 12 }}>{f.icon}</span>
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
