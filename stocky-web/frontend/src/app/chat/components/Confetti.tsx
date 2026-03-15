"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  id: number;
  tx: number;
  ty: number;
  size: number;
  delay: number;
  color: string;
  rotate: number;
  shape: "circle" | "square" | "rect";
}

const COLORS = ["#C9A96E", "#E8D5A3", "#F5F0EB", "#8B7340", "#FFD700", "#FFA500"];
const SHAPES: Particle["shape"][] = ["circle", "square", "rect"];

export default function Confetti() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const p: Particle[] = Array.from({ length: 16 }, (_, i) => ({
      id: i,
      tx: (Math.random() - 0.5) * 140,
      ty: (Math.random() - 0.8) * 100,
      size: 3 + Math.random() * 5,
      delay: Math.random() * 0.2,
      color: COLORS[i % COLORS.length],
      rotate: Math.random() * 360,
      shape: SHAPES[i % SHAPES.length],
    }));
    setParticles(p);
    const timer = setTimeout(() => setVisible(false), 1400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && particles.length > 0 && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 10 }}>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{
                opacity: 1,
                x: 0,
                y: 0,
                scale: 0,
                rotate: 0,
              }}
              animate={{
                opacity: [1, 1, 0],
                x: p.tx,
                y: p.ty,
                scale: [0, 1.2, 0.8],
                rotate: p.rotate,
              }}
              transition={{
                duration: 0.9,
                delay: p.delay,
                ease: "easeOut",
              }}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: p.shape === "rect" ? p.size * 1.8 : p.size,
                height: p.size,
                borderRadius: p.shape === "circle" ? "50%" : "1px",
                background: p.color,
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
