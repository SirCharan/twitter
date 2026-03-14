"use client";
import React, { Fragment } from "react";

/* ── Inline formatting: **bold**, `code`, *italic* ── */
export function renderInline(text: string) {
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

  return <div>{elements}</div>;
}
