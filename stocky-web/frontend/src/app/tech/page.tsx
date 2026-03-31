import type { Metadata } from "next";
import TechPageClient from "./TechPageClient";

export const metadata: Metadata = {
  title: "Stocky AI — Technical Architecture",
  description:
    "Engineering deep-dive into the AI-powered trading assistant for Indian markets. System architecture, LLM orchestration, multi-agent debate, and scaling to 50K concurrent users.",
  openGraph: {
    title: "Stocky AI — Technical Architecture",
    description: "Engineering deep-dive: LLM orchestration, multi-agent debate, system design for scale.",
    url: "https://llm.stockyai.xyz/tech",
  },
};

export default function TechPage() {
  return <TechPageClient />;
}
