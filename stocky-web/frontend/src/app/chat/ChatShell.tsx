"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useChat } from "./hooks/useChat";
import { useConversations } from "./hooks/useConversations";
import { useMediaQuery } from "./hooks/useMediaQuery";
import ChatWindow, { type ChatWindowHandle } from "./components/ChatWindow";
import Sidebar from "./components/Sidebar";
import MobileBottomNav from "./components/MobileBottomNav";
import MobileHeader from "./components/MobileHeader";
import { PWAProvider } from "./components/PWAProvider";
import TerminalLoadingScreen from "./components/TerminalLoadingScreen";
import { TooltipProvider } from "./components/ui/Tooltip";
import { Toaster } from "sonner";
import { trackEvent } from "@/lib/analytics";

export default function ChatShell() {
  const chat = useChat();
  const { conversations, refresh, deleteConversation } = useConversations();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [booting, setBooting] = useState(true);
  const chatWindowRef = useRef<ChatWindowHandle>(null);

  const showSidebar = sidebarOpen;

  const handleSelectConversation = useCallback(
    (id: string) => {
      chat.loadConversation(id);
      if (!isDesktop) setSidebarOpen(false);
    },
    [chat, isDesktop],
  );

  const handleNewChat = useCallback(() => {
    chat.newChat();
    refresh();
    if (!isDesktop) setSidebarOpen(false);
  }, [chat, refresh, isDesktop]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteConversation(id);
      if (chat.conversationId === id) chat.newChat();
    },
    [deleteConversation, chat],
  );

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
    if (!sidebarOpen) refresh();
  }, [sidebarOpen, refresh]);

  const handleNavSend = useCallback((text: string) => {
    chat.sendMessage(text);
  }, [chat]);

  const handleOpenFeatureBar = useCallback(() => {
    chatWindowRef.current?.openFeatureBar();
  }, []);

  const handleEnterDeepResearch = useCallback(() => {
    chatWindowRef.current?.enterDeepResearch();
  }, []);

  // Global click tracker — captures every button/link on the /chat page
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest("button, [data-analytics], a");
      if (!el) return;
      const label =
        el.getAttribute("data-analytics") ||
        el.getAttribute("aria-label") ||
        (el as HTMLElement).textContent?.trim().slice(0, 60) ||
        "unknown";
      trackEvent("button_click", label, {
        tag: el.tagName.toLowerCase(),
        href: el.getAttribute("href") ?? undefined,
      });
    };
    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, []);

  return (
    <PWAProvider>
    <TooltipProvider>
      <AnimatePresence>
        {booting && (
          <TerminalLoadingScreen
            onComplete={() => setBooting(false)}
          />
        )}
      </AnimatePresence>
        <div className="flex h-dvh overflow-hidden" style={{ height: "100dvh" }}>
          {/* Sidebar */}
          <AnimatePresence>
            {showSidebar && (
              <>
                {/* Mobile backdrop */}
                {!isDesktop && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-40"
                    style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
                    onClick={() => setSidebarOpen(false)}
                  />
                )}
                <motion.aside
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: isDesktop ? 288 : 288, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className={`overflow-hidden ${!isDesktop ? "fixed left-0 top-0 bottom-0 z-50" : "relative"}`}
                  style={{ minWidth: 0 }}
                >
                  <Sidebar
                    conversations={conversations}
                    activeId={chat.conversationId}
                    onSelect={handleSelectConversation}
                    onNewChat={handleNewChat}
                    onDelete={handleDelete}
                  />
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          {/* Main chat area */}
          <div className="flex flex-1 flex-col min-w-0">
            {/* Mobile header — replaces desktop Header on small screens */}
            {!isDesktop && (
              <MobileHeader
                onNewChat={handleNewChat}
                onToggleSidebar={toggleSidebar}
              />
            )}

            <ChatWindow
              ref={chatWindowRef}
              messages={chat.messages}
              isLoading={chat.isLoading}
              onSend={chat.sendMessage}
              onTradeAction={chat.handleTradeAction}
              onNewChat={handleNewChat}
              onDeepResearch={chat.streamDeepResearch}
              onGeneralDeepResearch={chat.streamGeneralDeepResearch}
              onToggleSidebar={toggleSidebar}
              onRemoveLastAssistant={chat.removeLastAssistant}
              hideHeaderOnMobile={!isDesktop}
            />

            {/* Mobile bottom nav */}
            {!isDesktop && (
              <MobileBottomNav
                onSend={handleNavSend}
                onNewChat={handleNewChat}
                onOpenFeatureBar={handleOpenFeatureBar}
                onEnterDeepResearch={handleEnterDeepResearch}
              />
            )}
          </div>
        </div>
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              color: "var(--foreground)",
              borderRadius: "12px",
            },
          }}
          richColors
        />
    </TooltipProvider>
    </PWAProvider>
  );
}
