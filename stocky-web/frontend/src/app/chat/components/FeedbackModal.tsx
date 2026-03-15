"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as DialogPrimitive from "@radix-ui/react-dialog";

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

  function close() {
    onClose();
    setStatus({ text: "", type: "" });
  }

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

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[9999]"
                style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="fixed left-1/2 top-1/2 z-[10000] w-[min(440px,95vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl"
                style={{
                  background: "var(--card-bg, #111)",
                  border: "1px solid rgba(201,169,110,0.2)",
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  <DialogPrimitive.Title className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
                    Send Feedback
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Close className="text-[22px] leading-none transition-opacity hover:opacity-70" style={{ color: "#6B6B6B" }}>
                    &times;
                  </DialogPrimitive.Close>
                </div>

                {/* Body */}
                <div className="flex flex-col gap-3.5 px-5 py-4">
                  <DialogPrimitive.Description className="text-xs leading-relaxed" style={{ color: "var(--accent)" }}>
                    This goes directly to my inbox &mdash; I personally read every message (no AI).
                  </DialogPrimitive.Description>

                  <div>
                    <label className="mb-1 block text-xs" style={{ color: "#6B6B6B" }}>Name</label>
                    <input
                      type="text"
                      placeholder="Optional"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-md border bg-white/5 px-3 py-2.5 text-sm outline-none"
                      style={{ borderColor: "rgba(255,255,255,0.1)", color: "var(--foreground)" }}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs" style={{ color: "#6B6B6B" }}>Email</label>
                    <input
                      type="email"
                      placeholder="Optional — only if you want a reply"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-md border bg-white/5 px-3 py-2.5 text-sm outline-none"
                      style={{ borderColor: "rgba(255,255,255,0.1)", color: "var(--foreground)" }}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs" style={{ color: "#6B6B6B" }}>Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full cursor-pointer rounded-md border bg-white/5 px-3 py-2.5 text-sm outline-none"
                      style={{ borderColor: "rgba(255,255,255,0.1)", color: "var(--foreground)" }}
                    >
                      <option value="Feature Request">Feature Request</option>
                      <option value="Bug Report">Bug Report</option>
                      <option value="General Feedback">General Feedback</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs" style={{ color: "#6B6B6B" }}>Message</label>
                    <textarea
                      placeholder="What's on your mind?"
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full resize-y rounded-md border bg-white/5 px-3 py-2.5 text-sm outline-none"
                      style={{ borderColor: "rgba(255,255,255,0.1)", color: "var(--foreground)" }}
                    />
                  </div>

                  {status.text && (
                    <p className="text-[13px]" style={{ color: status.type === "success" ? "#4ade80" : "#f87171" }}>
                      {status.text}
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t px-5 py-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  <button
                    onClick={submit}
                    disabled={sending}
                    className="w-full rounded-md py-2.5 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ background: "var(--accent)", color: "var(--background)" }}
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
