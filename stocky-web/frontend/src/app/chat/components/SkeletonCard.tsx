"use client";

import { motion } from "framer-motion";

export function SkeletonLine({ width = "100%" }: { width?: string }) {
  return (
    <div
      className="skeleton h-3 rounded-md"
      style={{ width }}
    />
  );
}

export function SkeletonMessage() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex justify-start"
    >
      <div
        className="max-w-[85%] rounded-2xl px-4 py-4 mr-6 sm:mr-12 space-y-3"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--card-border)",
          borderLeft: "2px solid var(--accent-dim)",
        }}
      >
        <SkeletonLine width="85%" />
        <SkeletonLine width="70%" />
        <SkeletonLine width="40%" />
      </div>
    </motion.div>
  );
}

/* ─── Context-aware skeleton variants ─── */

function SkeletonAnalysis() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="skeleton h-6 w-6 rounded-full" />
          <SkeletonLine width="140px" />
        </div>
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
      <div className="skeleton h-2 w-full rounded-full" />
      {/* Section placeholders */}
      {[1, 2].map((s) => (
        <div key={s} className="space-y-2">
          <SkeletonLine width="80px" />
          <div className="skeleton h-1.5 w-full rounded-full" />
          <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}>
            {[1, 2, 3, 4].map((r) => (
              <div key={r} className="flex justify-between"><SkeletonLine width="35%" /><SkeletonLine width="20%" /></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonOverview() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="skeleton h-6 w-6 rounded-full" />
        <SkeletonLine width="160px" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}>
            <SkeletonLine width="60%" />
            <div className="skeleton h-5 w-16 rounded" />
            <SkeletonLine width="40%" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonNews() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="skeleton h-6 w-6 rounded-full" />
        <SkeletonLine width="120px" />
      </div>
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => <div key={i} className="skeleton h-6 w-20 rounded-full" />)}
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-2 rounded-lg border p-3" style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}>
          <div className="skeleton h-4 w-4 rounded-full mt-0.5 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <SkeletonLine width="90%" />
            <SkeletonLine width="50%" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonScan() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="skeleton h-6 w-6 rounded-full" />
        <SkeletonLine width="120px" />
      </div>
      <div className="space-y-2">
        <div className="flex gap-4 px-2">
          {["40%", "15%", "15%", "15%", "15%"].map((w, i) => <SkeletonLine key={i} width={w} />)}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4 px-2">
            {["40%", "15%", "15%", "15%", "15%"].map((w, j) => <SkeletonLine key={j} width={w} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="skeleton h-6 w-6 rounded-full" />
        <SkeletonLine width="140px" />
      </div>
      <div className="skeleton rounded-xl" style={{ height: 300 }} />
    </div>
  );
}

function SkeletonMacro() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="skeleton h-6 w-6 rounded-full" />
        <SkeletonLine width="160px" />
      </div>
      {[1, 2, 3].map((s) => (
        <div key={s}>
          <SkeletonLine width="80px" />
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2" style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}>
                <SkeletonLine width="60%" />
                <div className="skeleton h-4 w-12 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonPortfolio() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="skeleton h-6 w-6 rounded-full" />
          <SkeletonLine width="100px" />
        </div>
        <div className="skeleton h-8 w-24 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border p-3 space-y-2" style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}>
            <SkeletonLine width="60%" />
            <div className="skeleton h-5 w-20 rounded" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between"><SkeletonLine width="30%" /><SkeletonLine width="15%" /></div>
        ))}
      </div>
    </div>
  );
}

/* ─── Type-aware skeleton selector ─── */

const SKELETON_MAP: Record<string, () => React.JSX.Element> = {
  analysis: SkeletonAnalysis,
  overview: SkeletonOverview,
  news: SkeletonNews,
  scan: SkeletonScan,
  chart: SkeletonChart,
  macro: SkeletonMacro,
  portfolio: SkeletonPortfolio,
};

export function SkeletonFor({ type }: { type?: string }) {
  const Variant = type ? SKELETON_MAP[type] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div
        className="rounded-2xl border p-5"
        style={{
          background: "var(--card-bg)",
          borderColor: "var(--card-border)",
        }}
      >
        {Variant ? <Variant /> : <DefaultSkeleton />}
      </div>
    </motion.div>
  );
}

function DefaultSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="skeleton h-6 w-6 rounded-full" />
          <SkeletonLine width="140px" />
        </div>
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
      <div className="skeleton h-2 w-full rounded-full" />
      <div className="space-y-3 pt-2">
        <SkeletonLine width="90%" />
        <SkeletonLine width="75%" />
        <SkeletonLine width="60%" />
        <SkeletonLine width="80%" />
      </div>
      <div className="space-y-2 pt-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between items-center">
            <SkeletonLine width="35%" />
            <SkeletonLine width="20%" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SkeletonCard() {
  return <SkeletonFor />;
}
