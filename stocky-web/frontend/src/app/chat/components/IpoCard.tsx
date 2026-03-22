"use client";
import { useState } from "react";
import MarkdownRich from "./MarkdownRich";
import CardWrapper from "./ui/CardWrapper";
import { motion } from "framer-motion";
import Disclaimer from "./ui/Disclaimer";
import CardActions from "./ui/CardActions";

interface IpoItem {
  company: string;
  symbol: string;
  issue_price?: number | string;
  current_price?: number;
  listing_date?: string;
  open_date?: string;
  close_date?: string;
  current_gain?: number;
  status: string;
  issue_size?: string;
}

interface Props {
  data: Record<string, unknown>;
}

function GainBadge({ gain }: { gain: number }) {
  const isPositive = gain >= 0;
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] sm:text-[10px] font-semibold tabular-nums"
      style={{
        background: isPositive ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
        color: isPositive ? "var(--positive)" : "var(--negative)",
      }}
    >
      {isPositive ? "+" : ""}{gain.toFixed(1)}%
    </span>
  );
}

const INITIAL_ROWS = 5;

export default function IpoCard({ data }: Props) {
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [showAllListed, setShowAllListed] = useState(false);

  const upcoming = (data.upcoming as IpoItem[]) || [];
  const listed = (data.listed as IpoItem[]) || [];
  const source = data.source as string;

  const visibleUpcoming = showAllUpcoming ? upcoming : upcoming.slice(0, INITIAL_ROWS);
  const visibleListed = showAllListed ? listed : listed.slice(0, INITIAL_ROWS);

  return (
    <CardWrapper icon="🏷️" title="IPO Tracker">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <span style={{ fontSize: 15 }}>🚀</span>
        <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          IPO Tracker
        </span>
        <div className="ml-auto flex items-center gap-2">
          {source === "fallback" && (
            <span className="text-[10px]" style={{ color: "var(--muted)" }}>
              (cached data)
            </span>
          )}
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{ background: "rgba(201,169,110,0.1)", color: "var(--accent)" }}
          >
            {upcoming.length + listed.length} IPOs
          </span>
        </div>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
            Upcoming / Open
          </p>
          <div className="space-y-2">
            {visibleUpcoming.map((ipo, i) => (
              <div
                key={i}
                className="rounded-xl px-3 py-2.5"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium" style={{ color: "var(--foreground)" }}>{ipo.company}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px]" style={{ color: "var(--muted)" }}>
                      {ipo.open_date && <span>Opens: {ipo.open_date}</span>}
                      {ipo.close_date && <span>· Closes: {ipo.close_date}</span>}
                      {ipo.issue_size && (
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[9px]"
                          style={{ background: "rgba(201,169,110,0.06)", color: "var(--accent)" }}
                        >
                          {ipo.issue_size}
                        </span>
                      )}
                    </div>
                  </div>
                  {ipo.issue_price && (
                    <span className="shrink-0 text-xs font-semibold" style={{ color: "var(--accent)" }}>
                      ₹{ipo.issue_price}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {upcoming.length > INITIAL_ROWS && (
            <button
              onClick={() => setShowAllUpcoming((v) => !v)}
              className="mt-2 text-xs underline-offset-2 hover:underline"
              style={{ color: "var(--muted)" }}
            >
              {showAllUpcoming ? "Show less ↑" : `Show ${upcoming.length - INITIAL_ROWS} more ↓`}
            </button>
          )}
        </div>
      )}

      {/* Listed */}
      {listed.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
            Recent Listings
          </p>
          <div className="space-y-2">
            {visibleListed.map((ipo, i) => {
              return (
                <div
                  key={i}
                  className="rounded-xl px-3 py-2.5"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium" style={{ color: "var(--foreground)" }}>{ipo.company}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px]" style={{ color: "var(--muted)" }}>
                        {ipo.listing_date && <span>Listed: {ipo.listing_date}</span>}
                        {ipo.issue_price && <span>· Issue: ₹{ipo.issue_price}</span>}
                        {ipo.issue_size && (
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[9px]"
                            style={{ background: "rgba(201,169,110,0.06)", color: "var(--accent)" }}
                          >
                            {ipo.issue_size}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {ipo.current_price && (
                        <span className="text-xs font-medium tabular-nums" style={{ color: "var(--foreground)" }}>
                          ₹{ipo.current_price.toFixed(0)}
                        </span>
                      )}
                      {ipo.current_gain != null && <GainBadge gain={ipo.current_gain} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {listed.length > INITIAL_ROWS && (
            <button
              onClick={() => setShowAllListed((v) => !v)}
              className="mt-2 text-xs underline-offset-2 hover:underline"
              style={{ color: "var(--muted)" }}
            >
              {showAllListed ? "Show less ↑" : `Show ${listed.length - INITIAL_ROWS} more ↓`}
            </button>
          )}
        </div>
      )}

      {!upcoming.length && !listed.length && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          No IPO data available.
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
      <CardActions cardType="ipo" cardData={data} />
      <Disclaimer />
    </CardWrapper>
  );
}
