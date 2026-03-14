"use client";
import { useEffect, useState } from "react";
import { getAnalyticsDashboard, type AnalyticsDashboard } from "@/lib/api";

type Range = 7 | 30 | 90;

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [range, setRange] = useState<Range>(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAnalyticsDashboard(range)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [range]);

  return (
    <div
      className="min-h-screen px-4 py-8 sm:px-8"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      {/* Header */}
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/chat" className="text-xs hover:opacity-70" style={{ color: "var(--muted)" }}>
              &larr; Back
            </a>
            <h1 className="gradient-text text-2xl font-light tracking-widest">Analytics</h1>
          </div>
          <div
            className="inline-flex rounded-lg p-0.5"
            style={{ background: "var(--surface)", border: "1px solid var(--card-border)" }}
          >
            {([7, 30, 90] as Range[]).map((d) => (
              <button
                key={d}
                onClick={() => setRange(d)}
                className="rounded-md px-3 py-1.5 text-[11px] font-medium transition-all"
                style={{
                  background: range === d ? "rgba(201,169,110,0.12)" : "transparent",
                  color: range === d ? "var(--accent)" : "var(--muted)",
                }}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: "var(--accent)" }} />
          </div>
        )}

        {!loading && !data && (
          <p className="py-20 text-center text-sm" style={{ color: "var(--muted)" }}>
            Failed to load analytics data. Is the backend running?
          </p>
        )}

        {!loading && data && (
          <>
            {/* Summary Cards */}
            <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SummaryCard label="Today" value={data.summary.today} />
              <SummaryCard label="All Time" value={data.summary.alltime} />
              <SummaryCard label="Sessions Today" value={data.summary.sessions_today} />
              <SummaryCard
                label="Platforms"
                value={data.platform_breakdown.length}
                sub={data.platform_breakdown.map((p) => `${p.platform}: ${p.count}`).join(", ")}
              />
            </div>

            {/* Charts Row */}
            <div className="mb-8 grid gap-6 lg:grid-cols-2">
              <Card title="Daily Activity">
                <BarChart
                  data={data.daily_counts.map((d) => ({ label: d.day.slice(5), value: d.count }))}
                />
              </Card>
              <Card title="Hourly Distribution">
                <BarChart
                  data={data.hourly_distribution.map((d) => ({
                    label: `${d.hour.toString().padStart(2, "0")}`,
                    value: d.count,
                  }))}
                />
              </Card>
            </div>

            {/* Features + Recent */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="Top Events">
                <div className="space-y-2">
                  {data.feature_counts.map((f) => {
                    const max = data.feature_counts[0]?.count || 1;
                    return (
                      <div key={f.name} className="flex items-center gap-3">
                        <span
                          className="w-36 truncate text-xs font-medium"
                          style={{ color: "var(--foreground)" }}
                        >
                          {f.name}
                        </span>
                        <div className="flex-1">
                          <div
                            className="h-5 rounded-md"
                            style={{
                              width: `${Math.max((f.count / max) * 100, 4)}%`,
                              background: "var(--accent)",
                              opacity: 0.7,
                            }}
                          />
                        </div>
                        <span className="text-xs tabular-nums" style={{ color: "var(--muted)" }}>
                          {f.count}
                        </span>
                      </div>
                    );
                  })}
                  {data.feature_counts.length === 0 && (
                    <p className="py-4 text-center text-xs" style={{ color: "var(--muted)" }}>
                      No events yet
                    </p>
                  )}
                </div>
              </Card>

              <Card title="Recent Activity">
                <div className="max-h-80 space-y-1.5 overflow-y-auto">
                  {data.recent_activity.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between rounded-lg px-3 py-2"
                      style={{ background: "rgba(255,255,255,0.02)" }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <EventBadge type={e.event_type} />
                          <span className="truncate text-xs" style={{ color: "var(--foreground)" }}>
                            {e.event_name}
                          </span>
                        </div>
                        {e.event_data && (
                          <p className="mt-0.5 truncate text-[10px]" style={{ color: "var(--muted)" }}>
                            {Object.entries(e.event_data)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="ml-3 flex shrink-0 items-center gap-2">
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                          style={{
                            background: e.platform === "web" ? "rgba(59,130,246,0.1)" : "rgba(168,85,247,0.1)",
                            color: e.platform === "web" ? "#60a5fa" : "#a78bfa",
                          }}
                        >
                          {e.platform}
                        </span>
                        <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)" }}>
                          {formatTime(e.ts)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {data.recent_activity.length === 0 && (
                    <p className="py-4 text-center text-xs" style={{ color: "var(--muted)" }}>
                      No events yet
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ── */

function SummaryCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div
      className="rounded-xl border px-5 py-4"
      style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-light tabular-nums" style={{ color: "var(--accent)" }}>
        {value.toLocaleString()}
      </p>
      {sub && (
        <p className="mt-1 text-[10px]" style={{ color: "var(--muted)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border px-5 py-4"
      style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}
    >
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-xs" style={{ color: "var(--muted)" }}>
        No data yet
      </p>
    );
  }
  return (
    <div className="flex items-end gap-px" style={{ height: 120 }}>
      {data.map((d, i) => (
        <div key={i} className="group relative flex flex-1 flex-col items-center justify-end" style={{ height: "100%" }}>
          <div
            className="w-full rounded-t-sm transition-opacity group-hover:opacity-100"
            style={{
              height: `${Math.max((d.value / max) * 100, 2)}%`,
              background: "var(--accent)",
              opacity: 0.6,
              minHeight: 2,
            }}
          />
          {/* Tooltip */}
          <div
            className="pointer-events-none absolute -top-8 hidden rounded-md px-2 py-1 text-[10px] font-medium group-hover:block"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--foreground)" }}
          >
            {d.value}
          </div>
          {data.length <= 31 && (
            <span className="mt-1 text-[8px] tabular-nums" style={{ color: "var(--muted)" }}>
              {d.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function EventBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    click: "#60a5fa",
    query: "#34d399",
    feature_use: "#fbbf24",
    trade_action: "#f87171",
    navigation: "#a78bfa",
  };
  const color = colors[type] || "var(--muted)";
  return (
    <span
      className="rounded-full px-1.5 py-0.5 text-[9px] font-medium"
      style={{ background: `${color}15`, color }}
    >
      {type}
    </span>
  );
}

function formatTime(ts: string): string {
  const d = new Date(ts + "Z");
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
