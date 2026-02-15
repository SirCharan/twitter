"use client";

import { useState } from "react";

const FEATURES = [
  {
    title: "Telegram Trading Bot",
    description:
      "Execute trades, set stop losses, manage alerts — all from Telegram. Connected to your Zerodha account.",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21.198 2.433a2.242 2.242 0 00-1.022.215l-16.5 7.5a2.25 2.25 0 00.168 4.167l5.156 1.718 1.718 5.156a2.25 2.25 0 004.167.168l7.5-16.5a2.25 2.25 0 00-1.187-2.424z" />
        <path d="M10 14l4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "AI Chat Interface",
    description:
      'Talk to Stocky like you talk to ChatGPT. "How is Reliance doing?" "Buy 10 TCS at 3500." Natural language, real execution.',
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Portfolio Intelligence",
    description:
      "Real-time P&L tracking, risk monitoring, max loss protection. Your portfolio on autopilot with guardrails.",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Trading Signals",
    description:
      "AI-powered analysis delivered straight to your inbox. Fundamental, technical, and sentiment — scored and ranked.",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Options Exit Engine",
    description:
      "Exit options based on underlying price, not option price. The feature Zerodha should have built. We did.",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Auto-Login via TOTP",
    description:
      "No manual tokens. No browser popups. Stocky logs into your Zerodha every morning at 7:40 AM. You just trade.",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

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

  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <span className="font-cursive text-2xl tracking-wide" style={{ color: "#1A1A1A" }}>
          Stocky
        </span>
        <span
          className="text-xs tracking-widest uppercase"
          style={{ color: "#8A8A8A", letterSpacing: "0.2em" }}
        >
          Early Access
        </span>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="opacity-0 animate-fade-in-up">
          <h1 className="font-cursive text-7xl md:text-9xl font-medium tracking-tight leading-none">
            <span className="gradient-text">Stocky</span>
          </h1>
        </div>

        <div className="opacity-0 animate-fade-in-up animate-delay-1">
          <p
            className="mt-8 text-2xl md:text-3xl font-light leading-snug max-w-2xl mx-auto"
            style={{ color: "#1A1A1A" }}
          >
            Your edge, automated.
          </p>
        </div>

        <div className="opacity-0 animate-fade-in-up animate-delay-2">
          <p
            className="mt-5 text-base md:text-lg leading-relaxed max-w-lg mx-auto"
            style={{ color: "#8A8A8A" }}
          >
            AI that trades for you, watches your portfolio, and never sleeps.
            <br />
            Connected to Zerodha. Powered by your rules.
          </p>
        </div>

        {/* Waitlist */}
        <div className="opacity-0 animate-fade-in-up animate-delay-3 mt-12">
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
                  background: "#FFFFFF",
                  border: "1px solid #E8E4DF",
                  color: "#1A1A1A",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#C9A96E")}
                onBlur={(e) => (e.target.style.borderColor = "#E8E4DF")}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-medium transition-all cursor-pointer"
                style={{ background: "#1A1A1A", color: "#FAF8F5" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#2C2C2C")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#1A1A1A")}
              >
                {loading ? "..." : "Get Early Access"}
              </button>
            </form>
          ) : (
            <div
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm"
              style={{ background: "#FFFFFF", border: "1px solid #E8E4DF" }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="2">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ color: "#1A1A1A" }}>You&apos;re in. We&apos;ll reach out soon.</span>
            </div>
          )}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6">
        <div style={{ height: "1px", background: "#E8E4DF" }} />
      </div>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="font-cursive text-3xl md:text-4xl" style={{ color: "#1A1A1A" }}>
            What&apos;s coming
          </h2>
          <p className="mt-3 text-sm" style={{ color: "#8A8A8A" }}>
            Everything a serious trader needs. Nothing they don&apos;t.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className={`card-hover rounded-2xl p-7 opacity-0 animate-fade-in-up`}
              style={{
                background: "#FFFFFF",
                border: "1px solid #E8E4DF",
                animationDelay: `${(i + 1) * 0.1}s`,
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl" style={{ background: "#FAF8F5", color: "#1A1A1A" }}>
                  {feature.icon}
                </div>
                <span className="coming-soon-badge">Coming Soon</span>
              </div>
              <h3 className="text-base font-semibold mb-2" style={{ color: "#1A1A1A" }}>
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#8A8A8A" }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-24 text-center">
        <div style={{ height: "1px", background: "#E8E4DF", marginBottom: "5rem" }} />
        <p className="font-cursive text-2xl md:text-3xl mb-3" style={{ color: "#1A1A1A" }}>
          The market doesn&apos;t wait.
        </p>
        <p className="text-sm mb-8" style={{ color: "#8A8A8A" }}>
          Neither should you.
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
                background: "#FFFFFF",
                border: "1px solid #E8E4DF",
                color: "#1A1A1A",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#C9A96E")}
              onBlur={(e) => (e.target.style.borderColor = "#E8E4DF")}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-medium transition-all cursor-pointer"
              style={{ background: "#1A1A1A", color: "#FAF8F5" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#2C2C2C")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#1A1A1A")}
            >
              {loading ? "..." : "Join the Waitlist"}
            </button>
          </form>
        ) : (
          <p className="text-sm" style={{ color: "#C9A96E" }}>
            You&apos;re already on the list. We&apos;ll be in touch.
          </p>
        )}
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 pb-10">
        <div style={{ height: "1px", background: "#E8E4DF", marginBottom: "2rem" }} />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-cursive text-lg" style={{ color: "#1A1A1A" }}>
            Stocky
          </span>
          <p className="text-xs" style={{ color: "#8A8A8A" }}>
            Built for traders who think in payoffs, not predictions.
          </p>
        </div>
      </footer>
    </main>
  );
}
