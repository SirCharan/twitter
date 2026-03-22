import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist } from "next/font/google";
import "./globals.css";
import AnalyticsInit from "./AnalyticsInit";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A0A0A",
};

export const metadata: Metadata = {
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Stocky AI",
  },
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
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'))}`,
          }}
        />

        {/* PWA enhancements */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />

        {/* iOS Splash Screens */}
        <link rel="apple-touch-startup-image" media="(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3)" href="/splash/iPhone_16_Pro_Max.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3)" href="/splash/iPhone_16_Pro.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" href="/splash/iPhone_16.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" href="/splash/iPhone_16_Plus.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" href="/splash/iPhone_14.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)" href="/splash/iPhone_14_Plus.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" href="/splash/iPhone_SE.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 360px) and (device-height: 780px) and (-webkit-device-pixel-ratio: 3)" href="/splash/iPhone_13_mini.png" />

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
                "Deep Research with Stocky AI dual-agent system",
                "Agent Debate — Stocky AI analyses from multiple perspectives then synthesises",
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
        <AnalyticsInit />
      </body>
    </html>
  );
}
