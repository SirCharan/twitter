"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ConversationSummary } from "@/lib/types";
import { track } from "@/lib/analytics";

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

function getDateGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 86400) return "Today";
  if (diff < 172800) return "Yesterday";
  if (diff < 604800) return "This week";
  return "Older";
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
}: Props) {
  // Group conversations by date
  const groups: { label: string; items: ConversationSummary[] }[] = [];
  const seen = new Set<string>();
  for (const c of conversations) {
    const group = getDateGroup(c.last_active);
    if (!seen.has(group)) {
      seen.add(group);
      groups.push({ label: group, items: [] });
    }
    groups.find((g) => g.label === group)!.items.push(c);
  }

  return (
    <nav
      role="navigation"
      aria-label="Conversation history"
      className="flex h-full w-72 flex-col"
      style={{ background: "var(--surface)", borderRight: "1px solid var(--card-border)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-center px-5 py-6">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { track("click", "new_chat_logo"); onNewChat(); }}
          className="flex items-center gap-3 transition-opacity hover:opacity-80"
          style={{ background: "none", border: "none", cursor: "pointer" }}
          title="New conversation"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="Stocky" width={44} height={44} style={{ objectFit: "contain" }} />
          <span className="gradient-text text-2xl font-light tracking-widest">
            Stocky AI
          </span>
        </motion.button>
      </div>

      <div className="divider-gradient mx-4" />

      {/* Conversations */}
      <div className="sidebar-scroll flex-1 overflow-y-auto px-3 py-3">
        {conversations.length === 0 && (
          <p className="breathe px-2 py-8 text-center text-xs" style={{ color: "var(--muted)" }}>
            No conversations yet
          </p>
        )}
        <AnimatePresence>
          {groups.map((group) => (
            <div key={group.label} className="mb-2">
              <span
                className="mb-1 block px-3 text-[9px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--muted)", opacity: 0.5 }}
              >
                {group.label}
              </span>
              {group.items.map((c, i) => {
                const isActive = activeId === c.conversation_id;
                return (
                  <motion.div
                    key={c.conversation_id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12, height: 0 }}
                    transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 30 }}
                    onClick={() => { track("navigation", "load_conversation", { conversation_id: c.conversation_id }); onSelect(c.conversation_id); }}
                    aria-current={isActive ? "page" : undefined}
                    className="conv-item group mb-0.5 flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm"
                    style={{
                      borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                      background: isActive ? "var(--card-bg)" : undefined,
                      transition: "background 0.15s ease, border-color 0.2s ease",
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
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        track("click", "delete_conversation", { conversation_id: c.conversation_id });
                        onDelete(c.conversation_id);
                      }}
                      className="ml-2 rounded p-1 text-xs opacity-0 transition-all duration-200 group-hover:opacity-60 hover:!opacity-100"
                      style={{ color: "var(--muted)" }}
                      aria-label="Delete conversation"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 3l6 6M9 3l-6 6" />
                      </svg>
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          ))}
        </AnimatePresence>
      </div>

      <div className="divider-gradient mx-4" />

      {/* Footer */}
      <div className="px-5 py-4 flex items-center justify-between">
        <p className="text-[10px] tracking-wide" style={{ color: "var(--muted)" }}>
          Stocky AI
        </p>
        <a
          href="/analytics"
          className="bounce-tap text-[10px] tracking-wide transition-opacity hover:opacity-80"
          style={{ color: "var(--accent)" }}
        >
          Analytics
        </a>
      </div>
    </nav>
  );
}
