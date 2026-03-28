import { useReducedMotion } from "framer-motion";

// Apple HIG spring presets
export const SPRING_SNAPPY = { type: "spring" as const, stiffness: 380, damping: 30 };
export const SPRING_GENTLE = { type: "spring" as const, stiffness: 260, damping: 28 };

// Card entrance (CardWrapper, SkeletonFor, MessageBubble full-width)
export const CARD_ENTER = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: SPRING_GENTLE,
};

// Reduced-motion fallback
export const CARD_ENTER_REDUCED = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.15 },
};

// Chip/pill entrance
export const CHIP_ENTER = (delay: number) => ({
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { ...SPRING_SNAPPY, delay },
});

// Stagger helper
export const stagger = (index: number, baseDelay = 0, interval = 0.03) =>
  baseDelay + index * interval;

// Tap feedback
export const TAP_SCALE = { scale: 0.97 };
export const TAP_SCALE_SUBTLE = { scale: 0.995 };

export { useReducedMotion };
