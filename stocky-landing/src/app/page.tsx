"use client";

import { useState, useEffect, useRef } from "react";

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          // Also reveal children with reveal class
          el.querySelectorAll(".reveal").forEach((child) => {
            child.classList.add("visible");
          });
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

function CountUp({ end, suffix = "", decimals = 0, duration = 2000 }: {
  end: number;
  suffix?: string;
  decimals?: number;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(eased * end);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [started, end, duration]);

  return (
    <span ref={ref}>
      {decimals > 0 ? count.toFixed(decimals) : Math.floor(count)}{suffix}
    </span>
  );
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSubmitted(true);
    setLoading(false);
  };

  const statsRef = useScrollReveal();
  const teasersRef = useScrollReveal();
  const ctaRef = useScrollReveal();
  const divider1Ref = useScrollReveal();
  const divider2Ref = useScrollReveal();
  const divider3Ref = useScrollReveal();

  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <span className="font-cursive text-2xl tracking-wide" style={{ color: "#F5F0EB" }}>
          Stocky
        </span>
        <span
          className="text-xs tracking-widest uppercase"
          style={{ color: "#6B6B6B", letterSpacing: "0.25em" }}
        >
          By Invitation
        </span>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="opacity-0 animate-fade-in-up">
          <h1 className="font-cursive text-6xl md:text-8xl font-medium tracking-tight leading-none">
            <span className="gradient-text-shimmer">Stocky</span>
          </h1>
        </div>

        <div className="opacity-0 animate-fade-in-up animate-delay-1">
          <p
            className="mt-8 text-2xl md:text-3xl font-light leading-snug max-w-2xl mx-auto tracking-wide"
            style={{ color: "#F5F0EB" }}
          >
            Precision. Discipline. Edge.
          </p>
        </div>

        <div className="opacity-0 animate-fade-in-up animate-delay-2">
          <p
            className="mt-5 text-base md:text-lg leading-relaxed max-w-lg mx-auto font-light"
            style={{ color: "#6B6B6B" }}
          >
            An AI trading engine built for the few who think
            <br />
            in payoffs, not predictions.
          </p>
        </div>

        {/* Waitlist */}
        <div className="opacity-0 animate-fade-in-up animate-delay-3 mt-14">
          {!submitted ? (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full sm:flex-1 px-5 py-3.5 rounded-full text-sm outline-none transition-all"
                style={{
                  background: "#111111",
                  border: "1px solid #1F1F1F",
                  color: "#F5F0EB",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#C9A96E")}
                onBlur={(e) => (e.target.style.borderColor = "#1F1F1F")}
              />
              <button
                type="submit"
                disabled={loading}
                className="cta-glow w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-medium transition-all cursor-pointer"
                style={{ background: "#C9A96E", color: "#0A0A0A" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#D4B87A")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#C9A96E")}
              >
                {loading ? "..." : "Request Access"}
              </button>
            </form>
          ) : (
            <div
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm"
              style={{ background: "#141414", border: "1px solid #1F1F1F" }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="2">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ color: "#F5F0EB" }}>Your place is reserved.</span>
            </div>
          )}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6" ref={divider1Ref}>
        <div className="divider-line" />
      </div>

      {/* Performance */}
      <section className="max-w-5xl mx-auto px-6 py-28" ref={statsRef}>
        <div className="text-center mb-6 reveal">
          <p
            className="text-xs uppercase tracking-widest mb-12"
            style={{ color: "#6B6B6B", letterSpacing: "0.25em" }}
          >
            Track Record
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 text-center">
          <div className="reveal reveal-delay-1">
            <p className="font-cursive text-5xl md:text-6xl stat-float stat-float-delay-1" style={{ color: "#C9A96E" }}>
              <CountUp end={150} suffix="%+" duration={2200} />
            </p>
            <p className="mt-3 text-sm font-light" style={{ color: "#6B6B6B" }}>
              Returns since June 2025
            </p>
          </div>
          <div className="reveal reveal-delay-2">
            <p className="font-cursive text-5xl md:text-6xl stat-float stat-float-delay-2" style={{ color: "#C9A96E" }}>
              <CountUp end={3.29} suffix="" decimals={2} duration={2200} />
            </p>
            <p className="mt-3 text-sm font-light" style={{ color: "#6B6B6B" }}>
              Sharpe Ratio
            </p>
          </div>
          <div className="reveal reveal-delay-3">
            <p className="font-cursive text-5xl md:text-6xl stat-float stat-float-delay-3" style={{ color: "#C9A96E" }}>
              <CountUp end={72.9} suffix="%" decimals={1} duration={2200} />
            </p>
            <p className="mt-3 text-sm font-light" style={{ color: "#6B6B6B" }}>
              Win Rate
            </p>
          </div>
        </div>

        <div className="text-center mt-16 reveal" style={{ transitionDelay: "0.6s" }}>
          <p className="font-cursive text-xl md:text-2xl font-light" style={{ color: "#F5F0EB" }}>
            15L to 37.62L. Eight months. One system.
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6" ref={divider2Ref}>
        <div className="divider-line" />
      </div>

      {/* What's Next — Teasers */}
      <section className="max-w-4xl mx-auto px-6 py-28 text-center" ref={teasersRef}>
        <p
          className="text-xs uppercase tracking-widest mb-16 reveal"
          style={{ color: "#6B6B6B", letterSpacing: "0.25em" }}
        >
          What&apos;s Next
        </p>

        <div className="space-y-20">
          <div className="reveal reveal-delay-1">
            <p className="font-cursive text-2xl md:text-3xl" style={{ color: "#F5F0EB" }}>
              A mind trained on Indian markets.
            </p>
            <p className="mt-4 text-sm font-light max-w-md mx-auto" style={{ color: "#6B6B6B" }}>
              A fine-tuned LLM chat interface built on Claude Opus 4.6 — purpose-built for
              NSE, BSE, and the patterns that move them. Ask anything. Get a take, not a disclaimer.
            </p>
          </div>

          <div className="reveal reveal-delay-2">
            <p className="font-cursive text-2xl md:text-3xl" style={{ color: "#F5F0EB" }}>
              Your portfolio on autopilot.
            </p>
            <p className="mt-4 text-sm font-light max-w-md mx-auto" style={{ color: "#6B6B6B" }}>
              Full portfolio automation — from entry logic to risk management to rebalancing.
              Define your rules once. Stocky executes, monitors, and adapts.
            </p>
          </div>

          <div className="reveal reveal-delay-3">
            <p className="font-cursive text-2xl md:text-3xl" style={{ color: "#F5F0EB" }}>
              Telegram, but autonomous.
            </p>
            <p className="mt-4 text-sm font-light max-w-md mx-auto" style={{ color: "#6B6B6B" }}>
              An automator that doesn&apos;t wait for commands. It watches, decides, and acts —
              within the guardrails you set. You review. It runs.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-24 text-center" ref={ctaRef}>
        <div ref={divider3Ref} style={{ marginBottom: "5rem" }}>
          <div className="divider-line" />
        </div>
        <div className="reveal">
          <p className="font-cursive text-2xl md:text-3xl mb-3" style={{ color: "#F5F0EB" }}>
            Built for those who move first.
          </p>
          <p className="text-sm mb-8" style={{ color: "#6B6B6B", letterSpacing: "0.15em" }}>
            By invitation only.
          </p>
          {!submitted ? (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full sm:flex-1 px-5 py-3.5 rounded-full text-sm outline-none transition-all"
                style={{
                  background: "#111111",
                  border: "1px solid #1F1F1F",
                  color: "#F5F0EB",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#C9A96E")}
                onBlur={(e) => (e.target.style.borderColor = "#1F1F1F")}
              />
              <button
                type="submit"
                disabled={loading}
                className="cta-glow w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-medium transition-all cursor-pointer"
                style={{ background: "#C9A96E", color: "#0A0A0A" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#D4B87A")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#C9A96E")}
              >
                {loading ? "..." : "Reserve Your Place"}
              </button>
            </form>
          ) : (
            <p className="text-sm" style={{ color: "#C9A96E" }}>
              Your place is reserved. We&apos;ll be in touch.
            </p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 pb-10">
        <div style={{ height: "1px", background: "#1F1F1F", marginBottom: "2rem" }} />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-cursive text-lg" style={{ color: "#F5F0EB" }}>
            Stocky
          </span>
          <p className="text-xs" style={{ color: "#4A4A4A", letterSpacing: "0.15em" }}>
            Performance is the only credential.
          </p>
        </div>
      </footer>
    </main>
  );
}
