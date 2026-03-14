# Stocky AI — Web App

**Live:** [llm.stockyai.xyz](https://llm.stockyai.xyz)

Chat-based AI trading assistant for Indian stock markets. Real-time stock analysis, market intelligence, and Zerodha trade execution — all through natural language.

## Features

| Feature | Description |
|---------|-------------|
| **Market Overview** | Live indices, gainers/losers, breadth, VIX, AI mood summary |
| **News** | 25+ RSS feeds with AI summaries, category filtering, sentiment scoring |
| **Portfolio** | Holdings, positions, margins, day P&L via Zerodha Kite |
| **Analyse** | Fundamental + technical + news scoring (0-20 per category) |
| **Deep Research** | Dual-agent system (Quick Agent + Deep Agent) with live thinking & synthesis |
| **Scan** | 6 scan types across Nifty 100 with sparklines and volume bars |
| **Chart** | TradingView live embeds + custom analysis charts |
| **Compare** | Side-by-side stock comparison with winner detection |
| **IPO** | Upcoming and recent IPOs with gain badges |
| **Macro** | Forex, commodities (USD & INR), bonds, global indices, crypto |
| **RRG** | Sector rotation analysis across 8 NSE sectors |
| **Summarise** | Paste any text for AI summary |

## Tech Stack

- **Framework:** Next.js 16, React 19, TypeScript
- **Styling:** Tailwind CSS, CSS variables (dark theme #0A0A0A, gold accent #C9A96E)
- **Backend:** FastAPI (Python) at `stocky-web-backend-production.up.railway.app`
- **AI:** Groq (llama-3.3-70b) + Google Gemini (deep research)
- **Trading:** Zerodha Kite Connect API
- **Data:** yfinance, nsetools, 25+ RSS feeds, NSE/BSE APIs
- **Analytics:** Google Analytics (G-93SFBS9CDS)

## Development

```bash
npm install
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open [localhost:3000](http://localhost:3000).

## Deployment

Deployed on Vercel (project: `stocky-ai`). Pushes to the `SirCharan/twitter` repo trigger auto-deploys.

```bash
npx vercel --prod
```

## Links

- **Landing Page:** [stockyai.xyz](https://stockyai.xyz)
- **Web App:** [llm.stockyai.xyz](https://llm.stockyai.xyz)
- **Terminal:** [terminal.stockyai.xyz](https://terminal.stockyai.xyz)
- **Creator:** [charandeepkapoor.com](https://charandeepkapoor.com)

Built by [Charandeep Kapoor](https://charandeepkapoor.com).
