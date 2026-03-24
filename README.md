# Stocky AI — Personal AI Trading Assistant

Stocky is CK's (Charandeep Kapoor's) personal AI trading system for Indian markets. Ask it to analyse stocks, execute trades, track your portfolio, scan for opportunities, or explain what's happening in the market — all in plain English. Deep Research mode activates a **6-Agent Stocky Council** that debates and synthesises research from multiple perspectives.

**Live:** [stockyai.xyz](https://stockyai.xyz) · [llm.stockyai.xyz](https://llm.stockyai.xyz) · [terminal.stockyai.xyz](https://terminal.stockyai.xyz) · [charandeepkapoor.com](https://charandeepkapoor.com)

## Apps in This Monorepo

| Directory | What it is | Stack | Deployed on |
|-----------|-----------|-------|-------------|
| `stocky-ai/` | Telegram bot | Python | Railway (service: `worker`) |
| `stocky-web/backend/` | REST API | FastAPI + Python | Railway (service: `stocky-web-backend`) |
| `stocky-web/frontend/` | Chat web UI | Next.js 16 + React 19 | Vercel (project: `stocky-ai`) |
| `stocky-landing/` | Marketing site | Next.js 16 | Vercel (project: `stocky-landing`) |

> **Important:** `stocky-landing/` is also its own separate GitHub repo (`SirCharan/stocky-landing`). See `CLAUDE.md` for the required push + redeploy steps whenever landing page files change.

---

## What Stocky Can Do

### Core Trading
- **Live quotes** — price, OHLC, volume for any NSE/BSE stock via Zerodha Kite
- **Portfolio** — positions, holdings, orders, margins, day P&L
- **Trading** — natural language orders with 2-phase confirmation: `"buy 10 TCS at 3500"` → confirm → execute
- **Stop loss** — place SL orders directly
- **Price alerts** — notify when a stock crosses a level

### Analysis & Research
- **Stock analysis** — technical (RSI, MACD, SMA, momentum) + fundamental (P/E, ROE, D/E) + news sentiment, scored 0-20 per category
- **Deep Research (6-Agent Council)** — 6 specialised AI agents (Technical Strategist, Fundamental Analyst, Market Pulse, Risk Guardian, Macro Economist, Chief Synthesis Officer) debate in 3 rounds with 9 research steps, producing structured reports with confidence scores, bull/bear cases, trade ideas, and risk assessments
- **Stock comparison** — side-by-side fundamental & technical comparison with winner detection
- **Sector rotation (RRG)** — relative strength analysis across NSE sectors
- **Options analytics** — live PCR, max pain, OI analysis, IV skew, strategy signals via Dhan API

### Market Intelligence
- **Market overview** — NIFTY, BANKNIFTY, top gainers/losers, market breadth, VIX, AI mood summary
- **News** — aggregated from 33+ RSS feeds + GNews API with AI summaries and sentiment scoring
- **Market scanning** — 6 scan types across Nifty 100: volume pump, breakout, 52W high/low, gap up/down, momentum
- **IPO tracker** — upcoming and recently listed IPOs with gain badges
- **Macro dashboard** — forex, commodities, bonds, global indices, crypto, RBI rates
- **FII/DII flows** — NSE cash flows, F&O participant OI, NSDL FPI data
- **Sectors** — sector-wise performance across 1D, 1W, 1M timeframes
- **Earnings calendar** — upcoming earnings dates and EPS surprise history
- **Dividends** — history, yields, and sustainability scores
- **Valuation** — market PE/PB and most/least expensive Nifty stocks

### Smart Features
- **PWA** — installable progressive web app with terminal-style boot screen
- **Command palette** — Cmd/K quick actions
- **Feedback system** — thumbs up/down with tags, persisted to DB
- **Regenerate menu** — regenerate same, deeper analysis, or full council debate
- **Stop generation** — abort any in-flight request with AbortController
- **Export PDF** — export any card as PDF
- **Watchlist** — save/remove symbols with API persistence
- **Mobile-first** — dedicated mobile header, bottom nav, safe-area support

---

## Quick Start (Local Development)

### Web Backend
```bash
cd stocky-web/backend
pip install -r requirements.txt
cp .env.example .env   # fill in your credentials
uvicorn app.main:app --reload --port 8000
```

### Web Frontend
```bash
cd stocky-web/frontend
npm install
# Create .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

### Telegram Bot
```bash
cd stocky-ai
pip install -r requirements.txt
cp .env.example .env
python -m bot.main
```

---

## Environment Variables

### stocky-web/backend (FastAPI)
```
# Zerodha Kite
KITE_API_KEY=
KITE_API_SECRET=
KITE_USER_ID=
KITE_PASSWORD=
KITE_TOTP_SECRET=

# Groq (6 keys for parallel Council agents)
GROQ_API_KEY=             # → Technical Strategist (TS)
GROQ_API_KEY_2=           # → Fundamental Analyst (FA)
GROQ_API_KEY_3=           # → Market Pulse Agent (MP)
GROQ_API_KEY_4=           # → Risk Guardian (RG)
GROQ_API_KEY_5=           # → Macro Economist (ME)
GROQ_API_KEY_6=           # → Chief Synthesis Officer (CSO)

# Models
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_TRIAD_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
GROQ_CONV_MODEL=openai/gpt-oss-120b

# External APIs
GNEWS_API_KEY=            # GNews API (free tier, 100 req/day)
DHAN_ACCESS_TOKEN=        # Dhan HQ (option chain, live prices)
OPENROUTER_API_KEY=       # OpenRouter fallback

# App
WEB_SECRET_KEY=
DB_PATH=stocky_web.db
ALLOWED_ORIGINS=https://stocky-ai.vercel.app,http://localhost:3000
```

### stocky-web/frontend (Vercel)
```
NEXT_PUBLIC_API_URL=https://stocky-web-backend-production.up.railway.app
```

---

## Deployment

### Railway — project: `fearless-determination`
- Web backend auto-deploys from `SirCharan/stocky-ai-tg-bot` branch
- Telegram bot on `worker` service

### Vercel
| Project | Repo | Root Directory | Domain |
|---------|------|----------------|--------|
| `stocky-ai` | `SirCharan/twitter` | `stocky-web/frontend` | `llm.stockyai.xyz` |
| `stocky-landing` | `SirCharan/stocky-landing` | root | `stockyai.xyz` |

Deploy frontend manually: `npx vercel --prod` from repo root.

---

## Documentation

| File | Contents |
|------|----------|
| `README.md` | This file — project overview |
| `architecture.md` | Visual Mermaid diagrams of all systems |
| `ai.md` | Deep Research & 6-Agent Council architecture |
| `llm.md` | LLM models, routing, prompts, analysis pipeline |
| `system-flow.md` | End-to-end Mermaid flowcharts |
| `summary.md` | Full technical reference |
| `agents.txt` | AI agent navigation guide |
| `CLAUDE.md` | Landing page deploy instructions |

---

## Repository Structure

```
osaka/
├── stocky-ai/                Telegram bot
│   ├── bot/
│   │   ├── main.py           Entry point
│   │   ├── ai_client.py      Groq integration
│   │   ├── kite_auth.py      TOTP auto-login
│   │   ├── kite_client.py    Kite API wrapper
│   │   ├── database.py       SQLite async ops
│   │   └── handlers/         One file per command group
│   └── requirements.txt
│
├── stocky-web/
│   ├── backend/              FastAPI REST API
│   │   ├── app/
│   │   │   ├── main.py       Routes + CORS + lifespan
│   │   │   ├── ai_client.py  Groq clients (6 keys for Council)
│   │   │   ├── config.py     Environment config
│   │   │   ├── database.py   SQLite (conversations, watchlist, feedback)
│   │   │   ├── handlers/     29 handler modules
│   │   │   │   ├── chat.py, analyse.py, trading.py, overview.py
│   │   │   │   ├── news.py, scan.py, chart.py, compare.py
│   │   │   │   ├── council.py        ← 6-Agent Council handler
│   │   │   │   ├── agent_debate.py   ← 3-Agent Triad (legacy)
│   │   │   │   ├── crew_research.py  ← 7-Agent Crew (legacy)
│   │   │   │   ├── options.py, fii_dii.py, sectors.py
│   │   │   │   ├── earnings.py, dividends.py, valuation.py
│   │   │   │   ├── ipo.py, macro.py, rrg.py, announcements.py
│   │   │   │   └── watchlist.py, export_pdf.py, share.py
│   │   │   ├── services/
│   │   │   │   └── data_enricher.py  ← Unified data layer
│   │   │   └── prompts/
│   │   │       ├── __init__.py       ← Base prompts (system, intent, crew)
│   │   │       ├── orchestrator.py   ← Chat orchestrator prompt
│   │   │       └── council.py        ← 6-Agent Council prompts
│   │   └── requirements.txt
│   │
│   └── frontend/             Next.js 16 chat UI
│       └── src/
│           ├── app/chat/
│           │   ├── ChatShell.tsx      ← Root layout (PWA, nav, sidebar)
│           │   ├── components/        ← 49 components
│           │   │   ├── ChatWindow.tsx, ChatInput.tsx, MessageBubble.tsx
│           │   │   ├── CouncilProgressCard.tsx  ← Council live progress
│           │   │   ├── CouncilResultCard.tsx    ← Council final report
│           │   │   ├── MessageActions.tsx       ← Copy, regen, feedback
│           │   │   ├── FeedbackTagsModal.tsx    ← Thumbs-down tags
│           │   │   ├── Analysis/News/Overview/Scan/Chart/Compare Cards
│           │   │   ├── Options/FiiDii/Sectors/Earnings/Dividends Cards
│           │   │   ├── MobileHeader.tsx, MobileBottomNav.tsx
│           │   │   ├── TerminalLoadingScreen.tsx, CommandPalette.tsx
│           │   │   └── PWAProvider.tsx, PWAInstallDialog.tsx
│           │   └── hooks/
│           │       ├── useChat.ts          ← All streaming + state
│           │       ├── useConversations.ts
│           │       ├── useMediaQuery.ts
│           │       └── usePWAInstall.ts
│           └── lib/
│               ├── types.ts    ← 34 message types + Council interfaces
│               ├── api.ts      ← Typed API client (30+ functions)
│               ├── cn.ts       ← Tailwind class utility
│               └── analytics.ts
│
├── stocky-landing/           Marketing site
├── architecture.md           Visual Mermaid diagrams
├── ai.md                     Deep Research & Council architecture
├── llm.md                    LLM models & routing
├── system-flow.md            End-to-end Mermaid flowcharts
├── summary.md                Full technical reference
└── CLAUDE.md                 Landing page deploy rules
```

---

## Links

- **Landing Page:** [stockyai.xyz](https://stockyai.xyz)
- **Web App:** [llm.stockyai.xyz](https://llm.stockyai.xyz)
- **Terminal:** [terminal.stockyai.xyz](https://terminal.stockyai.xyz)
- **Creator:** [charandeepkapoor.com](https://charandeepkapoor.com)

Built by [Charandeep Kapoor](https://charandeepkapoor.com).
