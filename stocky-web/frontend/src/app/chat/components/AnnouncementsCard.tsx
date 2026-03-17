"use client";
import { useState } from "react";
import { Megaphone } from "lucide-react";
import MarkdownRich from "./MarkdownRich";
import CardWrapper from "./ui/CardWrapper";
import Disclaimer from "./ui/Disclaimer";
import CardActions from "./ui/CardActions";

interface Announcement {
  company: string;
  title: string;
  summary: string;
  date: string;
  type: string;
  source: string;
}

interface Props {
  data: Record<string, unknown>;
}

const INITIAL_ITEMS = 8;

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  earnings: { bg: "rgba(59,130,246,0.1)", color: "#3B82F6" },
  dividend: { bg: "rgba(34,197,94,0.1)", color: "#22C55E" },
  bonus: { bg: "rgba(168,85,247,0.1)", color: "#A855F7" },
  split: { bg: "rgba(249,115,22,0.1)", color: "#F97316" },
  buyback: { bg: "rgba(6,182,212,0.1)", color: "#06B6D4" },
  board_meeting: { bg: "rgba(234,179,8,0.1)", color: "#EAB308" },
  general: { bg: "rgba(156,163,175,0.1)", color: "#9CA3AF" },
};

function TypeBadge({ type }: { type: string }) {
  const key = type.toLowerCase().replace(/\s+/g, "_");
  const colors = TYPE_COLORS[key] || TYPE_COLORS.general;
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider whitespace-nowrap"
      style={{ background: colors.bg, color: colors.color }}
    >
      {type.replace(/_/g, " ")}
    </span>
  );
}

export default function AnnouncementsCard({ data }: Props) {
  const [showAll, setShowAll] = useState(false);

  const announcements = (data.announcements as Announcement[]) || [];
  const total = (data.total as number) || announcements.length;

  const visibleItems = showAll ? announcements : announcements.slice(0, INITIAL_ITEMS);

  return (
    <CardWrapper
      icon={<Megaphone size={16} style={{ color: "var(--accent)" }} />}
      title="Corporate Announcements"
      badge={
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ background: "rgba(201,169,110,0.1)", color: "var(--accent)" }}
        >
          {total} announcements
        </span>
      }
    >
      {announcements.length > 0 ? (
        <>
          {/* Timeline */}
          <div className="space-y-0">
            {visibleItems.map((item, i) => (
              <div key={i} className="relative flex gap-3 pb-4">
                {/* Timeline line */}
                {i < visibleItems.length - 1 && (
                  <div
                    className="absolute left-[5px] top-[18px] bottom-0 w-px"
                    style={{ background: "var(--card-border)" }}
                  />
                )}
                {/* Dot */}
                <div
                  className="mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2"
                  style={{
                    borderColor: "var(--accent)",
                    background: "var(--card-bg)",
                  }}
                />
                {/* Content */}
                <div
                  className="flex-1 rounded-xl px-3 py-2.5"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                      {item.company}
                    </p>
                    <TypeBadge type={item.type} />
                  </div>
                  <p className="text-[11px] font-medium mb-0.5" style={{ color: "var(--foreground)" }}>
                    {item.title}
                  </p>
                  {item.summary && (
                    <p className="text-[11px] leading-relaxed" style={{ color: "var(--muted)" }}>
                      {item.summary}
                    </p>
                  )}
                  <p className="text-[10px] mt-1" style={{ color: "var(--muted)", opacity: 0.7 }}>
                    {item.date}
                    {item.source && ` · ${item.source}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {announcements.length > INITIAL_ITEMS && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="mt-1 text-xs underline-offset-2 hover:underline"
              style={{ color: "var(--muted)" }}
            >
              {showAll ? "Show less ↑" : `Show ${announcements.length - INITIAL_ITEMS} more ↓`}
            </button>
          )}
        </>
      ) : (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No announcements available.
        </p>
      )}

      {/* Stocky's Take */}
      {(data.ai_analysis as string) && (
        <div
          className="rounded-xl border-l-2 px-4 py-3 mt-3"
          style={{
            borderColor: "var(--accent)",
            background: "linear-gradient(135deg, rgba(201,169,110,0.04) 0%, var(--surface) 100%)",
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--accent)" }}>
            Stocky&apos;s Take
          </p>
          <div className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
            <MarkdownRich text={data.ai_analysis as string} />
          </div>
        </div>
      )}

      <Disclaimer />
      <CardActions cardType="announcements" cardData={data} />
    </CardWrapper>
  );
}
