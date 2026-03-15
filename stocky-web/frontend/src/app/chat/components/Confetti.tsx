"use client";
import { useEffect, useState } from "react";

interface Particle {
  id: number;
  tx: number;
  ty: number;
  size: number;
  delay: number;
  color: string;
}

const COLORS = ["#C9A96E", "#E8D5A3", "#F5F0EB", "#8B7340", "#FFD700"];

export default function Confetti() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const p: Particle[] = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      tx: (Math.random() - 0.5) * 80,
      ty: (Math.random() - 0.8) * 60,
      size: 4 + Math.random() * 4,
      delay: Math.random() * 0.15,
      color: COLORS[i % COLORS.length],
    }));
    setParticles(p);
    const timer = setTimeout(() => setVisible(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  if (!visible || particles.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 10 }}>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: p.size,
            height: p.size,
            borderRadius: p.size > 6 ? "2px" : "50%",
            background: p.color,
            ["--tx" as string]: `${p.tx}px`,
            ["--ty" as string]: `${p.ty}px`,
            animation: `sparkle 0.8s ease-out ${p.delay}s forwards`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}
