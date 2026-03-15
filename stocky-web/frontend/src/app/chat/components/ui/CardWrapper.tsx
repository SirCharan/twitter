"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

const DEPTH = {
  flat: "",
  raised: "shadow-[0_2px_8px_rgba(0,0,0,0.3)]",
  elevated: "shadow-[0_4px_24px_rgba(0,0,0,0.4)]",
} as const;

interface CardWrapperProps extends Omit<HTMLMotionProps<"div">, "title"> {
  children: ReactNode;
  depth?: keyof typeof DEPTH;
  icon?: string;
  title?: string;
  badge?: ReactNode;
  glow?: boolean;
  className?: string;
}

export default function CardWrapper({
  children,
  depth = "raised",
  icon,
  title,
  badge,
  glow = false,
  className,
  ...motionProps
}: CardWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "rounded-2xl border px-4 py-4 sm:px-5",
        DEPTH[depth],
        glow && "card-glow",
        className,
      )}
      style={{
        background: "var(--card-bg)",
        borderColor: "var(--card-border)",
      }}
      {...motionProps}
    >
      {(icon || title) && (
        <div className="mb-3 flex items-center gap-2">
          {icon && <span className="text-base">{icon}</span>}
          {title && (
            <span
              className="text-sm font-semibold tracking-wide"
              style={{ color: "var(--accent)" }}
            >
              {title}
            </span>
          )}
          {badge && <div className="ml-auto">{badge}</div>}
        </div>
      )}
      {children}
    </motion.div>
  );
}
