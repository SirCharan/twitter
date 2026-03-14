import type { Metadata } from "next";
import Script from "next/script";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Stocky AI — AI Stock Analysis & Trading Assistant",
    template: "%s | Stocky AI",
  },
  description:
    "AI-powered stock analysis and trading for Indian markets. Chat with Stocky for real-time NSE/BSE analysis, news, charts, and Zerodha trade execution.",
  metadataBase: new URL("https://llm.stockyai.xyz"),
  alternates: {
    canonical: "https://llm.stockyai.xyz",
  },
  keywords: [
    "AI stock analysis tool",
    "AI trading assistant India",
    "Zerodha AI assistant",
    "NSE stock analysis AI",
    "AI trading bot India",
    "stock market AI chatbot",
    "Indian stock market assistant",
    "AI portfolio tracker India",
    "deep research stocks India",
    "market scanner India",
    "macro dashboard India",
  ],
  authors: [{ name: "Charandeep Kapoor", url: "https://charandeepkapoor.com" }],
  creator: "Charandeep Kapoor",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Stocky AI — AI Stock Analysis & Trading",
    description:
      "Chat with an AI assistant built for Indian markets. Real-time stock analysis, news aggregation, and Zerodha trade execution.",
    url: "https://llm.stockyai.xyz",
    siteName: "Stocky AI",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Stocky AI — Chat-based AI trading assistant for Indian stock markets",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Stocky AI — AI Stock Analysis & Trading",
    description:
      "Chat with an AI built for Indian markets. NSE/BSE analysis, news, charts, and Zerodha integration.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large" as const,
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Stocky AI",
              "applicationCategory": "FinanceApplication",
              "operatingSystem": "Web",
              "url": "https://llm.stockyai.xyz",
              "description":
                "AI-powered chat assistant for Indian stock market analysis and trading via Zerodha",
              "author": {
                "@type": "Person",
                "name": "Charandeep Kapoor",
                "url": "https://charandeepkapoor.com",
              },
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "INR",
              },
              "sameAs": [
                "https://stockyai.xyz",
                "https://terminal.stockyai.xyz",
                "https://charandeepkapoor.com",
              ],
              "featureList": [
                "AI stock analysis for NSE and BSE (fundamental, technical, news sentiment)",
                "Zerodha Kite integration for trade execution with 2-phase confirmation",
                "Real-time market news from 25+ RSS sources with category filtering",
                "Deep Research with dual-agent AI system (Quick Agent + Deep Agent)",
                "Agent Debate — two AI agents analyse independently then synthesise",
                "Market scanning — 6 types across Nifty 100 with sparklines",
                "Stock comparison with winner detection and best-value highlighting",
                "TradingView live chart embeds and custom analysis charts",
                "Sector rotation analysis (Relative Rotation Graph)",
                "IPO tracking with gain badges and multi-source data",
                "Macro dashboard — forex, bonds, commodities (USD & INR), crypto",
                "Portfolio, holdings, and margin overview via Kite API",
              ],
            }),
          }}
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-93SFBS9CDS"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-93SFBS9CDS');
          `}
        </Script>
      </head>
      <body className={`${geist.variable} font-sans antialiased bg-[#0A0A0A] text-[#F5F0EB]`}>
        {children}
      </body>
    </html>
  );
}
