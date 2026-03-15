"use client";
import { useEffect, useRef } from "react";
import MarkdownRich from "./MarkdownRich";
import CardWrapper from "./ui/CardWrapper";
import { motion } from "framer-motion";

interface Props {
  data: Record<string, unknown>;
}

function AiAnalysisSection({ text }: { text: string | undefined }) {
  if (!text) return null;
  return (
    <div
      className="rounded-xl border-l-2 px-4 py-3 mt-3"
      style={{
        borderColor: "var(--accent)",
        background: "linear-gradient(135deg, rgba(201,169,110,0.04) 0%, var(--surface) 100%)",
      }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--accent)" }}>
        Stocky&apos;s Chart Read
      </p>
      <div className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
        <MarkdownRich text={text} />
      </div>
    </div>
  );
}

export default function ChartCard({ data }: Props) {
  const chartType = data.type as string;
  const stock = data.stock as string;
  const aiAnalysis = data.ai_analysis as string | undefined;

  if (chartType === "tradingview") {
    return (
      <CardWrapper icon="📊">
        <TradingViewChart symbol={data.symbol as string} stock={stock} />
        <AiAnalysisSection text={aiAnalysis} />
      </CardWrapper>
    );
  }

  if (chartType === "image" && data.image_b64) {
    return (
      <CardWrapper icon="📊">
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ borderColor: "var(--card-border)", background: "#111111" }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2.5 text-xs"
            style={{ borderBottom: "1px solid var(--card-border)", color: "var(--muted)" }}
          >
            <span>📈</span>
            <span>{stock} — Analysis Chart</span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${data.image_b64}`}
            alt={`${stock} chart`}
            className="w-full"
            style={{ display: "block" }}
          />
        </div>
        <AiAnalysisSection text={aiAnalysis} />
      </CardWrapper>
    );
  }

  return (
    <CardWrapper icon="📊">
      <div className="text-sm" style={{ color: "var(--muted)" }}>
        Chart data unavailable.
      </div>
    </CardWrapper>
  );
}

function TradingViewChart({ symbol, stock }: { symbol: string; stock: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: "D",
      timezone: "Asia/Kolkata",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(17, 17, 17, 1)",
      gridColor: "rgba(255, 255, 255, 0.04)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      studies: ["RSI@tv-basicstudies", "MACD@tv-basicstudies"],
      support_host: "https://www.tradingview.com",
    });

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    container.appendChild(widgetDiv);
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [symbol]);

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: "var(--card-border)", background: "#111111" }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2.5 text-xs"
        style={{ borderBottom: "1px solid var(--card-border)", color: "var(--muted)" }}
      >
        <span>📈</span>
        <span>{stock} — Live Chart (TradingView)</span>
        <span className="ml-auto text-[10px]" style={{ color: "var(--accent)" }}>
          {symbol}
        </span>
      </div>
      <div
        ref={containerRef}
        className="tradingview-widget-container"
        style={{ height: 550, width: "100%" }}
      />
    </div>
  );
}
