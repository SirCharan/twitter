"use client";
import { useState } from "react";
import { useChat } from "./hooks/useChat";
import { useConversations } from "./hooks/useConversations";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";

export default function ChatShell() {
  const chat = useChat();
  const convs = useConversations();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleSelectConversation(id: string) {
    chat.loadConversation(id);
    setSidebarOpen(false);
  }

  function handleNewChat() {
    chat.newChat();
    setSidebarOpen(false);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 transform transition-transform md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          conversations={convs.conversations}
          activeId={chat.conversationId}
          onSelect={handleSelectConversation}
          onNewChat={handleNewChat}
          onDelete={convs.deleteConversation}
        />
      </div>

      {/* Chat */}
      <div className="flex flex-1 flex-col min-w-0">
        <ChatWindow
          messages={chat.messages}
          isLoading={chat.isLoading}
          onSend={chat.sendMessage}
          onTradeAction={chat.handleTradeAction}
          onMenuClick={() => setSidebarOpen(true)}
          onDeepResearch={chat.streamDeepResearch}
        />
      </div>
    </div>
  );
}
