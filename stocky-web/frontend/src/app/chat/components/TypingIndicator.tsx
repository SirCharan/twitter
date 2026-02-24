export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 animate-fade-in">
      <div
        className="flex items-center gap-2.5 rounded-2xl px-5 py-3"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
      >
        <span className="text-xs tracking-wide" style={{ color: "var(--muted)" }}>
          Stocky is thinking
        </span>
        <div className="flex items-center gap-1">
          <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
          <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
          <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
        </div>
      </div>
    </div>
  );
}
