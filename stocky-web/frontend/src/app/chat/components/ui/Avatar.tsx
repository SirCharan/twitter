"use client";

interface Props {
  role: "user" | "assistant";
  initials?: string;
}

export default function Avatar({ role, initials = "CK" }: Props) {
  if (role === "assistant") {
    return (
      <div
        className="avatar-ring flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold select-none"
        style={{
          background: "rgba(201,169,110,0.12)",
          color: "var(--accent)",
          border: "1px solid rgba(201,169,110,0.25)",
        }}
        aria-hidden="true"
      >
        S
      </div>
    );
  }

  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold select-none"
      style={{
        background: "var(--surface)",
        color: "var(--muted)",
        border: "1px solid var(--card-border)",
      }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
