"use client";
import React, { useState, Fragment } from "react";

interface AgentData {
  model: string;
  response: string;
  elapsed: number;
}

interface DebateData {
  query: string;
  agent_a: AgentData;
  agent_b: AgentData | null;
  synthesis: string;
  synthesis_elapsed: number;
  total_elapsed: number;
}

interface Props {
  data: Record<string, unknown>;
}

/* ── Inline formatting: **bold**, `code`, *italic* ── */
function renderInline(text: string) {
  const parts: Array<{ type: "text" | "bold" | "code" | "italic"; value: string }> = [];
  const regex = /(\*\*(.+?)\*\*|`(.+?)`|\*(.+?)\*)/g;
  let last = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: "text", value: text.slice(last, match.index) });
    }
    if (match[2]) parts.push({ type: "bold", value: match[2] });
    else if (match[3]) parts.push({ type: "code", value: match[3] });
    else if (match[4]) parts.push({ type: "italic", value: match[4] });
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
      default:
        return <Fragment key={i}>{p.value}</Fragment>;
    }
  });
}

/* ── Table renderer ── */
function MarkdownTable({ rows }: { rows: string[][] }) {
  if (rows.length < 2) return null;
  const headers = rows[0];
  // Skip separator row (|---|---|)
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
          {body.map((row, ri) => (
            <tr
              key={ri}
              style={{
                background: ri % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
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
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Full markdown renderer ── */
function MarkdownRich({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactElement[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Table: collect consecutive lines starting with |
    if (line.trimStart().startsWith("|")) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("|")) {
        const cells = lines[i]
          .split("|")
          .slice(1, -1) // Remove empty first/last from leading/trailing |
          .map((c) => c.trim());
        if (cells.length > 0) tableRows.push(cells);
        i++;
      }
      elements.push(<MarkdownTable key={`t-${i}`} rows={tableRows} />);
      continue;
    }

    // H2
    if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={i}
          className="mb-2 mt-5 text-[15px] font-bold first:mt-0"
          style={{ color: "var(--foreground)" }}
        >
          {renderInline(line.slice(3))}
        </h2>,
      );
      i++;
      continue;
    }

    // H3
    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={i}
          className="mb-1.5 mt-4 text-[13px] font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          {renderInline(line.slice(4))}
        </h3>,
      );
      i++;
      continue;
    }

    // H4
    if (line.startsWith("#### ")) {
      elements.push(
        <h4
          key={i}
          className="mb-1 mt-3 text-xs font-semibold"
          style={{ color: "var(--accent)" }}
        >
          {renderInline(line.slice(5))}
        </h4>,
      );
      i++;
      continue;
    }

    // Numbered list
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
      i++;
      continue;
    }

    // Bullet
    if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} className="mb-1 flex gap-2 pl-1">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--accent)" }} />
          <span className="text-xs leading-relaxed" style={{ color: "var(--foreground)", opacity: 0.88 }}>
            {renderInline(line.slice(2))}
          </span>
        </div>,
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      elements.push(
        <div key={i} className="divider-gradient my-3" />,
      );
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
      i++;
      continue;
    }

    // Full-line bold
    if (line.startsWith("**") && line.endsWith("**") && !line.slice(2, -2).includes("**")) {
      elements.push(
        <p key={i} className="mb-1 text-xs font-semibold" style={{ color: "var(--accent)" }}>
          {line.slice(2, -2)}
        </p>,
      );
      i++;
      continue;
    }

    // Regular text
    elements.push(
      <p key={i} className="mb-0.5 text-xs leading-relaxed" style={{ color: "var(--foreground)", opacity: 0.88 }}>
        {renderInline(line)}
      </p>,
    );
    i++;
  }

  return <div>{elements}</div>;
}

/* ── Collapsible agent section ── */
function AgentSection({
  title,
  model,
  elapsed,
  content,
  accentColor,
  icon,
}: {
  title: string;
  model: string;
  elapsed: number;
  content: string;
  accentColor: string;
  icon: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-xl border transition-colors"
      style={{ borderColor: open ? "rgba(201,169,110,0.12)" : "var(--card-border)", background: "var(--surface)" }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left"
      >
        <span className="text-xs">{icon}</span>
        <span className="flex-1 text-[12px] font-medium" style={{ color: "var(--foreground)" }}>
          {title}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ background: `${accentColor}15`, color: accentColor }}
        >
          {model}
        </span>
        <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)" }}>
          {elapsed.toFixed(1)}s
        </span>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className="shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="var(--muted)" strokeWidth="1.2" />
        </svg>
      </button>
      {open && (
        <div
          className="border-t px-4 py-3 text-xs leading-relaxed"
          style={{ borderColor: "var(--card-border)" }}
        >
          <MarkdownRich text={content} />
        </div>
      )}
    </div>
  );
}

/* ── Main card ── */
export default function AgentDebateCard({ data }: Props) {
  const d = data as unknown as DebateData;

  return (
    <div className="max-w-full">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="var(--accent)" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--accent)" }}
          >
            Agent Debate
          </span>
        </div>
        <div className="divider-gradient flex-1" />
        <span className="text-[10px] tabular-nums font-medium" style={{ color: "var(--muted)" }}>
          {d.total_elapsed.toFixed(1)}s
        </span>
      </div>

      {/* Synthesis — main answer */}
      <div
        className="mb-4 rounded-2xl border px-4 py-4 sm:px-5"
        style={{
          borderColor: "rgba(201,169,110,0.12)",
          background: "linear-gradient(135deg, rgba(201,169,110,0.03) 0%, var(--card-bg) 100%)",
        }}
      >
        <div className="mb-3 flex items-center gap-2">
          <div className="h-1 w-6 rounded-full" style={{ background: "var(--accent)" }} />
          <span
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--accent)" }}
          >
            Final Synthesis
          </span>
          <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)" }}>
            {d.synthesis_elapsed.toFixed(1)}s
          </span>
        </div>
        <div className="text-xs leading-relaxed">
          <MarkdownRich text={d.synthesis} />
        </div>
      </div>

      {/* Agent sections (collapsed by default) */}
      <div className="space-y-2">
        <AgentSection
          title="Quick Agent"
          icon="⚡"
          model={d.agent_a.model}
          elapsed={d.agent_a.elapsed}
          content={d.agent_a.response}
          accentColor="var(--positive)"
        />
        {d.agent_b && (
          <AgentSection
            title="Deep Agent"
            icon="🔬"
            model={d.agent_b.model}
            elapsed={d.agent_b.elapsed}
            content={d.agent_b.response}
            accentColor="#818cf8"
          />
        )}
      </div>
    </div>
  );
}
