"use client";

interface ConfidenceBadgeProps {
  score: number;
}

export default function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  const color =
    score >= 70
      ? "rgb(34,197,94)"
      : score >= 40
        ? "rgb(234,179,8)"
        : "rgb(239,68,68)";

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{
        background: `${color}15`,
        color,
        border: `1px solid ${color}30`,
      }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
      />
      {score}% confident
    </span>
  );
}
