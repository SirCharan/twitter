import type { Metadata } from "next";
import Script from "next/script";
import { Geist } from "next/font/google";
import { Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Stocky AI — AI Trading Assistant for Indian Markets",
  description:
    "AI-powered stock analysis and trading assistant for Zerodha. Real-time market intelligence, portfolio automation, and trade execution for NSE & BSE.",
  metadataBase: new URL("https://stockyai.xyz"),
  alternates: {
    canonical: "https://stockyai.xyz",
  },
  keywords: [
    "AI trading assistant India",
    "AI stock analysis tool",
    "Zerodha AI assistant",
    "AI trading bot India",
    "NSE stock analysis",
    "BSE trading AI",
    "portfolio automation India",
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
    title: "Stocky AI — AI Trading Assistant for Indian Markets",
    description:
      "AI-powered stock analysis and trading for Zerodha. Real-time market intelligence, portfolio automation, and 150%+ verified returns.",
    url: "https://stockyai.xyz",
    siteName: "Stocky AI",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Stocky AI — AI Trading Assistant for Indian Markets with Zerodha Integration",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Stocky AI — AI Trading Assistant for Indian Markets",
    description:
      "AI-powered stock analysis and trading for Zerodha. 150%+ returns, 3.29 Sharpe, 72.9% win rate.",
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
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "SoftwareApplication",
                  "name": "Stocky AI",
                  "applicationCategory": "FinanceApplication",
                  "operatingSystem": "Web",
                  "description":
                    "AI-powered trading assistant for Indian stock markets. Integrates with Zerodha for real-time analysis, portfolio automation, and trade execution on NSE and BSE.",
                  "url": "https://stockyai.xyz",
                  "author": {
                    "@type": "Person",
                    "name": "Charandeep Kapoor",
                    "url": "https://charandeepkapoor.com",
                    "alumniOf": {
                      "@type": "CollegeOrUniversity",
                      "name": "Indian Institute of Technology Kanpur",
                    },
                  },
                  "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "INR",
                  },
                  "featureList": [
                    "AI stock analysis for NSE and BSE (fundamental, technical, news sentiment)",
                    "Zerodha Kite integration for trade execution with 2-phase confirmation",
                    "Real-time market news from 25+ RSS sources with category filtering",
                    "Deep Research with dual-agent AI system (Quick Agent + Deep Agent)",
                    "Agent Debate — two AI agents analyse independently then synthesise",
                    "Market scanning — 6 types across Nifty 100 with sparklines",
                    "Stock comparison with winner detection",
                    "TradingView live chart embeds and custom analysis charts",
                    "Sector rotation analysis (Relative Rotation Graph)",
                    "IPO tracking with gain badges",
                    "Macro dashboard — forex, bonds, commodities (USD & INR), crypto (BTC, ETH)",
                    "Portfolio, holdings, and margin overview via Kite API",
                  ],
                },
                {
                  "@type": "WebSite",
                  "name": "Stocky AI",
                  "url": "https://stockyai.xyz",
                  "description":
                    "AI trading assistant for Indian markets with Zerodha integration",
                },
                {
                  "@type": "Organization",
                  "name": "Stocky AI",
                  "url": "https://stockyai.xyz",
                  "logo": "https://stockyai.xyz/logo-mark.png",
                  "sameAs": [
                    "https://charandeepkapoor.com",
                    "https://llm.stockyai.xyz",
                    "https://terminal.stockyai.xyz",
                  ],
                  "founder": {
                    "@type": "Person",
                    "name": "Charandeep Kapoor",
                    "url": "https://charandeepkapoor.com",
                  },
                },
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
      <body
        className={`${geistSans.variable} ${playfair.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
