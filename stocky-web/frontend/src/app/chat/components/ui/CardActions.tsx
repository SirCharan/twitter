"use client";

import { useState, useRef, useEffect } from "react";
import {
  RefreshCw,
  Bookmark,
  FileDown,
  Share2,
  ClipboardCopy,
  Check,
  MessageCircle,
  Send,
  Copy,
} from "lucide-react";
import { saveToWatchlist, exportPdf } from "@/lib/api";

interface CardActionsProps {
  onRefresh?: () => void;
  ticker?: string;
  cardType?: string;
  cardData?: Record<string, unknown>;
  isRefreshing?: boolean;
}

/* ── Build human-readable share text from card data ── */

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

function buildShareText(cardType: string, data: Record<string, unknown>): string {
  const ai = (data.ai_analysis as string) || (data.ai_mood as string) || (data.verdict as string) || "";
  const aiSnippet = ai ? "\n\n" + truncate(ai.replace(/[#*_`]/g, "").trim(), 300) : "";
  const footer = "\n\n— via Stocky AI (llm.stockyai.xyz)";

  switch (cardType) {
    case "fii_dii": {
      const cash = data.cash as Record<string, Record<string, number>> | undefined;
      const fiiNet = cash?.fii?.net;
      const diiNet = cash?.dii?.net;
      const fii = fiiNet != null ? `FII Net: ₹${fiiNet.toLocaleString("en-IN")} Cr` : "";
      const dii = diiNet != null ? `DII Net: ₹${diiNet.toLocaleString("en-IN")} Cr` : "";
      return `🏛 FII/DII Institutional Flows\n${[fii, dii].filter(Boolean).join(" | ")}${aiSnippet}${footer}`;
    }

    case "overview": {
      const indices = data.indices as Array<Record<string, unknown>> | undefined;
      const nifty = indices?.find((i) => String(i.name).toLowerCase().includes("nifty"));
      const niftyLine = nifty ? `Nifty: ${nifty.value} (${Number(nifty.pct_change) >= 0 ? "+" : ""}${nifty.pct_change}%)` : "";
      return `📊 Market Overview\n${niftyLine}${aiSnippet}${footer}`;
    }

    case "macro": {
      const indices = data.indices as Record<string, Record<string, number>> | undefined;
      const nifty = indices?.nifty;
      const vix = indices?.vix;
      const lines: string[] = [];
      if (nifty?.price) lines.push(`Nifty: ${nifty.price} (${nifty.change_pct >= 0 ? "+" : ""}${nifty.change_pct}%)`);
      if (vix?.price) lines.push(`VIX: ${vix.price}`);
      return `🌐 Macro Dashboard\n${lines.join(" | ")}${aiSnippet}${footer}`;
    }

    case "analysis": {
      const name = (data.name as string) || (data.symbol as string) || "Stock";
      const score = data.overall_score as number | undefined;
      const scoreLine = score != null ? `\nScore: ${score}/20` : "";
      return `🔍 ${name} Analysis${scoreLine}${aiSnippet}${footer}`;
    }

    case "news": {
      return `📰 Market News${aiSnippet}${footer}`;
    }

    case "scan": {
      const scanType = (data.scan_type as string) || "scan";
      return `📊 Market Scan — ${scanType}${aiSnippet}${footer}`;
    }

    case "earnings": {
      return `📅 Earnings Calendar${aiSnippet}${footer}`;
    }

    case "sectors": {
      return `🏭 Sector Performance${aiSnippet}${footer}`;
    }

    default: {
      const label = cardType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      return `📈 ${label}${aiSnippet}${footer}`;
    }
  }
}

/* ── Component ── */

export default function CardActions({
  onRefresh,
  ticker,
  cardType,
  cardData,
  isRefreshing,
}: CardActionsProps) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  // Close share menu on outside click
  useEffect(() => {
    if (!shareOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [shareOpen]);

  const handleCopy = async () => {
    try {
      const text = cardData
        ? JSON.stringify(cardData, null, 2)
        : "No data to copy";
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard API may not be available */
    }
  };

  const handleSaveWatchlist = async () => {
    if (!ticker) return;
    try {
      await saveToWatchlist(ticker);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* silent */
    }
  };

  const handleExportPdf = async () => {
    if (!cardType || !cardData) return;
    try {
      const blob = await exportPdf(cardType, cardData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stocky_${cardType}_report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* silent */
    }
  };

  const shareText = cardType && cardData ? buildShareText(cardType, cardData) : "";

  const handleShareCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setShareCopied(true);
      setTimeout(() => { setShareCopied(false); setShareOpen(false); }, 1500);
    } catch { /* silent */ }
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
    setShareOpen(false);
  };

  const handleTelegram = () => {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent("https://llm.stockyai.xyz")}&text=${encodeURIComponent(shareText)}`,
      "_blank",
    );
    setShareOpen(false);
  };

  const btnClass =
    "flex items-center justify-center w-6 h-6 rounded-md transition-colors hover:bg-white/5";
  const iconColor = "var(--muted)";

  return (
    <div className="mt-3 flex items-center gap-1">
      {onRefresh && (
        <button onClick={onRefresh} className={btnClass} title="Refresh">
          <RefreshCw
            size={12}
            style={{ color: iconColor }}
            className={isRefreshing ? "animate-spin" : ""}
          />
        </button>
      )}

      {ticker && (
        <button
          onClick={handleSaveWatchlist}
          className={btnClass}
          title={saved ? "Saved!" : "Save to watchlist"}
        >
          {saved ? (
            <Check size={12} style={{ color: "var(--accent)" }} />
          ) : (
            <Bookmark size={12} style={{ color: iconColor }} />
          )}
        </button>
      )}

      {cardType && cardData && (
        <button onClick={handleExportPdf} className={btnClass} title="Export PDF">
          <FileDown size={12} style={{ color: iconColor }} />
        </button>
      )}

      {/* Share dropdown */}
      {cardType && cardData && (
        <div className="relative" ref={shareRef}>
          <button
            onClick={() => setShareOpen(!shareOpen)}
            className={btnClass}
            title="Share"
          >
            <Share2 size={12} style={{ color: shareOpen ? "var(--accent)" : iconColor }} />
          </button>

          {shareOpen && (
            <div
              className="absolute bottom-8 left-0 z-50 min-w-[160px] rounded-xl border py-1 shadow-xl"
              style={{
                background: "var(--surface)",
                borderColor: "var(--card-border)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              }}
            >
              <button
                onClick={handleShareCopy}
                className="flex w-full items-center gap-2 px-3 py-2 text-[11px] transition-colors hover:bg-white/5"
                style={{ color: "var(--foreground)" }}
              >
                {shareCopied ? (
                  <Check size={12} style={{ color: "var(--accent)" }} />
                ) : (
                  <Copy size={12} style={{ color: iconColor }} />
                )}
                {shareCopied ? "Copied!" : "Copy summary"}
              </button>

              <button
                onClick={handleWhatsApp}
                className="flex w-full items-center gap-2 px-3 py-2 text-[11px] transition-colors hover:bg-white/5"
                style={{ color: "var(--foreground)" }}
              >
                <MessageCircle size={12} style={{ color: "#25D366" }} />
                WhatsApp
              </button>

              <button
                onClick={handleTelegram}
                className="flex w-full items-center gap-2 px-3 py-2 text-[11px] transition-colors hover:bg-white/5"
                style={{ color: "var(--foreground)" }}
              >
                <Send size={12} style={{ color: "#0088cc" }} />
                Telegram
              </button>
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleCopy}
        className={btnClass}
        title={copied ? "Copied!" : "Copy to clipboard"}
      >
        {copied ? (
          <Check size={12} style={{ color: "var(--accent)" }} />
        ) : (
          <ClipboardCopy size={12} style={{ color: iconColor }} />
        )}
      </button>
    </div>
  );
}
