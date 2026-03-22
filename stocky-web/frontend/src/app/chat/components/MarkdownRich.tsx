"use client";
import React, { Fragment, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

/* ── Tag color map for verdict/signal badges ── */
const TAG_COLORS: Record<string, { bg: string; color: string }> = {
  // Verdict
  BUY:       { bg: "rgba(34,197,94,0.15)",  color: "#22c55e" },
  SELL:      { bg: "rgba(239,68,68,0.15)",   color: "#ef4444" },
  HOLD:      { bg: "rgba(201,169,110,0.15)", color: "#C9A96E" },
  AVOID:     { bg: "rgba(239,68,68,0.15)",   color: "#ef4444" },
  // Impact
  HIGH:      { bg: "rgba(239,68,68,0.12)",   color: "#ef4444" },
  MEDIUM:    { bg: "rgba(234,179,8,0.12)",   color: "#eab308" },
  LOW:       { bg: "rgba(34,197,94,0.12)",   color: "#22c55e" },
  // Direction
  BULLISH:   { bg: "rgba(34,197,94,0.12)",   color: "#22c55e" },
  BEARISH:   { bg: "rgba(239,68,68,0.12)",   color: "#ef4444" },
  NEUTRAL:   { bg: "rgba(156,163,175,0.12)", color: "#9ca3af" },
  // Regime
  "RISK-ON": { bg: "rgba(34,197,94,0.12)",   color: "#22c55e" },
  "RISK-OFF":{ bg: "rgba(239,68,68,0.12)",   color: "#ef4444" },
  MIXED:     { bg: "rgba(234,179,8,0.12)",   color: "#eab308" },
  // IPO
  HOT:       { bg: "rgba(239,68,68,0.12)",   color: "#ef4444" },
  WARM:      { bg: "rgba(234,179,8,0.12)",   color: "#eab308" },
  COLD:      { bg: "rgba(96,165,250,0.12)",  color: "#60a5fa" },
  SELECTIVE: { bg: "rgba(201,169,110,0.12)", color: "#C9A96E" },
  // Valuation
  CHEAP:     { bg: "rgba(34,197,94,0.12)",   color: "#22c55e" },
  FAIR:      { bg: "rgba(234,179,8,0.12)",   color: "#eab308" },
  EXPENSIVE: { bg: "rgba(239,68,68,0.12)",   color: "#ef4444" },
  // Quality
  "A+":      { bg: "rgba(34,197,94,0.15)",   color: "#22c55e" },
  A:         { bg: "rgba(34,197,94,0.12)",   color: "#22c55e" },
  "B+":      { bg: "rgba(234,179,8,0.12)",   color: "#eab308" },
  B:         { bg: "rgba(234,179,8,0.10)",   color: "#eab308" },
  C:         { bg: "rgba(239,68,68,0.10)",   color: "#ef4444" },
  // Sustainability
  STRONG:    { bg: "rgba(34,197,94,0.12)",   color: "#22c55e" },
  ADEQUATE:  { bg: "rgba(234,179,8,0.12)",   color: "#eab308" },
  "AT RISK": { bg: "rgba(239,68,68,0.12)",   color: "#ef4444" },
};

/* ── Inline formatting: **bold**, `code`, *italic*, [TAG] badges ── */
export function renderInline(text: string) {
  const parts: Array<{ type: "text" | "bold" | "code" | "italic" | "tag"; value: string }> = [];
  // Match: **bold**, `code`, *italic*, [TAG]
  const regex = /(\*\*(.+?)\*\*|`(.+?)`|\*(.+?)\*|\[([A-Z][A-Z0-9+ -]{0,14})\])/g;
  let last = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: "text", value: text.slice(last, match.index) });
    }
    if (match[2]) parts.push({ type: "bold", value: match[2] });
    else if (match[3]) parts.push({ type: "code", value: match[3] });
    else if (match[4]) parts.push({ type: "italic", value: match[4] });
    else if (match[5] && TAG_COLORS[match[5]]) parts.push({ type: "tag", value: match[5] });
    else if (match[5]) parts.push({ type: "text", value: match[0] }); // Unknown tag, render as-is
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });

  return parts.map((p, i) => {
    switch (p.type) {
      case "bold":
        return <strong key={i} style={{ color: "var(--foreground)", fontWeight: 600 }}>{p.value}</strong>;
      case "code":
        return (
          <code
            key={i}
            className="rounded px-1 py-0.5 text-[11px]"
            style={{ background: "rgba(201,169,110,0.08)", color: "var(--accent)" }}
          >
            {p.value}
          </code>
        );
      case "italic":
        return <em key={i} style={{ color: "var(--foreground)", opacity: 0.9 }}>{p.value}</em>;
      case "tag": {
        const tc = TAG_COLORS[p.value];
        return (
          <span
            key={i}
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ background: tc.bg, color: tc.color }}
          >
            {p.value}
          </span>
        );
      }
      default:
        return <Fragment key={i}>{p.value}</Fragment>;
    }
  });
}

