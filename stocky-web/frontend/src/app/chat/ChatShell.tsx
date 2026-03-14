"use client";
import { useChat } from "./hooks/useChat";
import ChatWindow from "./components/ChatWindow";

export default function ChatShell() {
  const chat = useChat();

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-1 flex-col min-w-0">
        <ChatWindow
          messages={chat.messages}
          isLoading={chat.isLoading}
          onSend={chat.sendMessage}
          onTradeAction={chat.handleTradeAction}
          onNewChat={chat.newChat}
          onDeepResearch={chat.streamDeepResearch}
          onGeneralDeepResearch={chat.streamGeneralDeepResearch}
        />
      </div>
    </div>
  );
}
