"use client";

const TAG_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  BUY:   { bg: "rgba(34,197,94,0.12)",  text: "#22c55e", border: "rgba(34,197,94,0.3)" },
  HOLD:  { bg: "rgba(234,179,8,0.12)",  text: "#eab308", border: "rgba(234,179,8,0.3)" },
  SELL:  { bg: "rgba(239,68,68,0.12)",  text: "#ef4444", border: "rgba(239,68,68,0.3)" },
  ALERT: { bg: "rgba(59,130,246,0.12)", text: "#3b82f6", border: "rgba(59,130,246,0.3)" },
  WATCH: { bg: "rgba(156,163,175,0.12)", text: "#9ca3af", border: "rgba(156,163,175,0.3)" },
};

interface Props {
  tag: string;
  size?: "sm" | "md" | "lg";
}

export default function ActionTag({ tag, size = "md" }: Props) {
  const key = tag?.toUpperCase() || "WATCH";
  const style = TAG_STYLES[key] || TAG_STYLES.WATCH;

  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-3 py-1",
    lg: "text-sm px-4 py-1.5",
  };

  return (
    <span
      className={`inline-flex items-center font-bold tracking-wider rounded-full border ${sizeClasses[size]}`}
      style={{
        background: style.bg,
        color: style.text,
        borderColor: style.border,
      }}
    >
      {key}
    </span>
  );
}
