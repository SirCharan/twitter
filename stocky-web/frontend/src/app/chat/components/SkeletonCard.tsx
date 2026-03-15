"use client";

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
    <div className="slide-in-left flex justify-start">
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
    </div>
  );
}

export default function SkeletonCard() {
  return (
    <div className="slide-up">
      <div
        className="rounded-2xl border p-5 space-y-4"
        style={{
          background: "var(--card-bg)",
          borderColor: "var(--card-border)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="skeleton h-6 w-6 rounded-full" />
            <SkeletonLine width="140px" />
          </div>
          <div className="skeleton h-5 w-16 rounded-full" />
        </div>

        {/* Score bar placeholder */}
        <div className="skeleton h-2 w-full rounded-full" />

        {/* Content lines */}
        <div className="space-y-3 pt-2">
          <SkeletonLine width="90%" />
          <SkeletonLine width="75%" />
          <SkeletonLine width="60%" />
          <SkeletonLine width="80%" />
        </div>

        {/* Table-like rows */}
        <div className="space-y-2 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center">
              <SkeletonLine width="35%" />
              <SkeletonLine width="20%" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
