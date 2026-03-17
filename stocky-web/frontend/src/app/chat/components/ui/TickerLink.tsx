"use client";

interface TickerLinkProps {
  symbol: string;
  onSend?: (text: string) => void;
}

export default function TickerLink({ symbol, onSend }: TickerLinkProps) {
  const handleClick = () => {
    if (onSend) {
      onSend(`analyse ${symbol}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center rounded px-1 py-0.5 text-xs font-medium transition-colors hover:bg-white/5"
      style={{ color: "var(--accent)" }}
      title={`Analyse ${symbol}`}
    >
      {symbol}
    </button>
  );
}
