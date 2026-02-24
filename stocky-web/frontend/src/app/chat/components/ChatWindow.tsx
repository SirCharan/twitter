import { useRef, useEffect } from "react";
import type { ChatMessage } from "@/lib/types";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import TypingIndicator from "./TypingIndicator";

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (text: string) => void;
  onTradeAction: (actionId: string, action: "confirm" | "cancel") => void;
  onMenuClick: () => void;
}

const SUGGESTIONS = [
  { label: "Analyse a stock", text: "how is reliance doing" },
  { label: "Market overview", text: "how's the market" },
  { label: "Check portfolio", text: "my portfolio" },
  { label: "Latest news", text: "market news" },
];

export default function ChatWindow({
  messages,
  isLoading,
  onSend,
  onTradeAction,
  onMenuClick,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const showEmpty = messages.length === 0 && !isLoading;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div
        className="glass flex items-center gap-3 px-5 py-3"
        style={{ borderBottom: "1px solid var(--card-border)" }}
      >
        <button onClick={onMenuClick} className="md:hidden" style={{ color: "var(--muted)" }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 5h14M3 10h14M3 15h14" />
          </svg>
        </button>
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="Stocky" width={22} height={22} style={{ objectFit: "contain" }} />
          <span className="text-sm font-medium tracking-wide" style={{ color: "var(--foreground)" }}>
            Stocky AI
          </span>
          <div className="h-2 w-2 rounded-full" style={{ background: "var(--positive)" }} />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {showEmpty && (
          <div className="flex h-full flex-col items-center justify-center">
            <div
              className="pointer-events-none absolute"
              style={{
                width: 500,
                height: 500,
                background: "radial-gradient(circle, rgba(201,169,110,0.03) 0%, transparent 70%)",
              }}
            />
            <div className="relative text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-mark.png"
                alt="Stocky"
                width={56}
                height={56}
                className="mx-auto mb-4"
                style={{ objectFit: "contain", opacity: 0.85 }}
              />
              <p className="gradient-text-shimmer text-3xl font-light tracking-widest">
                Stocky
              </p>
              <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
                Your AI trading assistant. Ask me anything.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => onSend(s.text)}
                    className="suggestion-chip rounded-full border px-4 py-2 text-xs"
                    style={{
                      borderColor: "var(--card-border)",
                      color: "var(--foreground)",
                      background: "transparent",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-3xl space-y-5">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} onTradeAction={onTradeAction} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2">
        <div className="mx-auto max-w-3xl">
          <ChatInput onSend={onSend} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}
