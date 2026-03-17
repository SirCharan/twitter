"use client";
import { useState, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PWAContext } from "./PWAProvider";

export default function PWAInstallDialog() {
  const pwa = useContext(PWAContext);
  const [neverShow, setNeverShow] = useState(false);

  if (!pwa) return null;

  const handleDismiss = () => pwa.dismiss(neverShow);
  const handleInstall = () => {
    pwa.install();
  };

  return (
    <AnimatePresence>
      {pwa.showDialog && (
        <motion.div
          key="pwa-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(0,0,0,0.82)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={handleDismiss}
        >
          <motion.div
            key="pwa-dialog"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "360px",
              background: "#050505",
              border: "1px solid #00FF41",
              borderRadius: "4px",
              fontFamily: "monospace",
              boxShadow: "0 0 40px rgba(0,255,65,0.12), 0 24px 48px rgba(0,0,0,0.8)",
              overflow: "hidden",
            }}
          >
            {/* Title bar */}
            <div
              style={{
                borderBottom: "1px solid rgba(0,255,65,0.3)",
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(0,255,65,0.04)",
              }}
            >
              <span style={{ color: "#00FF41", fontSize: "10px", letterSpacing: "0.12em", fontWeight: 700 }}>
                STOCKY AI — INSTALL AS NATIVE APP
              </span>
              <button
                onClick={handleDismiss}
                style={{
                  background: "none",
                  border: "none",
                  color: "#00882A",
                  fontSize: "14px",
                  cursor: "pointer",
                  padding: "0 2px",
                  lineHeight: 1,
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "18px 16px" }}>
              <p style={{ color: "#00FF41", fontSize: "12px", marginBottom: "14px", lineHeight: 1.5 }}>
                &gt; Run Stocky AI like a native app?
              </p>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 18px 0", display: "flex", flexDirection: "column", gap: "6px" }}>
                {[
                  "Instant terminal access",
                  "Offline market data cache",
                  "Push alerts for trades & scans",
                  "No browser chrome — pure terminal",
                ].map((item) => (
                  <li key={item} style={{ color: "#00CC34", fontSize: "11px", display: "flex", gap: "8px" }}>
                    <span style={{ color: "#00882A" }}>•</span>
                    {item}
                  </li>
                ))}
              </ul>

              {/* iOS instructions */}
              {pwa.isIos && (
                <div
                  style={{
                    border: "1px solid rgba(0,255,65,0.2)",
                    borderRadius: "3px",
                    padding: "10px 12px",
                    marginBottom: "14px",
                    background: "rgba(0,255,65,0.03)",
                  }}
                >
                  <p style={{ color: "#00882A", fontSize: "10px", letterSpacing: "0.08em", marginBottom: "8px" }}>
                    IOS INSTALL STEPS:
                  </p>
                  {[
                    { step: "1", text: 'Tap the Share button', icon: "↑" },
                    { step: "2", text: 'Scroll down & tap "Add to Home Screen"', icon: "＋" },
                    { step: "3", text: "Tap \"Add\"", icon: "✓" },
                  ].map(({ step, text, icon }) => (
                    <div key={step} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                      <span
                        style={{
                          width: "18px",
                          height: "18px",
                          border: "1px solid #00FF41",
                          borderRadius: "2px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "10px",
                          color: "#00FF41",
                          flexShrink: 0,
                        }}
                      >
                        {icon}
                      </span>
                      <span style={{ color: "#00CC34", fontSize: "11px", lineHeight: 1.4 }}>{text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {!pwa.isIos && (
                  <button
                    onClick={handleInstall}
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: "rgba(0,255,65,0.08)",
                      border: "1px solid #00FF41",
                      borderRadius: "3px",
                      color: "#00FF41",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      letterSpacing: "0.12em",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 0 12px rgba(0,255,65,0.15)",
                      transition: "background 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLButtonElement).style.background = "rgba(0,255,65,0.14)";
                      (e.target as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(0,255,65,0.25)";
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.background = "rgba(0,255,65,0.08)";
                      (e.target as HTMLButtonElement).style.boxShadow = "0 0 12px rgba(0,255,65,0.15)";
                    }}
                  >
                    [ INSTALL NOW ]
                  </button>
                )}

                <button
                  onClick={handleDismiss}
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "none",
                    border: "1px solid rgba(0,255,65,0.2)",
                    borderRadius: "3px",
                    color: "#00882A",
                    fontFamily: "monospace",
                    fontSize: "11px",
                    letterSpacing: "0.08em",
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                  }}
                >
                  {pwa.isIos ? "[ GOT IT ]" : "[ NOT NOW ]"}
                </button>
              </div>

              {/* Never show again */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginTop: "12px",
                  cursor: "pointer",
                  color: "#00882A",
                  fontSize: "10px",
                  letterSpacing: "0.06em",
                }}
              >
                <input
                  type="checkbox"
                  checked={neverShow}
                  onChange={(e) => setNeverShow(e.target.checked)}
                  style={{ accentColor: "#00FF41", width: "12px", height: "12px" }}
                />
                NEVER SHOW AGAIN
              </label>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
