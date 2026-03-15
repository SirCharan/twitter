"use client";
import { useToast } from "../hooks/useToast";
import type { ToastType } from "../hooks/useToast";

const ICONS: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

const COLORS: Record<ToastType, { bg: string; border: string; text: string; bar: string }> = {
  success: {
    bg: "rgba(34, 197, 94, 0.08)",
    border: "rgba(34, 197, 94, 0.25)",
    text: "#22C55E",
    bar: "#22C55E",
  },
  error: {
    bg: "rgba(239, 68, 68, 0.08)",
    border: "rgba(239, 68, 68, 0.25)",
    text: "#EF4444",
    bar: "#EF4444",
  },
  info: {
    bg: "rgba(201, 169, 110, 0.08)",
    border: "rgba(201, 169, 110, 0.25)",
    text: "#C9A96E",
    bar: "#C9A96E",
  },
};

export default function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2"
      style={{ maxWidth: 320 }}
    >
      {toasts.map((t) => {
        const c = COLORS[t.type];
        return (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={`${t.exiting ? "toast-exit" : "toast-enter"} cursor-pointer overflow-hidden rounded-xl`}
            style={{
              background: c.bg,
              border: `1px solid ${c.border}`,
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="flex items-center gap-2.5 px-4 py-3">
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: c.border, color: c.text }}
              >
                {ICONS[t.type]}
              </span>
              <span
                className="text-xs font-medium"
                style={{ color: "var(--foreground)" }}
              >
                {t.message}
              </span>
            </div>
            {/* Auto-dismiss progress bar */}
            <div
              className="h-0.5"
              style={{
                background: c.bar,
                animation: "toastProgress 3s linear forwards",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
