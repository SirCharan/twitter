"use client";

import { useState } from "react";
import {
  RefreshCw,
  Bookmark,
  FileDown,
  Share2,
  ClipboardCopy,
  Check,
} from "lucide-react";
import { saveToWatchlist, exportPdf, shareCard } from "@/lib/api";

interface CardActionsProps {
  onRefresh?: () => void;
  ticker?: string;
  cardType?: string;
  cardData?: Record<string, unknown>;
  isRefreshing?: boolean;
}

export default function CardActions({
  onRefresh,
  ticker,
  cardType,
  cardData,
  isRefreshing,
}: CardActionsProps) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);

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

  const handleShare = async () => {
    if (!cardType || !cardData) return;
    try {
      const result = await shareCard(cardType, cardData);
      await navigator.clipboard.writeText(
        `${window.location.origin}${result.url}`,
      );
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      /* silent */
    }
  };

  const btnClass =
    "flex items-center justify-center w-6 h-6 rounded-md transition-colors hover:bg-white/5";
  const iconColor = "var(--muted)";

  return (
    <div className="mt-3 flex items-center gap-1">
      {onRefresh && (
        <button
          onClick={onRefresh}
          className={btnClass}
          title="Refresh"
        >
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
        <button
          onClick={handleExportPdf}
          className={btnClass}
          title="Export PDF"
        >
          <FileDown size={12} style={{ color: iconColor }} />
        </button>
      )}

      {cardType && cardData && (
        <button
          onClick={handleShare}
          className={btnClass}
          title={shared ? "Link copied!" : "Share"}
        >
          {shared ? (
            <Check size={12} style={{ color: "var(--accent)" }} />
          ) : (
            <Share2 size={12} style={{ color: iconColor }} />
          )}
        </button>
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
