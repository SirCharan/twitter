"use client";
import { createContext, useContext, useState, useCallback, useRef } from "react";
import React from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  exiting?: boolean;
}

interface ToastContextValue {
  toasts: ToastItem[];
  toast: (message: string, type?: ToastType) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  toast: () => {},
  dismiss: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = ++idRef.current;
      setToasts((prev) => {
        const next = [...prev, { id, message, type }];
        // Keep max 3 toasts
        if (next.length > 3) {
          return next.slice(-3);
        }
        return next;
      });
      // Auto-dismiss after 3s
      setTimeout(() => dismiss(id), 3000);
    },
    [dismiss]
  );

  return React.createElement(
    ToastContext.Provider,
    { value: { toasts, toast, dismiss } },
    children
  );
}
