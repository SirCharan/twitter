"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/cn";
import { CARD_ENTER, CARD_ENTER_REDUCED, TAP_SCALE_SUBTLE, useReducedMotion } from "@/lib/motion";
import type { ReactNode } from "react";

const DEPTH = {
  flat: "",
  raised: "shadow-[0_2px_8px_rgba(0,0,0,0.3)]",
  elevated: "shadow-[0_4px_24px_rgba(0,0,0,0.4)]",
} as const;

interface CardWrapperProps extends Omit<HTMLMotionProps<"div">, "title"> {
  children: ReactNode;
  depth?: keyof typeof DEPTH;
  icon?: ReactNode;
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
  const reduced = useReducedMotion();
  const enter = reduced ? CARD_ENTER_REDUCED : CARD_ENTER;

  return (
    <motion.div
      initial={enter.initial}
      animate={enter.animate}
      whileHover={reduced ? undefined : { y: -2, boxShadow: "0 0 28px rgba(201,169,110,0.07)" }}
      whileTap={reduced ? undefined : TAP_SCALE_SUBTLE}
      transition={enter.transition}
      className={cn(
        "rounded-2xl border px-3 py-3.5 sm:px-5 sm:py-4",
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
