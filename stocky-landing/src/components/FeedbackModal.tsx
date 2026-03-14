"use client";

import { useState, useEffect, useCallback } from "react";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("General Feedback");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<{ text: string; type: "success" | "error" | "" }>({ text: "", type: "" });
  const [sending, setSending] = useState(false);

  const close = useCallback(() => {
    onClose();
    setStatus({ text: "", type: "" });
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, close]);

  if (!open) return null;

  const submit = async () => {
    if (!message.trim()) {
      setStatus({ text: "Please enter a message.", type: "error" });
      return;
    }

    const lastSent = parseInt(localStorage.getItem("stocky-feedback-last") || "0", 10);
    if (Date.now() - lastSent < 60_000) {
      setStatus({ text: "Please wait a minute before sending again.", type: "error" });
      return;
    }

    setSending(true);
    setStatus({ text: "", type: "" });

    try {
      const resp = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, category, message }),
      });

      if (resp.ok) {
        localStorage.setItem("stocky-feedback-last", String(Date.now()));
        setStatus({ text: "Sent! Thank you for your feedback.", type: "success" });
        setTimeout(() => {
          close();
          setName("");
          setEmail("");
          setCategory("General Feedback");
          setMessage("");
        }, 1500);
      } else {
        const data = await resp.json().catch(() => ({ error: "Failed to send" }));
        setStatus({ text: data.error || "Failed to send. Please try again.", type: "error" });
      }
    } catch {
      setStatus({ text: "Network error. Please try again.", type: "error" });
    } finally {
      setSending(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "6px",
    color: "#F5F0EB",
    fontSize: "14px",
    outline: "none",
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          width: "min(440px, 95vw)",
          background: "#111",
          border: "1px solid rgba(201,169,110,0.2)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <span style={{ color: "#F5F0EB", fontSize: "16px", fontWeight: 600 }}>Send Feedback</span>
          <button onClick={close} style={{ background: "none", border: "none", color: "#6B6B6B", fontSize: "22px", cursor: "pointer", padding: "0 4px" }}>&times;</button>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ color: "#C9A96E", fontSize: "12px", margin: 0, lineHeight: 1.5 }}>
            This goes directly to my inbox &mdash; I personally read every message (no AI).
          </p>

          <div>
            <label style={{ color: "#6B6B6B", fontSize: "12px", display: "block", marginBottom: "4px" }}>Name</label>
            <input type="text" placeholder="Optional" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={{ color: "#6B6B6B", fontSize: "12px", display: "block", marginBottom: "4px" }}>Email</label>
            <input type="email" placeholder="Optional — only if you want a reply" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={{ color: "#6B6B6B", fontSize: "12px", display: "block", marginBottom: "4px" }}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="Feature Request">Feature Request</option>
              <option value="Bug Report">Bug Report</option>
              <option value="General Feedback">General Feedback</option>
            </select>
          </div>

          <div>
            <label style={{ color: "#6B6B6B", fontSize: "12px", display: "block", marginBottom: "4px" }}>Message</label>
            <textarea placeholder="What's on your mind?" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          {status.text && (
            <p style={{ margin: 0, fontSize: "13px", color: status.type === "success" ? "#4ade80" : "#f87171" }}>
              {status.text}
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={submit}
            disabled={sending}
            style={{
              width: "100%",
              padding: "10px",
              background: "#C9A96E",
              color: "#0A0A0A",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: sending ? "not-allowed" : "pointer",
              opacity: sending ? 0.6 : 1,
            }}
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
