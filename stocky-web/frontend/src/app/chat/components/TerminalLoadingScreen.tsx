"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onComplete: () => void;
  minimumDuration?: number;
}

const BOOT_LINES = [
  { prefix: "> ", text: "STOCKY AI NEURAL TERMINAL v2.1", color: "#00FF41", delay: 0 },
  { prefix: "> ", text: "Booting kernel...", color: "#00CC34", delay: 300 },
  { prefix: "", text: "", color: "#00FF41", delay: 600 }, // blank line
  { prefix: "[OK]      ", text: "Initializing Groq Llama-3.3-70B neural core...", color: "#00CC34", delay: 900 },
  { prefix: "[OK]      ", text: "Connecting to Zerodha Kite real-time feed...", color: "#00CC34", delay: 1400 },
  { prefix: "[OK]      ", text: "Loading dual AI agents (Quick + Deep Research)...", color: "#00CC34", delay: 1900 },
  { prefix: "[OK]      ", text: "Syncing NSE/BSE, IPO, Macro & RRG modules...", color: "#00CC34", delay: 2400 },
  { prefix: "[WARNING] ", text: "Quantum market entanglement established", color: "#FFB800", delay: 2900 },
  { prefix: "[OK]      ", text: "Portfolio scanner & risk engine online", color: "#00CC34", delay: 3300 },
];

const PROGRESS_STAGES = [
  { target: 15, delay: 500 },
  { target: 40, delay: 1000 },
  { target: 65, delay: 1500 },
  { target: 85, delay: 2200 },
  { target: 100, delay: 3600 },
];

const CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&";

