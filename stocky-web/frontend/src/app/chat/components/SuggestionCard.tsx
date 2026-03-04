"use client";

interface Props {
  data: Record<string, unknown>;
  onSend: (text: string) => void;
}

export default function SuggestionCard({ data, onSend }: Props) {
  const query = data.query as string;
  const suggestions = (data.suggestions as string[]) || [];

  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>?</span>
      <div>
        <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
          Couldn&apos;t find <span style={{ color: "var(--accent)" }}>&ldquo;{query}&rdquo;</span>. Did you mean:
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions.map((sym) => (
            <button
              key={sym}
              onClick={() => onSend(`how is ${sym} doing`)}
              className="rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:opacity-80"
              style={{
                borderColor: "var(--accent)",
                color: "var(--accent)",
                background: "rgba(201,169,110,0.08)",
              }}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
