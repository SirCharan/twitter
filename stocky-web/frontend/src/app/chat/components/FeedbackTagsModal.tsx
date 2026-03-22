"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { submitFeedback } from "@/lib/api";
import { toast } from "sonner";

const TAGS = [
  "Missing data",
  "Wrong analysis",
  "Too vague",
  "Risks ignored",
  "Outdated data",
];

interface Props {
  open: boolean;
  onClose: () => void;
  messageId: string;
  conversationId?: string;
  query: string;
  responseSnippet: string;
}

export default function FeedbackTagsModal({
  open,
  onClose,
  messageId,
  conversationId,
  query,
  responseSnippet,
}: Props) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await submitFeedback({
        message_id: messageId,
        conversation_id: conversationId || "",
        query,
        response_snippet: responseSnippet.slice(0, 500),
        rating: "down",
        tags: selectedTags,
        comment,
      });
      toast.success("Feedback recorded — training agents...");
      onClose();
    } catch {
      toast.error("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-5"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--card-border)",
              boxShadow: "0 16px 64px rgba(0,0,0,0.6)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                What went wrong?
              </h3>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/5"
                style={{ color: "var(--muted)" }}
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all"
                  style={{
                    background: selectedTags.includes(tag)
                      ? "rgba(239,68,68,0.15)"
                      : "var(--surface)",
                    borderColor: selectedTags.includes(tag)
                      ? "rgba(239,68,68,0.4)"
                      : "var(--card-border)",
                    color: selectedTags.includes(tag)
                      ? "#ef4444"
                      : "var(--muted)",
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Additional details (optional)..."
              rows={2}
              className="w-full resize-none rounded-xl border bg-transparent px-3 py-2 text-xs outline-none placeholder:text-[var(--muted)]"
              style={{
                borderColor: "var(--card-border)",
                color: "var(--foreground)",
              }}
            />

            <div className="mt-4 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-white/5"
                style={{
                  borderColor: "var(--card-border)",
                  color: "var(--muted)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || (selectedTags.length === 0 && !comment.trim())}
                className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all disabled:opacity-40"
                style={{
                  background: "rgba(239,68,68,0.15)",
                  color: "#ef4444",
                  border: "1px solid rgba(239,68,68,0.3)",
                }}
              >
                {submitting ? "Sending..." : "Submit Feedback"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
