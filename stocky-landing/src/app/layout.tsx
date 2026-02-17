import type { Metadata } from "next";
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
  title: "Stocky — Precision. Discipline. Edge.",
  description:
    "An AI trading engine built for the few who think in payoffs, not predictions.",
  metadataBase: new URL("https://stockyai.xyz"),
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Stocky — Precision. Discipline. Edge.",
    description:
      "An AI trading engine built for the few who think in payoffs, not predictions.",
    url: "https://stockyai.xyz",
    siteName: "Stocky",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Stocky — Precision. Discipline. Edge.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Stocky — Precision. Discipline. Edge.",
    description:
      "An AI trading engine built for the few who think in payoffs, not predictions.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${playfair.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