/* ── Table renderer ── */
function MarkdownTable({ rows }: { rows: string[][] }) {
  if (rows.length < 2) return null;
  const headers = rows[0];
  const startIdx = rows[1]?.every((c) => /^[-:]+$/.test(c.trim())) ? 2 : 1;
  const body = rows.slice(startIdx);

  return (
    <div className="my-3 overflow-x-auto rounded-xl border" style={{ borderColor: "var(--card-border)" }}>
      <table className="w-full text-[11px]">
        <thead>
          <tr style={{ background: "rgba(201,169,110,0.06)" }}>
            {headers.map((h, i) => (
              <th
                key={i}
                className="whitespace-nowrap px-3 py-2 text-left font-semibold"
                style={{ color: "var(--accent)", borderBottom: "1px solid var(--card-border)" }}
              >
                {renderInline(h.trim())}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => {
            // Scenario table coloring: Bull=green, Base=gold, Bear=red
            const firstCell = row[0]?.trim().toLowerCase() ?? "";
            let rowBg = ri % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)";
            if (firstCell.includes("bull")) rowBg = "rgba(34,197,94,0.06)";
            else if (firstCell.includes("base")) rowBg = "rgba(201,169,110,0.06)";
            else if (firstCell.includes("bear")) rowBg = "rgba(239,68,68,0.06)";
            return (
            <tr
              key={ri}
              style={{
                background: rowBg,
                borderBottom: ri < body.length - 1 ? "1px solid var(--card-border)" : undefined,
              }}
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="whitespace-nowrap px-3 py-1.5"
                  style={{ color: "var(--foreground)", opacity: 0.88 }}
                >
                  {renderInline(cell.trim())}
                </td>
              ))}
            </tr>
          );})}
        </tbody>
      </table>
    </div>
  );
}

/* ── Inline copy button ── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={handleCopy}
      title="Copy"
      className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-white/5"
      style={{ color: copied ? "var(--positive)" : "var(--muted)" }}
    >
      <AnimatePresence mode="wait">
        {copied
          ? <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check size={12} /></motion.span>
          : <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Copy size={12} /></motion.span>
        }
      </AnimatePresence>
    </button>
  );
}

/* ── Full markdown renderer ── */
export default function MarkdownRich({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactElement[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Table
    if (line.trimStart().startsWith("|")) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("|")) {
        const cells = lines[i].split("|").slice(1, -1).map((c) => c.trim());
        if (cells.length > 0) tableRows.push(cells);
        i++;
      }
      elements.push(<MarkdownTable key={`t-${i}`} rows={tableRows} />);
      continue;
    }

    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="mb-2 mt-5 text-[15px] font-bold first:mt-0" style={{ color: "var(--foreground)" }}>
          {renderInline(line.slice(3))}
        </h2>,
      );
      i++; continue;
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="mb-1.5 mt-4 text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>
          {renderInline(line.slice(4))}
        </h3>,
      );
      i++; continue;
    }

    if (line.startsWith("#### ")) {
      elements.push(
        <h4 key={i} className="mb-1 mt-3 text-xs font-semibold" style={{ color: "var(--accent)" }}>
          {renderInline(line.slice(5))}
        </h4>,
      );
      i++; continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)/);
      if (match) {
        elements.push(
          <div key={i} className="mb-1 flex gap-2 pl-1">
            <span className="shrink-0 text-[11px] tabular-nums font-medium" style={{ color: "var(--accent)", minWidth: 16 }}>
              {match[1]}.
            </span>
            <span className="text-xs leading-relaxed" style={{ color: "var(--foreground)", opacity: 0.88 }}>
              {renderInline(match[2])}
            </span>
          </div>,
        );
      }
      i++; continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} className="mb-1 flex gap-2 pl-1">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--accent)" }} />
          <span className="text-xs leading-relaxed" style={{ color: "var(--foreground)", opacity: 0.88 }}>
            {renderInline(line.slice(2))}
          </span>
        </div>,
      );
      i++; continue;
    }

    if (/^[-*_]{3,}$/.test(line.trim())) {
      elements.push(<div key={i} className="divider-gradient my-3" />);
      i++; continue;
    }

    if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
      i++; continue;
    }

    if (line.startsWith("**") && line.endsWith("**") && !line.slice(2, -2).includes("**")) {
      elements.push(
        <p key={i} className="mb-1 text-xs font-semibold" style={{ color: "var(--accent)" }}>
          {line.slice(2, -2)}
        </p>,
      );
      i++; continue;
    }

    elements.push(
      <p key={i} className="mb-0.5 text-xs leading-relaxed" style={{ color: "var(--foreground)", opacity: 0.88 }}>
        {renderInline(line)}
      </p>,
    );
    i++;
  }

  return (
    <div className="relative group">
      <div className="absolute -top-1 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <CopyButton text={text} />
      </div>
      <div>{elements}</div>
    </div>
  );
}
