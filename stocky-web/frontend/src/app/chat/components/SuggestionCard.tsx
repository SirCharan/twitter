"use client";

import { motion } from "framer-motion";

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
          {suggestions.map((sym, i) => (
            <motion.button
              key={sym}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 25 }}
              whileHover={{ y: -2, boxShadow: "0 2px 12px rgba(201,169,110,0.15)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSend(`how is ${sym} doing`)}
              className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
              style={{
                borderColor: "var(--accent)",
                color: "var(--accent)",
                background: "rgba(201,169,110,0.08)",
              }}
            >
              {sym}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
