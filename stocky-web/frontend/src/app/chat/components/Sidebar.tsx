import type { ConversationSummary } from "@/lib/types";
import { logout } from "@/lib/api";

interface Props {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
}: Props) {
  return (
    <div
      className="flex h-full flex-col"
      style={{ background: "var(--surface)", borderRight: "1px solid var(--card-border)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="Stocky" width={28} height={28} style={{ objectFit: "contain" }} />
          <span className="gradient-text text-lg font-light tracking-widest">
            Stocky
          </span>
        </div>
        <button
          onClick={onNewChat}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium tracking-wide transition-all hover:opacity-90"
          style={{ background: "var(--accent)", color: "var(--background)" }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 1v10M1 6h10" />
          </svg>
          New
        </button>
      </div>

      <div className="divider-gradient mx-4" />

      {/* Conversations */}
      <div className="sidebar-scroll flex-1 overflow-y-auto px-3 py-3">
        {conversations.length === 0 && (
          <p className="px-2 py-8 text-center text-xs" style={{ color: "var(--muted)" }}>
            No conversations yet
          </p>
        )}
        {conversations.map((c) => {
          const isActive = activeId === c.conversation_id;
          return (
            <div
              key={c.conversation_id}
              onClick={() => onSelect(c.conversation_id)}
              className={`conv-item group mb-0.5 flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm ${
                isActive ? "bg-[var(--card-bg)]" : ""
              }`}
              style={{
                borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
              }}
            >
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[13px]"
                  style={{ color: "var(--foreground)", opacity: isActive ? 1 : 0.8 }}
                >
                  {c.preview || "New conversation"}
                </p>
                <p className="mt-0.5 text-[11px]" style={{ color: "var(--muted)" }}>
                  {timeAgo(c.last_active)}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(c.conversation_id);
                }}
                className="ml-2 hidden rounded p-1 text-xs opacity-40 transition-opacity hover:opacity-100 group-hover:block"
                style={{ color: "var(--muted)" }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 3l6 6M9 3l-6 6" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      <div className="divider-gradient mx-4" />

      {/* Footer */}
      <div className="px-5 py-4">
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs transition-opacity hover:opacity-80"
          style={{ color: "var(--muted)" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M5 1H3a2 2 0 00-2 2v8a2 2 0 002 2h2M9 10l3-3-3-3M5.5 7H12" />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  );
}
