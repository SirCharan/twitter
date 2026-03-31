"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import MermaidBlock from "./MermaidBlock";
import {
  TITLE, SUBTITLE, LAST_UPDATED,
  OVERVIEW,
  SYSTEM_ARCH_DIAGRAM,
  FRONTEND,
  LLM_ORCH_DIAGRAM, LLM_SECTION,
  AGENT_DEBATE_DIAGRAM, AGENT_SECTION,
  DATA_PIPELINE_DIAGRAM, DATA_SECTION,
  DB_DIAGRAM, DB_SECTION,
  SECURITY,
  DEPLOY_DIAGRAM, DEPLOY_SECTION,
  TRADEOFFS,
  SCALED_ARCH_DIAGRAM, SCALE_SECTION,
  WHATS_NEXT,
  BACKEND,
} from "./content";

/* ── Lightweight markdown-to-JSX renderer (no external deps) ──────── */

function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeKey = 0;

  function flushTable(key: number) {
    if (tableRows.length < 2) return null;
    const headers = tableRows[0];
    const body = tableRows.slice(2); // skip separator row
    return (
      <div key={`t-${key}`} className="my-4 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider border-b"
                  style={{ color: "var(--accent)", borderColor: "rgba(201,169,110,0.2)" }}
                >
                  {renderInline(h.trim())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri} className="border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2 text-sm" style={{ color: "var(--foreground)" }}>
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

  function renderInline(text: string): React.ReactNode {
    // Bold
    const parts: React.ReactNode[] = [];
    const regex = /\*\*(.+?)\*\*|`(.+?)`|\[(.+?)\]\((.+?)\)/g;
    let last = 0;
    let match;
    let key = 0;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > last) parts.push(text.slice(last, match.index));
      if (match[1]) {
        parts.push(<strong key={key++} style={{ color: "var(--foreground)" }}>{match[1]}</strong>);
      } else if (match[2]) {
        parts.push(
          <code
            key={key++}
            className="rounded px-1.5 py-0.5 text-[12px]"
            style={{ background: "rgba(201,169,110,0.1)", color: "var(--accent)" }}
          >
            {match[2]}
          </code>
        );
      } else if (match[3] && match[4]) {
        parts.push(
          <a key={key++} href={match[4]} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--accent)" }}>
            {match[3]}
          </a>
        );
      }
      last = match.index + match[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts.length === 1 ? parts[0] : <>{parts}</>;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.trimStart().startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${codeKey++}`}
            className="my-4 overflow-x-auto rounded-xl border p-4 text-xs leading-relaxed"
            style={{ background: "var(--surface)", borderColor: "var(--card-border)", color: "var(--foreground)" }}
          >
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        // Flush table if open
        if (inTable) {
          const t = flushTable(i);
          if (t) elements.push(t);
          tableRows = [];
          inTable = false;
        }
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Table rows
    if (line.includes("|") && line.trim().startsWith("|")) {
      const cells = line.split("|").filter(Boolean);
      if (!inTable) inTable = true;
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      const t = flushTable(i);
      if (t) elements.push(t);
      tableRows = [];
      inTable = false;
    }

    // Empty line
    if (!line.trim()) {
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="mt-8 mb-3 text-lg font-semibold" style={{ color: "var(--accent)" }}>
          {renderInline(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={i}
          className="mt-12 mb-4 text-2xl font-bold border-b pb-3"
          style={{ color: "var(--foreground)", borderColor: "rgba(201,169,110,0.2)" }}
        >
          {renderInline(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="mt-8 mb-4 text-3xl font-bold" style={{ color: "var(--foreground)" }}>
          {renderInline(line.slice(2))}
        </h1>
      );
    }
    // List items
    else if (line.trimStart().startsWith("- ") || line.trimStart().startsWith("* ")) {
      const indent = line.length - line.trimStart().length;
      elements.push(
        <div key={i} className="flex gap-2 my-1" style={{ paddingLeft: indent > 0 ? 16 : 0 }}>
          <span style={{ color: "var(--accent)" }}>•</span>
          <span className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
            {renderInline(line.trimStart().slice(2))}
          </span>
        </div>
      );
    }
    // Numbered list
    else if (/^\d+\.\s/.test(line.trimStart())) {
      const match = line.trimStart().match(/^(\d+)\.\s(.+)$/);
      if (match) {
        elements.push(
          <div key={i} className="flex gap-2 my-1">
            <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--accent)", minWidth: 20 }}>{match[1]}.</span>
            <span className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>{renderInline(match[2])}</span>
          </div>
        );
      }
    }
    // Horizontal rule
    else if (line.trim() === "---") {
      elements.push(<hr key={i} className="my-8" style={{ borderColor: "rgba(201,169,110,0.15)" }} />);
    }
    // Paragraph
    else {
      elements.push(
        <p key={i} className="my-2 text-sm leading-relaxed" style={{ color: "var(--foreground)", opacity: 0.85 }}>
          {renderInline(line)}
        </p>
      );
    }
  }

  // Flush remaining table
  if (inTable) {
    const t = flushTable(lines.length);
    if (t) elements.push(t);
  }

  return <>{elements}</>;
}

/* ── Page ─────────────────────────────────────────────────────────── */

export default function TechPageClient() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Nav */}
      <nav
        className="sticky top-0 z-50 flex items-center gap-3 px-4 py-3 border-b backdrop-blur-xl"
        style={{ background: "rgba(10,10,10,0.85)", borderColor: "var(--card-border)" }}
      >
        <Link href="/chat" className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--accent)" }}>
          <ArrowLeft size={14} />
          Back to Stocky
        </Link>
        <span className="text-sm" style={{ color: "var(--muted)" }}>|</span>
        <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Technical Architecture</span>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Title */}
        <div className="mb-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-2" style={{ color: "var(--accent)" }}>
            Engineering Documentation
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: "var(--foreground)" }}>
            {TITLE}
          </h1>
          <p className="text-base" style={{ color: "var(--muted)" }}>{SUBTITLE}</p>
          <p className="text-xs mt-2" style={{ color: "var(--muted)", opacity: 0.5 }}>Last updated: {LAST_UPDATED}</p>
        </div>

        {/* Table of Contents */}
        <div
          className="rounded-xl border p-4 sm:p-6 mb-10"
          style={{ background: "var(--surface)", borderColor: "var(--card-border)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--accent)" }}>Contents</p>
          <ol className="grid sm:grid-cols-2 gap-1">
            {[
              "Overview & Philosophy",
              "Frontend Stack",
              "Backend Stack",
              "LLM Orchestration",
              "Multi-Agent Architectures",
              "Data Pipeline",
              "Database Schema",
              "Security",
              "Deployment & CI/CD",
              "Tradeoffs & Limitations",
              "System Design for Scale",
              "What's Next",
            ].map((item, i) => (
              <li key={i} className="text-sm py-0.5" style={{ color: "var(--foreground)", opacity: 0.7 }}>
                <span className="tabular-nums font-medium mr-2" style={{ color: "var(--accent)" }}>{i + 1}.</span>
                {item}
              </li>
            ))}
          </ol>
        </div>

        {/* Sections */}
        <article>
          <Markdown text={OVERVIEW} />
          <MermaidBlock chart={SYSTEM_ARCH_DIAGRAM} />

          <Markdown text={FRONTEND} />

          <Markdown text={BACKEND} />

          <MermaidBlock chart={LLM_ORCH_DIAGRAM} />
          <Markdown text={LLM_SECTION} />

          <MermaidBlock chart={AGENT_DEBATE_DIAGRAM} />
          <Markdown text={AGENT_SECTION} />

          <MermaidBlock chart={DATA_PIPELINE_DIAGRAM} />
          <Markdown text={DATA_SECTION} />

          <MermaidBlock chart={DB_DIAGRAM} />
          <Markdown text={DB_SECTION} />

          <Markdown text={SECURITY} />

          <MermaidBlock chart={DEPLOY_DIAGRAM} />
          <Markdown text={DEPLOY_SECTION} />

          <Markdown text={TRADEOFFS} />

          <MermaidBlock chart={SCALED_ARCH_DIAGRAM} />
          <Markdown text={SCALE_SECTION} />

          <Markdown text={WHATS_NEXT} />
        </article>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t text-center" style={{ borderColor: "rgba(201,169,110,0.15)" }}>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Stocky AI — Built by Charandeep Kapoor (IIT Kanpur, NISM Certified)
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--muted)", opacity: 0.5 }}>
            Powered by Groq, Gemini, Zerodha Kite, Dhan HQ
          </p>
        </footer>
      </main>
    </div>
  );
}