export default function TerminalLoadingScreen({ onComplete, minimumDuration = 3000 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visibleLines, setVisibleLines] = useState(0);
  const [typedChars, setTypedChars] = useState<string[]>(Array(BOOT_LINES.length).fill(""));
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [glitch, setGlitch] = useState(false);
  const [done, setDone] = useState(false);
  const completedRef = useRef(false);

  // Skip boot animation for returning users in same session
  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("stocky_booted")) {
      onComplete();
    }
  }, [onComplete]);

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setDone(true);
    if (typeof window !== "undefined") sessionStorage.setItem("stocky_booted", "1");
    setTimeout(onComplete, 420);
  }, [onComplete]);

  // Matrix rain canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const fontSize = 13;
    let cols: number;
    let drops: number[];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Math.floor(canvas.width / fontSize);
      drops = Array(cols).fill(1);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.fillStyle = "rgba(5,5,5,0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0,255,65,0.35)";
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Elapsed timer
  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Progress bar
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    PROGRESS_STAGES.forEach(({ target, delay }) => {
      timers.push(setTimeout(() => setProgress(target), delay));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  // Boot line reveal + typewriter
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    BOOT_LINES.forEach((line, idx) => {
      timers.push(
        setTimeout(() => {
          setVisibleLines((v) => Math.max(v, idx + 1));
          const fullText = line.prefix + line.text;
          if (!fullText.trim()) return; // skip blank line typing
          let charIdx = 0;
          const interval = setInterval(() => {
            charIdx++;
            setTypedChars((prev) => {
              const next = [...prev];
              next[idx] = fullText.slice(0, charIdx);
              return next;
            });
            if (charIdx >= fullText.length) clearInterval(interval);
          }, 16);
        }, line.delay),
      );
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  // Auto-complete after minimumDuration
  useEffect(() => {
    const id = setTimeout(complete, minimumDuration);
    return () => clearTimeout(id);
  }, [complete, minimumDuration]);

  // Glitch effect
  useEffect(() => {
    const scheduleGlitch = () => {
      const delay = 2500 + Math.random() * 4000;
      return setTimeout(() => {
        setGlitch(true);
        setTimeout(() => {
          setGlitch(false);
          scheduleGlitch();
        }, 90);
      }, delay);
    };
    const id = scheduleGlitch();
    return () => clearTimeout(id);
  }, []);

  // Click to skip
  const handleClick = useCallback(() => complete(), [complete]);

  // Progress bar render
  const barWidth = 28;
  const filled = Math.round((progress / 100) * barWidth);
  const barStr = "█".repeat(filled) + "░".repeat(barWidth - filled);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="terminal-boot"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          onClick={handleClick}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          {/* Matrix rain background */}
          <canvas
            ref={canvasRef}
            style={{ position: "absolute", inset: 0, opacity: 0.08, pointerEvents: "none" }}
          />

          {/* Dark base */}
          <div style={{ position: "absolute", inset: 0, background: "#050505" }} />

          {/* CRT scanlines overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />

          {/* Terminal window */}
          <div
            className={glitch ? "glitch" : ""}
            style={{
              position: "relative",
              zIndex: 2,
              width: "100%",
              maxWidth: "640px",
              margin: "0 16px",
              background: "rgba(5,5,5,0.96)",
              border: "1px solid #00FF41",
              borderRadius: "4px",
              boxShadow: "0 0 60px rgba(0,255,65,0.1), 0 0 120px rgba(0,255,65,0.04)",
              fontFamily: "monospace",
              overflow: "hidden",
            }}
          >
            {/* Title bar */}
            <div
              style={{
                borderBottom: "1px solid rgba(0,255,65,0.3)",
                padding: "7px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(0,255,65,0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#00FF41", boxShadow: "0 0 6px #00FF41" }} />
                <span style={{ color: "#00FF41", fontSize: "10px", letterSpacing: "0.12em", fontWeight: 700 }}>
                  STOCKY AI NEURAL TERMINAL v2.1 — NSE/BSE LIVE
                </span>
              </div>
              <span style={{ color: "#00882A", fontSize: "10px", fontFamily: "monospace" }}>
                {elapsed}s
              </span>
            </div>

            {/* Boot log */}
            <div style={{ padding: "14px 16px", minHeight: "200px" }}>
              {BOOT_LINES.slice(0, visibleLines).map((line, idx) => {
                const typed = typedChars[idx];
                const fullText = line.prefix + line.text;
                const isTyping = typed.length < fullText.length && fullText.trim().length > 0;
                const isBlank = !fullText.trim();

                return (
                  <div
                    key={idx}
                    style={{
                      minHeight: isBlank ? "10px" : "20px",
                      marginBottom: "2px",
                    }}
                  >
                    {!isBlank && (
                      <span
                        style={{
                          color: line.color,
                          fontSize: "12px",
                          lineHeight: "1.6",
                          letterSpacing: "0.02em",
                        }}
                      >
                        {typed.slice(0, line.prefix.length)}
                        {typed.length > line.prefix.length && (
                          <span style={{ color: idx === visibleLines - 1 ? "#00FF41" : line.color }}>
                            {typed.slice(line.prefix.length)}
                          </span>
                        )}
                        {isTyping && (
                          <span
                            style={{
                              display: "inline-block",
                              width: "6px",
                              height: "12px",
                              background: "#00FF41",
                              marginLeft: "1px",
                              verticalAlign: "middle",
                              animation: "termCursorBlink 0.8s step-end infinite",
                            }}
                          />
                        )}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Blinking cursor at end when all lines done */}
              {visibleLines >= BOOT_LINES.length && (
                <div style={{ marginTop: "4px" }}>
                  <span style={{ color: "#00882A", fontSize: "12px" }}>&gt; </span>
                  <span
                    style={{
                      display: "inline-block",
                      width: "7px",
                      height: "13px",
                      background: "#00FF41",
                      verticalAlign: "middle",
                      animation: "termCursorBlink 1s step-end infinite",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div
              style={{
                borderTop: "1px solid rgba(0,255,65,0.2)",
                padding: "10px 16px 12px",
                background: "rgba(0,255,65,0.02)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ color: "#00882A", fontSize: "10px", letterSpacing: "0.06em", flexShrink: 0 }}>
                  BOOT
                </span>
                <span
                  style={{
                    color: "#00FF41",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    letterSpacing: "0.01em",
                    transition: "all 0.5s ease",
                  }}
                >
                  [{barStr}]
                </span>
                <span style={{ color: "#00FF41", fontSize: "11px", flexShrink: 0, minWidth: "36px" }}>
                  {progress}%
                </span>
              </div>
              <div style={{ marginTop: "6px", color: "#004415", fontSize: "9px", letterSpacing: "0.08em" }}>
                CLICK ANYWHERE TO SKIP
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
