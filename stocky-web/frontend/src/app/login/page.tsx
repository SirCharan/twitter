"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        await register(username, password);
      } else {
        await login(username, password);
      }
      router.push("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      {/* Radial glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: "radial-gradient(ellipse 600px 400px at 50% 40%, rgba(201,169,110,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-10 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-mark.png"
            alt="Stocky"
            width={64}
            height={64}
            className="mx-auto mb-5"
            style={{ objectFit: "contain" }}
          />
          <h1 className="gradient-text-shimmer text-4xl font-light tracking-widest">
            Stocky
          </h1>
          <p className="mt-3 text-sm tracking-wide" style={{ color: "var(--muted)" }}>
            Precision. Discipline. Edge.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
              className="input-focus-ring w-full rounded-xl border px-4 py-3.5 text-sm outline-none"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--card-border)",
                color: "var(--foreground)",
              }}
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="input-focus-ring w-full rounded-xl border px-4 py-3.5 text-sm outline-none"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--card-border)",
                color: "var(--foreground)",
              }}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--negative)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="cta-glow w-full rounded-xl py-3.5 text-sm font-medium tracking-wide transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--background)" }}
          >
            {loading ? "..." : isRegister ? "Create Account" : "Sign In"}
          </button>

          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="w-full pt-2 text-center text-xs transition-opacity hover:opacity-80"
            style={{ color: "var(--muted)" }}
          >
            {isRegister ? "Already have an account? Sign in" : "First time? Create an account"}
          </button>
        </form>
      </div>
    </div>
  );
}
