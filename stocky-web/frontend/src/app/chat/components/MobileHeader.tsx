"use client";

import { motion } from "framer-motion";
import { Menu, Plus } from "lucide-react";

interface Props {
  onNewChat: () => void;
  onToggleSidebar: () => void;
}

export default function MobileHeader({ onNewChat, onToggleSidebar }: Props) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="md:hidden flex shrink-0 items-center justify-between px-4 h-14"
      style={{
        background: "var(--glass)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--card-border)",
      }}
    >
      {/* Left: history sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        className="bounce-tap flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-white/5"
        aria-label="Conversation history"
        style={{ color: "var(--muted)" }}
      >
        <Menu size={20} strokeWidth={1.5} />
      </button>

      {/* Center: logo + name + live dot */}
      <button
        onClick={onNewChat}
        className="flex items-center gap-2 transition-opacity hover:opacity-80 active:opacity-70"
        aria-label="Start new chat"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="Stocky" width={22} height={22} style={{ objectFit: "contain" }} />
        <span className="gradient-text-shimmer text-base font-light tracking-widest">
          Stocky
        </span>
        <div
          className="live-dot h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--positive)" }}
        />
      </button>

      {/* Right: new chat */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={onNewChat}
        className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-white/5"
        style={{ color: "var(--accent)" }}
        aria-label="New chat"
      >
        <Plus size={20} strokeWidth={1.5} />
      </motion.button>
    </motion.header>
  );
}
