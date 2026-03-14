# Stocky AI — Personal AI Trading Assistant

Stocky is CK's (Charandeep Kapoor's) personal AI trading system for Indian markets. Ask it to analyse stocks, execute trades, track your portfolio, scan for opportunities, or explain what's happening in the market — all in plain English.

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
- **Max loss** — enforce daily/overall loss limits
- **Price alerts** — notify when a stock crosses a level (checked every 15s)

### Analysis & Research
- **Stock analysis** — technical (RSI, MACD, SMA, momentum) + fundamental (P/E, ROE, D/E) + news sentiment, scored 0-20 per category
- **Deep Research** — dual-agent system: Quick Agent (Groq) + Deep Agent (Gemini) with live thinking, final synthesis
- **Stock comparison** — side-by-side fundamental & technical comparison with winner detection and best-value highlighting
- **Sector rotation (RRG)** — relative strength analysis across 8 NSE sectors

### Market Intelligence
- **Market overview** — NIFTY, BANKNIFTY, top gainers/losers, market breadth, VIX, AI mood summary
- **News** — aggregated from 25+ Indian financial RSS feeds with AI summaries, category filtering (Indian, Global, Commodities, Energy)
- **Market scanning** — 6 scan types across Nifty 100: volume pump, breakout, 52W high/low, gap up, gap down, momentum — with sparklines
- **IPO tracker** — upcoming and recently listed IPOs with gain badges
- **Macro dashboard** — forex, commodities (gold/crude in USD & INR), bonds (India 10Y, US 10Y), global indices, crypto (BTC, ETH), RBI repo rate

### Charting & Tools
- **Charts** — TradingView live embeds + custom dark-theme analysis charts (matplotlib)
- **Summarise** — paste any text and get an AI summary
- **Basic Q&A** — greetings and educational questions answered directly

---

## Quick Start (Local Development)

### Telegram Bot
```bash
cd stocky-ai
pip install -r requirements.txt
cp .env.example .env   # fill in your credentials
python -m bot.main
```

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

---

## Environment Variables

### stocky-ai (Telegram Bot)
```
TELEGRAM_BOT_TOKEN=       # @BotFather token
ALLOWED_USER_IDS=         # comma-separated Telegram user IDs
KITE_API_KEY=
KITE_API_SECRET=
KITE_USER_ID=             # Zerodha user ID (e.g. AB1234)
KITE_PASSWORD=
KITE_TOTP_SECRET=         # base32 TOTP secret from Kite 2FA setup
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
DB_PATH=stocky.db
ALERT_CHECK_INTERVAL_SECONDS=15
DEFAULT_MAX_LOSS_DAILY=0
DEFAULT_MAX_LOSS_OVERALL=0
```

### stocky-web/backend (FastAPI)
```
KITE_API_KEY=             # same Kite credentials
KITE_API_SECRET=
KITE_USER_ID=
KITE_PASSWORD=
KITE_TOTP_SECRET=
GROQ_API_KEY=             # same Groq key
GROQ_MODEL=llama-3.3-70b-versatile
WEB_SECRET_KEY=           # random string for JWT signing (keep secret)
ACCESS_TOKEN_EXPIRE_DAYS=30
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

```bash
# Deploy Telegram bot
cd stocky-ai && railway up --service worker

# Deploy web backend
cd stocky-web/backend && railway up --service stocky-web-backend
```

### Vercel

| Project | Repo | Root Directory |
|---------|------|----------------|
| `stocky-ai` | `SirCharan/twitter` | `stocky-web/frontend` |
| `stocky-landing` | `SirCharan/stocky-landing` | *(none — root of that repo)* |

### Landing Page (special case)
`stocky-landing/` changes must be pushed to **both** this monorepo and `SirCharan/stocky-landing`. See `CLAUDE.md` for exact commands. Never skip the separate push.

---

## Repository Structure

```
osaka/
├── stocky-ai/              Telegram bot
│   ├── bot/
│   │   ├── main.py         Entry point, handler registration
│   │   ├── ai_client.py    Groq integration (chat, intent parsing, verdict)
│   │   ├── kite_auth.py    TOTP auto-login
│   │   ├── kite_client.py  Kite API wrapper
│   │   ├── database.py     SQLite async ops
│   │   ├── scheduler.py    APScheduler (alerts, auto-login)
│   │   └── handlers/       One file per command group
│   └── requirements.txt
│
├── stocky-web/
│   ├── backend/            FastAPI REST API
│   │   ├── app/
│   │   │   ├── main.py     Routes + CORS + lifespan
│   │   │   ├── ai_client.py
│   │   │   ├── handlers/   chat.py, analyse.py, trading.py, overview.py,
│   │   │   │               news.py, scan.py, chart.py, compare.py,
│   │   │   │               ipo.py, macro.py, rrg.py, agent_debate.py
│   │   │   └── ...
│   │   └── requirements.txt
│   └── frontend/           Next.js 16 chat UI
│       └── src/
│           ├── app/chat/components/   AnalysisCard, NewsCard, ScanCard,
│           │                          ChartCard, CompareCard, IpoCard,
│           │                          MacroCard, RrgCard, AgentDebateCard,
│           │                          DebateProgressCard, MarkdownRich, ...
│           ├── app/chat/hooks/        useChat
│           └── lib/                   types.ts, api.ts
│
├── stocky-landing/         Marketing site (also: SirCharan/stocky-landing)
│   └── src/app/
│       └── page.tsx        Main landing page
│
├── CLAUDE.md               AI agent instructions (landing page deploy rule)
├── README.md               This file
├── architecture.md         Visual system diagrams
├── llm.md                  LLM/AI model architecture
└── summary.md              Full technical reference
```

---

## Links

- **Landing Page:** [stockyai.xyz](https://stockyai.xyz)
- **Web App:** [llm.stockyai.xyz](https://llm.stockyai.xyz)
- **Terminal:** [terminal.stockyai.xyz](https://terminal.stockyai.xyz)
- **Creator:** [charandeepkapoor.com](https://charandeepkapoor.com)

Built by [Charandeep Kapoor](https://charandeepkapoor.com).
