"use client";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    mermaid?: {
      initialize: (config: Record<string, unknown>) => void;
      run: (config: { nodes: HTMLElement[] }) => Promise<void>;
    };
  }
}

let mermaidLoaded = false;
let mermaidLoadPromise: Promise<void> | null = null;

function loadMermaid(): Promise<void> {
  if (mermaidLoaded) return Promise.resolve();
  if (mermaidLoadPromise) return mermaidLoadPromise;

  mermaidLoadPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";
    script.async = true;
    script.onload = () => {
      window.mermaid?.initialize({
        startOnLoad: false,
        theme: "dark",
        themeVariables: {
          primaryColor: "#1a1a1a",
          primaryTextColor: "#F5F0EB",
          primaryBorderColor: "#C9A96E",
          lineColor: "#C9A96E",
          secondaryColor: "#141414",
          tertiaryColor: "#1a1a1a",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "13px",
          noteBkgColor: "#1a1a1a",
          noteTextColor: "#C9A96E",
          actorTextColor: "#F5F0EB",
          actorBkg: "#141414",
          actorBorder: "#C9A96E",
          signalColor: "#C9A96E",
          signalTextColor: "#F5F0EB",
          labelBoxBkgColor: "#141414",
          labelBoxBorderColor: "#C9A96E",
          labelTextColor: "#F5F0EB",
          edgeLabelBackground: "#0A0A0A",
          nodeTextColor: "#F5F0EB",
        },
      });
      mermaidLoaded = true;
      resolve();
    };
    document.head.appendChild(script);
  });
  return mermaidLoadPromise;
}

export default function MermaidBlock({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    el.textContent = chart;
    el.removeAttribute("data-processed");
    el.classList.add("mermaid");

    loadMermaid()
      .then(() => window.mermaid?.run({ nodes: [el] }))
      .catch(() => setError(true));
  }, [chart]);

  if (error) {
    return (
      <pre
        className="overflow-x-auto rounded-xl border p-4 text-xs"
        style={{ borderColor: "var(--card-border)", color: "var(--muted)", background: "var(--surface)" }}
      >
        {chart}
      </pre>
    );
  }

  return (
    <div className="my-6 overflow-x-auto rounded-xl border p-4" style={{ borderColor: "var(--card-border)", background: "var(--surface)" }}>
      <div ref={ref} />
    </div>
  );
}
