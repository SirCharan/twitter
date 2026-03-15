"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Tooltip from "./ui/Tooltip";
import { track } from "@/lib/analytics";

interface Props {
  onNewChat: () => void;
  onToggleSidebar: () => void;
  onFeedbackOpen: () => void;
}

interface LinkItem {
  label: string;
  href: string;
  color: string;
  icon?: React.ReactNode;
}

const LINKS: LinkItem[] = [
  { label: "Blog", href: "https://terminal.stockyai.xyz/blog", color: "var(--accent)" },
  { label: "Terminal", href: "https://terminal.stockyai.xyz", color: "var(--foreground)" },
  {
    label: "WhatsApp",
    href: "https://chat.whatsapp.com/E2iyS3SmHcj9zJq8tUyPxk",
    color: "#25D366",
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
];

export default function Header({ onNewChat, onToggleSidebar, onFeedbackOpen }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass flex items-center justify-between px-4 py-2 sm:px-5 sm:py-3"
      style={{ borderBottom: "1px solid var(--card-border)" }}
    >
      <div className="flex items-center gap-2.5">
        {/* Hamburger — mobile only */}
        <button
          onClick={onToggleSidebar}
          className="bounce-tap -ml-1 rounded-lg p-1.5 transition-colors hover:bg-white/5 sm:hidden"
          aria-label="Toggle sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3 5h12M3 9h12M3 13h12" />
          </svg>
        </button>

        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="Stocky" width={22} height={22} style={{ objectFit: "contain" }} />
        <span className="text-sm font-medium tracking-wide" style={{ color: "var(--foreground)" }}>
          Stocky AI
        </span>
        <Tooltip content="Connected">
          <div className="h-2 w-2 rounded-full" style={{ background: "var(--positive)" }} />
        </Tooltip>
      </div>

      <div className="flex items-center gap-2">
        {/* Desktop links */}
        {LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener"
            className="bounce-tap hidden sm:inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium tracking-wide transition-opacity hover:opacity-80"
            style={{ color: link.color, border: `1px solid color-mix(in srgb, ${link.color} 30%, transparent)` }}
          >
            {link.icon}
            {link.label}
          </a>
        ))}

        {/* Desktop feedback */}
        <button
          onClick={() => { onFeedbackOpen(); track("click", "feedback_open"); }}
          className="bounce-tap hidden sm:inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium tracking-wide transition-opacity hover:opacity-80"
          style={{ color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", background: "none" }}
        >
          &#9993; Feedback
        </button>

        {/* Mobile dropdown */}
        <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenu.Trigger asChild>
            <button
              className="bounce-tap rounded-lg p-1.5 transition-colors hover:bg-white/5 sm:hidden"
              aria-label="More options"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ color: "var(--muted)" }}>
                <circle cx="8" cy="3" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="8" cy="13" r="1.5" />
              </svg>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              sideOffset={8}
              align="end"
              className="z-50 min-w-[160px] rounded-xl border p-1.5"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--card-border)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }}
            >
              {LINKS.map((link) => (
                <DropdownMenu.Item key={link.label} asChild>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium outline-none transition-colors hover:bg-white/5"
                    style={{ color: link.color }}
                  >
                    {link.icon}
                    {link.label}
                  </a>
                </DropdownMenu.Item>
              ))}
              <DropdownMenu.Item asChild>
                <button
                  onClick={() => { onFeedbackOpen(); track("click", "feedback_open"); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium outline-none transition-colors hover:bg-white/5"
                  style={{ color: "#f87171" }}
                >
                  &#9993; Feedback
                </button>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* New chat */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          onClick={onNewChat}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium tracking-wide transition-all hover:opacity-90"
          style={{ background: "var(--accent)", color: "var(--background)" }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 1v10M1 6h10" />
          </svg>
          New
        </motion.button>
      </div>
    </motion.div>
  );
}
