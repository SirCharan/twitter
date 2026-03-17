"use client";

import { useState, useEffect } from "react";

const DISMISS_KEY = "stocky-pwa-dismiss";
const DISMISS_DAYS = 7;

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    ("standalone" in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export default function InstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isIosSafari() || isStandalone()) return;

    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < DISMISS_DAYS * 86400000) return;
    }

    // Delay showing the prompt so it doesn't interfere with first load
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        left: "16px",
        right: "16px",
        zIndex: 9999,
        background: "#1A1A1A",
        border: "1px solid rgba(201, 169, 110, 0.2)",
        borderRadius: "16px",
        padding: "16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        animation: "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        {/* App icon */}
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "#0A0A0A",
            border: "1px solid rgba(201, 169, 110, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 600, fontSize: "28px", color: "#C9A96E" }}>S</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: "#F5F0EB", fontSize: "14px", fontWeight: 600, margin: "0 0 4px 0" }}>
            Add Stocky AI to Home Screen
          </p>
          <p style={{ color: "#6B6B6B", fontSize: "12px", margin: 0, lineHeight: 1.4 }}>
            Tap{" "}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="2" strokeLinecap="round" style={{ display: "inline", verticalAlign: "-2px" }}>
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
              <polyline points="16,6 12,2 8,6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>{" "}
            then &quot;Add to Home Screen&quot; for the full app experience.
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={dismiss}
          style={{
            background: "none",
            border: "none",
            color: "#6B6B6B",
            fontSize: "20px",
            cursor: "pointer",
            padding: "0 4px",
            lineHeight: 1,
            minWidth: "44px",
            minHeight: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
