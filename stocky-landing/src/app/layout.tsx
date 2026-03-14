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
    "AI-powered stock analysis and trading assistant for Zerodha. Real-time market intelligence, portfolio automation, and trade execution for NSE & BSE. 150%+ returns since June 2025.",
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
                    "AI stock analysis for NSE and BSE",
                    "Zerodha Kite integration for trade execution",
                    "Real-time market news aggregation with AI summaries",
                    "Technical and fundamental analysis",
                    "Portfolio automation and rebalancing",
                    "Sector rotation analysis (RRG)",
                    "IPO tracking and macro dashboard",
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
          src="https://www.googletagmanager.com/gtag/js?id=G-2NNX6VPP2E"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-2NNX6VPP2E');
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
