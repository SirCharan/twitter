"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Briefcase, TrendingUp, FlaskConical, Grid2x2 } from "lucide-react";

interface Props {
  onSend: (text: string) => void;
  onNewChat: () => void;
  onOpenFeatureBar: () => void;
  onEnterDeepResearch: () => void;
}

const TABS = [
  {
    id: "chat",
    label: "Chat",
    Icon: MessageSquare,
  },
  {
    id: "portfolio",
    label: "Portfolio",
    Icon: Briefcase,
  },
  {
    id: "markets",
    label: "Markets",
    Icon: TrendingUp,
  },
  {
    id: "research",
    label: "Research",
    Icon: FlaskConical,
  },
  {
    id: "tools",
    label: "Tools",
    Icon: Grid2x2,
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function MobileBottomNav({ onSend, onNewChat, onOpenFeatureBar, onEnterDeepResearch }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("chat");

  // Reset to "chat" after auto-send tabs trigger
  useEffect(() => {
    if (activeTab === "portfolio" || activeTab === "markets") {
      const t = setTimeout(() => setActiveTab("chat"), 2000);
      return () => clearTimeout(t);
    }
  }, [activeTab]);

  function handlePress(id: TabId) {
    setActiveTab(id);
    switch (id) {
      case "chat":
        onNewChat();
        break;
      case "portfolio":
        onSend("show my portfolio holdings");
        break;
      case "markets":
        onSend("how's the market today");
        break;
      case "research":
        onEnterDeepResearch();
        break;
      case "tools":
        onOpenFeatureBar();
        break;
    }
  }

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bottom-nav-bar"
      style={{
        background: "var(--glass)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid var(--glass-border)",
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch justify-around px-1 pt-1.5">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => handlePress(tab.id)}
              className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition-colors"
              style={{
                color: isActive ? "var(--accent)" : "var(--muted)",
                background: isActive ? "rgba(201,169,110,0.07)" : "transparent",
              }}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              <tab.Icon
                size={20}
                strokeWidth={isActive ? 2.2 : 1.5}
              />
              <span
                className="text-[10px] font-medium tracking-wide leading-none"
                style={{ color: isActive ? "var(--accent)" : "var(--muted)" }}
              >
                {tab.label}
              </span>
              {isActive && <div className="nav-active-dot mt-0.5" />}
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
}
