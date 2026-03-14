"use client";
import { useState } from "react";
import type { NewsArticle } from "@/lib/types";
import MarkdownRich from "./MarkdownRich";

const CATEGORY_COLORS: Record<string, string> = {
  Indian: "#22c55e",
  Global: "#818cf8",
  Commodities: "#f59e0b",
  Energy: "#ef4444",
};

export default function NewsCard({ data }: { data: Record<string, unknown> }) {
  const articles = (data.articles as unknown[] || []) as NewsArticle[];
  const headline = (data.headline as string) || "Market News";
  const categories = (data.categories as string[]) || [];
  const aiSummary = data.ai_summary as string | undefined;

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = activeCategory
    ? articles.filter((a) => a.category === activeCategory)
    : articles;

  if (articles.length === 0) {
    return (
      <div>
        <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{headline}</p>
        <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>No news articles found.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="var(--accent)" strokeWidth="1.3" />
          <path d="M5 6h6M5 8.5h4" stroke="var(--accent)" strokeWidth="1" strokeLinecap="round" />
        </svg>
        <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{headline}</p>
        <span className="ml-auto text-[10px] tabular-nums" style={{ color: "var(--muted)" }}>
          {articles.length} articles
        </span>
      </div>

      {/* Category filter tabs */}
      {categories.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveCategory(null)}
            className="rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all"
            style={{
              borderColor: !activeCategory ? "var(--accent)" : "var(--card-border)",
              background: !activeCategory ? "rgba(201,169,110,0.08)" : "transparent",
              color: !activeCategory ? "var(--accent)" : "var(--muted)",
            }}
          >
            All
          </button>
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            const color = CATEGORY_COLORS[cat] || "var(--muted)";
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(isActive ? null : cat)}
                className="rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all"
                style={{
                  borderColor: isActive ? color : "var(--card-border)",
                  background: isActive ? `${color}15` : "transparent",
                  color: isActive ? color : "var(--muted)",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {/* Articles */}
      <div className="space-y-1.5">
        {filtered.slice(0, 15).map((a, i) => {
          const sentimentIcon = a.sentiment > 0 ? "▲" : a.sentiment < 0 ? "▼" : "●";
          const sentimentColor = a.sentiment > 0 ? "var(--positive)" : a.sentiment < 0 ? "var(--negative)" : "var(--muted)";

          return (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg border p-2.5"
              style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
            >
              <span className="mt-0.5 text-xs" style={{ color: sentimentColor }}>
                {sentimentIcon}
              </span>
              <div className="min-w-0 flex-1">
                {a.link ? (
                  <a
                    href={a.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs leading-snug hover:underline"
                    style={{ color: "var(--foreground)" }}
                  >
                    {a.title}
                  </a>
                ) : (
                  <p className="text-xs leading-snug" style={{ color: "var(--foreground)" }}>
                    {a.title}
                  </p>
                )}
                {a.summary && (
                  <p
                    className="mt-0.5 text-[11px] leading-snug line-clamp-1"
                    style={{ color: "var(--muted)" }}
                  >
                    {a.summary}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-2">
                  {/* Source badge */}
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] font-medium"
                    style={{ background: "rgba(201,169,110,0.06)", color: "var(--accent)" }}
                  >
                    {a.source}
                  </span>
                  {/* Category badge */}
                  {a.category && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] font-medium"
                      style={{
                        background: `${CATEGORY_COLORS[a.category] || "var(--muted)"}12`,
                        color: CATEGORY_COLORS[a.category] || "var(--muted)",
                      }}
                    >
                      {a.category}
                    </span>
                  )}
                  {a.date && (
                    <span className="text-[10px]" style={{ color: "var(--muted)", opacity: 0.7 }}>{a.date}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI-generated summary */}
      {aiSummary && (
        <div
          className="mt-3 rounded-xl border-l-2 px-4 py-3"
          style={{
            borderColor: "var(--accent)",
            background: "linear-gradient(135deg, rgba(201,169,110,0.04) 0%, var(--surface) 100%)",
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--accent)" }}>
            Stocky&apos;s Summary
          </p>
          <div className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
            <MarkdownRich text={aiSummary} />
          </div>
        </div>
      )}
    </div>
  );
}
