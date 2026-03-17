"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import type { AnalysisData } from "@/lib/types";
import CardWrapper from "./ui/CardWrapper";
import AnimatedNumber from "./ui/AnimatedNumber";

function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  const pct = (score / max) * 100;
  const color = pct >= 70 ? "var(--positive)" : pct >= 40 ? "var(--accent)" : "var(--negative)";

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--card-border)" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span className="count-flash text-xs font-medium tabular-nums" style={{ color }}>
        {score.toFixed(1)}/{max}
      </span>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number | undefined }) {
  if (value === undefined || value === null) return null;
  return (
    <div className="row-hover flex items-center justify-between py-1 px-1 -mx-1 rounded">
      <span className="text-xs" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
        {typeof value === "number" ? value.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : value}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

export default function AnalysisCard({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as AnalysisData;
  const [showAllNews, setShowAllNews] = useState(false);
  const [showDetailedResults, setShowDetailedResults] = useState(false);

  return (
    <CardWrapper icon="📊" title={d.name || d.symbol} depth="elevated">
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs" style={{ color: "var(--muted)" }}>{d.symbol}</p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: "var(--muted)" }}>Overall Score</p>
          <p className="text-lg font-semibold" style={{ color: "var(--accent)" }}>
            <AnimatedNumber value={d.overall_score} decimals={1} suffix="/30" />
          </p>
        </div>
      </div>

      {/* Overall score bar */}
      <ScoreBar score={d.overall_score} max={30} />

      {/* Technical */}
      {d.technical && (
        <Section title="Technical">
          <ScoreBar score={d.technical.score} />
          <div className="mt-1 rounded-lg border p-2" style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}>
            <StatRow label="Price" value={d.technical.price} />
            <StatRow label="RSI" value={d.technical.rsi != null ? `${d.technical.rsi.toFixed(1)} (${d.technical.rsi_label || ""})` : undefined} />
            <StatRow label="MACD" value={d.technical.macd_signal} />
            <StatRow label="SMA Signal" value={d.technical.sma_signal} />
            {d.technical.sma50 != null && <StatRow label="SMA 50" value={d.technical.sma50} />}
            {d.technical.sma200 != null && <StatRow label="SMA 200" value={d.technical.sma200} />}
            {d.technical.volume_ratio != null && <StatRow label="Volume Ratio" value={`${d.technical.volume_ratio.toFixed(2)}x`} />}
            {d.technical.range_52w && (
              <StatRow label="52W Range Position" value={`${(d.technical.range_52w.position * 100).toFixed(0)}%`} />
            )}
            {d.technical.changes && d.technical.changes.length > 0 && (
              <div className="mt-1 flex gap-2">
                {d.technical.changes.map((c) => (
                  <span
                    key={c.period}
                    className="rounded px-1.5 py-0.5 text-xs"
                    style={{
                      background: "var(--card-bg)",
                      color: c.pct >= 0 ? "var(--positive)" : "var(--negative)",
                    }}
                  >
                    {c.period}: {c.pct >= 0 ? "+" : ""}{c.pct.toFixed(1)}%
                  </span>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Fundamental */}
      {d.fundamental && (
        <Section title="Fundamental">
          <ScoreBar score={d.fundamental.score} />
          <div className="mt-1 rounded-lg border p-2" style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}>
            {d.fundamental.sector && <StatRow label="Sector" value={d.fundamental.sector} />}
            <StatRow label="P/E" value={d.fundamental.pe} />
            <StatRow label="Forward P/E" value={d.fundamental.forward_pe} />
            <StatRow label="P/B" value={d.fundamental.pb} />
            <StatRow label="ROE" value={d.fundamental.roe != null ? `${d.fundamental.roe.toFixed(1)}%` : undefined} />
            <StatRow label="D/E" value={d.fundamental.debt_to_equity} />
            <StatRow label="Profit Margin" value={d.fundamental.profit_margin != null ? `${(d.fundamental.profit_margin * 100).toFixed(1)}%` : undefined} />
            <StatRow label="Earnings Growth" value={d.fundamental.earnings_growth != null ? `${(d.fundamental.earnings_growth * 100).toFixed(1)}%` : undefined} />
            <StatRow label="Revenue Growth" value={d.fundamental.revenue_growth != null ? `${(d.fundamental.revenue_growth * 100).toFixed(1)}%` : undefined} />
            <StatRow label="Dividend Yield" value={d.fundamental.dividend_yield != null ? `${(d.fundamental.dividend_yield * 100).toFixed(2)}%` : undefined} />
            {d.fundamental.market_cap != null && (
              <StatRow
                label="Market Cap"
                value={
                  d.fundamental.market_cap >= 1e12
                    ? `₹${(d.fundamental.market_cap / 1e12).toFixed(2)}T`
                    : d.fundamental.market_cap >= 1e9
                      ? `₹${(d.fundamental.market_cap / 1e9).toFixed(2)}B`
                      : `₹${(d.fundamental.market_cap / 1e7).toFixed(0)}Cr`
                }
              />
            )}
          </div>
        </Section>
      )}

      {/* News */}
      {d.news && (
        <Section title="News Sentiment">
          <ScoreBar score={d.news.score} />
          {d.news.articles && d.news.articles.length > 0 && (
            <div className="mt-1 space-y-1">
              {showAllNews && d.news.analysis && (
                <div
                  className="mb-1 rounded-lg border-l-2 px-3 py-2"
                  style={{ borderColor: "var(--accent)", background: "var(--surface)" }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                    Stocky's Take
                  </p>
                  <p className="mt-1 text-sm" style={{ color: "var(--foreground)" }}>
                    {d.news.analysis}
                  </p>
                </div>
              )}
              {(showAllNews ? d.news.articles : d.news.articles.slice(0, 3)).map((a, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border p-2" style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}>
                  <span className="mt-0.5 text-xs">
                    {a.sentiment > 0 ? "▲" : a.sentiment < 0 ? "▼" : "●"}
                  </span>
                  <div className="min-w-0 flex-1">
                    {a.link ? (
                      <a
                        href={a.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs hover:underline"
                        style={{ color: "var(--foreground)" }}
                      >
                        {a.title}
                      </a>
                    ) : (
                      <p className="text-xs" style={{ color: "var(--foreground)" }}>{a.title}</p>
                    )}
                    <p className="text-xs" style={{ color: "var(--muted)" }}>{a.source}</p>
                  </div>
                </div>
              ))}
              {d.news.articles.length > 3 && (
                <button
                  onClick={() => setShowAllNews((v) => !v)}
                  className="bounce-tap mt-0.5 text-xs underline-offset-2 hover:underline"
                  style={{ color: "var(--muted)" }}
                >
                  {showAllNews ? "Show less ↑" : `Explore more news ↓ (${d.news.articles.length - 3} more)`}
                </button>
              )}
            </div>
          )}
        </Section>
      )}

      {/* Quarterly Results */}
      {d.quarterly && d.quarterly.length > 0 && (
        <Section title="Quarterly Results">
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--card-border)" }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "var(--surface)" }}>
                  <th className="whitespace-nowrap px-2 py-1.5 text-left font-medium" style={{ color: "var(--muted)" }}>Period</th>
                  <th className="whitespace-nowrap px-2 py-1.5 text-right font-medium" style={{ color: "var(--muted)" }}>Revenue</th>
                  <th className="whitespace-nowrap px-2 py-1.5 text-right font-medium" style={{ color: "var(--muted)" }}>Net Income</th>
                  <th className="whitespace-nowrap px-2 py-1.5 text-right font-medium" style={{ color: "var(--muted)" }}>EPS</th>
                </tr>
              </thead>
              <tbody>
                {d.quarterly.map((q, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--card-border)" }}>
                    <td className="whitespace-nowrap px-2 py-1.5" style={{ color: "var(--foreground)" }}>{q.period}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right">
                      <span style={{ color: "var(--foreground)" }}>
                        {q.revenue != null ? `₹${(q.revenue / 1e7).toFixed(0)}Cr` : "—"}
                      </span>
                      {showDetailedResults && q.revenue != null && (
                        <div className="mt-0.5 flex justify-end gap-1.5">
                          {q.revenue_qoq != null && (
                            <span className="text-[10px]" style={{ color: q.revenue_qoq >= 0 ? "var(--positive)" : "var(--negative)" }}>
                              {q.revenue_qoq >= 0 ? "+" : ""}{q.revenue_qoq}% QoQ
                            </span>
                          )}
                          {q.revenue_yoy != null && (
                            <span className="text-[10px]" style={{ color: q.revenue_yoy >= 0 ? "var(--positive)" : "var(--negative)" }}>
                              {q.revenue_yoy >= 0 ? "+" : ""}{q.revenue_yoy}% YoY
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <span style={{ color: "var(--foreground)" }}>
                        {q.net_income != null ? `₹${(q.net_income / 1e7).toFixed(0)}Cr` : "—"}
                      </span>
                      {showDetailedResults && q.net_income != null && (
                        <div className="mt-0.5 flex justify-end gap-1.5">
                          {q.net_income_qoq != null && (
                            <span className="text-[10px]" style={{ color: q.net_income_qoq >= 0 ? "var(--positive)" : "var(--negative)" }}>
                              {q.net_income_qoq >= 0 ? "+" : ""}{q.net_income_qoq}% QoQ
                            </span>
                          )}
                          {q.net_income_yoy != null && (
                            <span className="text-[10px]" style={{ color: q.net_income_yoy >= 0 ? "var(--positive)" : "var(--negative)" }}>
                              {q.net_income_yoy >= 0 ? "+" : ""}{q.net_income_yoy}% YoY
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <span style={{ color: "var(--foreground)" }}>
                        {q.eps != null ? `₹${q.eps.toFixed(2)}` : "—"}
                      </span>
                      {showDetailedResults && q.eps != null && (
                        <div className="mt-0.5 flex justify-end gap-1.5">
                          {q.eps_qoq != null && (
                            <span className="text-[10px]" style={{ color: q.eps_qoq >= 0 ? "var(--positive)" : "var(--negative)" }}>
                              {q.eps_qoq >= 0 ? "+" : ""}{q.eps_qoq}% QoQ
                            </span>
                          )}
                          {q.eps_yoy != null && (
                            <span className="text-[10px]" style={{ color: q.eps_yoy >= 0 ? "var(--positive)" : "var(--negative)" }}>
                              {q.eps_yoy >= 0 ? "+" : ""}{q.eps_yoy}% YoY
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => setShowDetailedResults((v) => !v)}
            className="bounce-tap mt-1.5 text-xs underline-offset-2 hover:underline"
            style={{ color: "var(--muted)" }}
          >
            {showDetailedResults ? "Hide details ↑" : "See detailed results ↓"}
          </button>
        </Section>
      )}

      {/* Shareholding */}
      {d.shareholding && d.shareholding.length > 0 && (
        <Section title="Shareholding">
          <div className="space-y-1">
            {d.shareholding.map((s, i) => {
              const pct = typeof s.percentage === "number" ? s.percentage : parseFloat(String(s.percentage)) || 0;
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-24 truncate text-xs" style={{ color: "var(--muted)" }}>{s.description}</span>
                  <div className="flex-1 rounded-full" style={{ background: "var(--card-border)", height: 6 }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: "var(--accent)" }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>{pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Verdict */}
      {d.verdict && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 25 }}
          className="mt-3 rounded-lg border-l-2 px-3 py-2"
          style={{ borderColor: "var(--accent)", background: "linear-gradient(135deg, rgba(201,169,110,0.04) 0%, var(--surface) 100%)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
            Stocky's Verdict
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--foreground)" }}>
            {d.verdict}
          </p>
        </motion.div>
      )}
    </div>
    </CardWrapper>
  );
}
