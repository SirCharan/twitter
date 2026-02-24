# Stocky AI — Complete Technical Reference

Personal reference for CK. Everything you need to understand, debug, or extend any part of the system.

---

## 1. Architecture Overview

Four apps. Two databases. One Kite session at a time.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         STOCKY ECOSYSTEM                           │
│                                                                     │
│  Telegram                  Browser                                  │
│     │                         │                                     │
│     ▼                         ▼                                     │
│  stocky-ai/             stocky-web/frontend/      stocky-landing/  │
│  Python TG Bot          Next.js 15 Chat UI        Marketing Site   │
│  Railway: worker        Vercel: stocky-ai          Vercel: landing │
│     │                         │                                     │
│     │               stocky-web/backend/                            │
│     │               FastAPI REST API                               │
│     │               Railway: stocky-web-backend                    │
│     │                         │                                     │
│     └─────────────────────────┤                                     │
│                               │                                     │
│                    ┌──────────┼──────────┐                         │
│                    ▼          ▼          ▼                         │
│                 Groq API   Kite API   yfinance / RSS               │
│               (llama 70B  (Zerodha)  (market data)                │
│                + 8B)                                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Telegram Bot (stocky-ai/)

### Startup Sequence (`bot/main.py`)

1. `ApplicationBuilder` creates Telegram app with token
2. `post_init()` runs:
   - `await database.init_db()` — creates tables if not exists
   - `KiteClient()` initialized globally
   - `auto_login()` attempted (TOTP)
   - Scheduler started (APScheduler)
3. All handlers registered (50+ commands)
4. `application.run_polling()` starts the event loop

### Handler Registration Order (matters — last handler catches all)

```python
# Exact commands: /buy, /sell, /price, etc.
app.add_handler(CommandHandler("buy", trading.buy_command))
...

# Callback queries (inline button clicks)
app.add_handler(CallbackQueryHandler(trading.handle_confirm, pattern="^(confirm|cancel)_"))
app.add_handler(CallbackQueryHandler(nlp.fallback_callback, pattern="^fallback_"))

# Natural language — catches ALL non-command messages
app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, nlp.handle_text))
```

### NLP Pipeline (`bot/handlers/nlp.py`)

```
handle_text(update, context)
    │
    ├── text = update.message.text
    ├── name = update.effective_user.first_name
    │
    ├── _parse_natural(text)   ← STEP 1: Regex matching
    │     Returns (intent, args) or None
    │     Handles: help, whoami, status, login, usage, portfolio,
    │              positions, holdings, orders, margins, buy, sell,
    │              sl, alert, alerts, delalert, exitrules, maxloss,
    │              price, overview, news, analyse
    │     ↓ matched → DISPATCH[intent](update, context)
    │     ↓ None ↓
    │
    ├── _CHAT_RE.search(text) AND NOT _TRADING_TERMS.search(text)
    │     _CHAT_RE: greetings, "what is X", "explain Y", "how does Z"
    │     _TRADING_TERMS: buy/sell/nifty/portfolio/price/etc.
    │     ↓ match → chat_basic(text) → reply  [llama-3.1-8b-instant]
    │     ↓ no match ↓
    │
    └── _ai_fallback(text)    ← STEP 3: Full AI
          → interpret_intent(text) [llama-3.3-70b-versatile]
          → {intent, args, reply}
          ↓ intent == "chat" → reply with reply field
          ↓ intent known → DISPATCH[intent](update, context)
          ↓ error → _offer_fallback_choices() (inline keyboard)
```

### Scheduler Tasks (`bot/scheduler.py`)

| Job | Schedule | Function |
|-----|----------|---------|
| Alert check | Every 15s | Check all active alerts vs Kite LTP |
| Auto-login | Daily 7:40 AM IST | `kite_auth.auto_login()` |
| Max loss check | Every 60s | Compare day P&L vs limits |

### Auth (`bot/auth_check.py`)

`@authorized` decorator checks `update.effective_user.id` against `ALLOWED_USER_IDS` env var. Silently ignores unauthorized messages.

---

## 3. Web Backend (stocky-web/backend/)

### FastAPI Routes (`app/main.py`)

```
GET  /api/health                 → {"status": "ok"}   [no auth]
POST /api/auth/register          → {access_token}      [no auth, first-run only]
POST /api/auth/login             → {access_token}      [no auth]
GET  /api/auth/me                → {username}          [JWT required]
POST /api/chat                   → ChatResponse        [JWT required]
POST /api/trade/confirm          → ChatResponse        [JWT required]
GET  /api/conversations          → [ConversationSummary] [JWT required]
GET  /api/conversations/{id}     → [ChatMessage]       [JWT required]
DELETE /api/conversations/{id}   → {deleted: true}     [JWT required]
GET  /api/kite/status            → {connected, user}   [JWT required]
POST /api/kite/login             → {message}           [JWT required]
GET  /api/alerts                 → [Alert]             [JWT required]
POST /api/alerts                 → Alert               [JWT required]
DELETE /api/alerts/{id}          → {deleted: true}     [JWT required]
```

### Chat Dispatch (`app/handlers/chat.py handle_chat()`)

```
handle_chat(message, username, conversation_id)
    │
    ├── Save user message to conversations table
    ├── Load last 10 messages for context
    │
    ├── _parse_natural(text)   ← Regex (same patterns as TG bot)
    │     → dispatch to handler directly
    │
    └── interpret_intent(text, history=last_10)
          → {intent, args, reply}
          → dispatch:
            "analyse"    → handlers/analyse.get_analysis(symbol)
            "price"      → handlers/market.get_price(symbol)
            "portfolio"  → handlers/portfolio.get_portfolio()
            "positions"  → handlers/portfolio.get_positions()
            "holdings"   → handlers/portfolio.get_holdings()
            "orders"     → handlers/portfolio.get_orders()
            "margins"    → handlers/portfolio.get_margins()
            "buy"/"sell" → handlers/trading.initiate_trade(...)
            "news"       → handlers/news.get_news(symbol?)
            "overview"   → handlers/overview.get_overview()
            "alerts"     → handlers/alerts.get_alerts()
            "usage"      → db query → {calls, tokens}
            "cost"       → db query → calculate → "$X.XX"
            "chat"       → {type: "text", content: reply}
    │
    └── Save assistant response to conversations table
        Return ChatResponse
```

### Trade Confirmation Flow

```
User: "buy 10 TCS at 3500"
    │
    ▼
initiate_trade(symbol="TCS", qty=10, price=3500, txn_type="BUY")
    → Create pending_actions row:
      {action_id: uuid, action_type: "trade", action_data: {...}, status: "pending"}
    → Return {type: "trade_confirm", action_id: "...", data: {symbol, qty, price, ...}}
    │
    ▼  (Frontend renders TradeConfirmation card)
    │
User clicks Confirm
    │
    ▼
POST /api/trade/confirm  {action_id: "...", action: "confirm"}
    → confirm_trade(action_id, username)
    → Fetch pending_actions row
    → kite_client.place_order(...)
    → Update pending_actions status → "confirmed"
    → Log to trade_history
    → Return {type: "order_result", content: "Order placed. ID: 123456"}
```

Pending actions expire after 5 minutes (checked in confirm_trade).

### JWT Auth (`app/auth.py`)

- Algorithm: HS256
- Expiry: 30 days (configurable via `ACCESS_TOKEN_EXPIRE_DAYS`)
- Secret: `WEB_SECRET_KEY` env var
- FastAPI dependency: `get_current_user(credentials: HTTPAuthorizationCredentials)` → returns username
- Password storage: bcrypt (via `bcrypt.hashpw`)

---

## 4. Web Frontend (stocky-web/frontend/)

### Component Tree

```
app/chat/page.tsx                Server component, auth redirect
    └── ChatShell.tsx            "use client" — main layout
            ├── Sidebar.tsx      Conversation list, new chat button
            └── ChatWindow.tsx
                    ├── MessageList           Scrollable, auto-scroll
                    │     └── MessageBubble   Renders per message type:
                    │           ├── AnalysisCard.tsx    type: "analysis"
                    │           ├── PriceCard.tsx       type: "price"
                    │           ├── PortfolioCard.tsx   type: "portfolio"
                    │           ├── NewsCard.tsx        type: "news"
                    │           ├── OverviewCard.tsx    type: "overview"
                    │           ├── TradeConfirmation   type: "trade_confirm"
                    │           ├── DataTable.tsx       positions/holdings/orders
                    │           └── plain text          type: "text" / "error"
                    ├── TypingIndicator       "Stocky is thinking..."
                    └── ChatInput.tsx         Textarea + send button
```

### Data Flow

```
User types message → ChatInput
    │
    ▼
useChat.sendMessage(text)
    │
    ├── Optimistically add user message to state
    ├── Set isLoading = true
    ├── api.sendMessage(text, conversationId)
    │     → POST /api/chat with JWT
    │     → Returns ChatResponse {type, content, data, action_id, conversation_id}
    │
    ├── Append assistant message to state
    ├── Set isLoading = false
    └── MessageBubble reads message.type → renders appropriate card
```

### AnalysisCard Expand/Collapse

State:
- `showAllNews` — false by default, shows 3 articles; expanded shows all + "Stocky's Take" AI analysis
- `showDetailedResults` — false by default, shows plain table; expanded adds QoQ/YoY badges per metric

### Design Tokens (globals.css)

```css
--background: #0A0A0A
--foreground: #F5F0EB
--accent: #C9A96E      (gold)
--accent-dim: #8B7340
--muted: #6B6B6B
--card-bg: #141414
--card-border: #1F1F1F
--surface: #111111
--positive: #4CAF50    (green)
--negative: #F44336    (red)
```

---

## 5. Landing Page (stocky-landing/)

- Separate GitHub repo: `SirCharan/stocky-landing`
- Vercel project: `stocky-landing` (no root directory setting needed)
- Domain: `stockyai.xyz`

### Key Sections (page.tsx)

1. Hero — "Your trading mind, always on."
2. Features grid — 3 cards (portfolio, analysis, alerts)
3. On the Horizon — upcoming features
4. **Convergence section** — hub-and-spoke diagram: 7 tools → Stocky
   - Nodes: Inshorts, Tijori, LiveMint, Kite, Sensibull, TradingView, Moneycontrol
   - Logos via Google Favicon service: `google.com/s2/favicons?domain=X&sz=64`
   - Animated dashed lines (CSS `flow-in` keyframe, SVG overlay)
   - Heading: "Seven tools. One conversation."
5. Bottom CTA — waitlist signup → `/api/waitlist/route.ts`

### Deploy after any change

```bash
# 1. Clone landing repo
git clone https://github.com/SirCharan/stocky-landing.git /tmp/stocky-landing

# 2. Copy changed files
cp stocky-landing/src/app/page.tsx /tmp/stocky-landing/src/app/

# 3. Push
cd /tmp/stocky-landing && git add -A && git commit -m "..." && git push

# 4. Trigger Vercel redeploy
gh api -X POST repos/SirCharan/stocky-landing/dispatches -f event_type=redeploy
```

---

## 6. Shared Systems

### Kite Connect (Both Apps)

```
kite_auth.py (both apps, identical logic)
    │
    auto_login()
        │
        ├── requests.Session() → POST kite login form
        ├── requests.Session() → POST TOTP (pyotp.TOTP(KITE_TOTP_SECRET).now())
        ├── Extract request_token from redirect URL
        ├── kiteconnect.KiteConnect.generate_session(request_token)
        └── Save access_token to kite_session table (row id=1)

get_authenticated_kite()
    → Read access_token from DB
    → kiteconnect.KiteConnect(api_key=..., access_token=...)
    → Return configured instance
```

**Session caveat**: Kite allows one active session per API key. Both apps share the same credentials. Whichever called `auto_login()` most recently holds the valid token. In practice: TG bot auto-logins at 7:40 AM daily, so it usually holds the token during market hours. Web backend re-logins on startup and when user hits `/api/kite/login`.

### Groq Client Initialization

Both `ai_client.py` files use lazy singleton:
```python
_client: AsyncGroq | None = None
def _get_client():
    global _client
    if not GROQ_API_KEY: return None
    if _client is None: _client = AsyncGroq(api_key=GROQ_API_KEY)
    return _client
```

---

## 7. Data Sources

| Source | Library | Used for | Latency |
|--------|---------|---------|---------|
| Zerodha Kite API | `kiteconnect` | Portfolio, positions, holdings, orders, margins, live price, trade execution | ~100–200ms |
| yfinance | `yfinance` | Technical analysis (1y OHLCV), fundamental data (ticker.info), quarterly income stmt, major holders | ~0.5–3s |
| nsetools | `nsetools` | Market overview (NIFTY indices), gainers/losers | ~0.5–2s |
| RSS feeds | `feedparser` | News articles (10 feeds, parallel) | ~2–5s |
| Groq API | `groq` | NLP intent parsing, chat, analysis verdict, news summary | ~0.3–3s |

---

## 8. Scoring System

Analysis overall score = technical + fundamental + news (max 30).

### Technical Score (0–10)
- RSI: 0 if RSI<30 (oversold), 10 if RSI>70 (overbought), linear in between
- MACD: scaled by MACD vs signal divergence relative to historical max
- SMA: Golden Cross → ~8-10, Death Cross → ~0-3, single SMA → 7 or 3
- Momentum: weighted 1D(10%), 1W(30%), 1M(40%), 3M(20%) price changes
- Final: average of 4 scores

### Fundamental Score (0–10)
- P/E: 10 if ≤15, decreases as P/E increases above 15
- ROE: 0 if <5%, linear to 10 at ~20%
- D/E: 10 if <0.5, decreases as debt ratio increases
- Earnings growth: scaled 0-10 based on YoY growth%
- Final: average of 4 scores

### News Score (0–10)
- Base: 5.0 (neutral)
- Each relevant article: sentiment = (title_pos×3 - title_neg×3 + body_pos - body_neg) / (total + 1)
- Average sentiment across all articles
- Score = 5 + (avg_sentiment × 5)

### Overall Interpretation
- 24–30: All aligned. Strong buy candidate.
- 20–23: Mostly positive. Good risk-reward.
- 15–19: Mixed. No clear edge.
- 10–14: More negatives than positives. Caution.
- 0–9: Everything broken. Avoid.

---

## 9. Key Design Decisions

**Why SQLite, not PostgreSQL?**
Simplicity + Railway ephemeral storage. For the data volumes (one user, hundreds of rows), SQLite is more than sufficient. Upgrade path: swap `aiosqlite` for `asyncpg` + update connection strings.

**Why two separate databases?**
TG bot and web backend run as separate Railway services. Shared filesystem not guaranteed. SQLite file-per-service is the safest approach on Railway.

**Why Groq, not OpenAI?**
Speed. Groq's inference is 5-10× faster for Llama models. For a trading assistant where response latency matters, this is the right trade-off. Brand positioning uses Claude Opus 4.6 (displayed to user) while the actual inference runs on Groq Llama.

**Why ×101 token multiplier?**
Display branding. Stocky is positioned as a "fine-tuned Claude Opus 4.6 model." The multiplier makes the displayed numbers match what Claude Opus usage would look like at comparable usage levels.

**Why `max_tokens=128` for analyse_verdict?**
Verdicts must be punchy — 1-2 sentences max. Longer responses get cut anyway by the UI. Shorter token limit also reduces latency for this final step.

**Why title keywords ×3 weight for news sentiment?**
"Reduce Wipro" in the title (neg×3=3) must outweigh "bullish" and "buy" appearing in the article body (body pos=2). Without this weighting, broker sell recommendations were being scored as bullish.

---

## 10. Complete Environment Variables Reference

### stocky-ai (TG Bot)
| Variable | Example | Required |
|----------|---------|---------|
| `TELEGRAM_BOT_TOKEN` | `7123456789:AAF...` | Yes |
| `ALLOWED_USER_IDS` | `123456789` | Yes |
| `KITE_API_KEY` | `xxxxxxxx` | Yes |
| `KITE_API_SECRET` | `xxxxxxxxxxxxxxxx` | Yes |
| `KITE_USER_ID` | `AB1234` | Yes |
| `KITE_PASSWORD` | `yourpassword` | Yes |
| `KITE_TOTP_SECRET` | `BASE32SECRET` | Yes |
| `GROQ_API_KEY` | `gsk_...` | Yes |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | No (has default) |
| `DB_PATH` | `stocky.db` | No (has default) |
| `ALERT_CHECK_INTERVAL_SECONDS` | `15` | No (has default) |

### stocky-web/backend (FastAPI)
| Variable | Example | Required |
|----------|---------|---------|
| `KITE_API_KEY` | *(same as bot)* | Yes |
| `KITE_API_SECRET` | *(same)* | Yes |
| `KITE_USER_ID` | *(same)* | Yes |
| `KITE_PASSWORD` | *(same)* | Yes |
| `KITE_TOTP_SECRET` | *(same)* | Yes |
| `GROQ_API_KEY` | *(same)* | Yes |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | No |
| `WEB_SECRET_KEY` | `random-secret-string` | Yes |
| `ACCESS_TOKEN_EXPIRE_DAYS` | `30` | No |
| `DB_PATH` | `stocky_web.db` | No |
| `ALLOWED_ORIGINS` | `https://stocky-ai.vercel.app` | No |

### stocky-web/frontend (Vercel)
| Variable | Example | Required |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | `https://stocky-web-backend-production.up.railway.app` | Yes |

---

## 11. Deployment Reference

### Railway Project: `fearless-determination`

| Service | Source Dir | Deploy Command |
|---------|-----------|----------------|
| `worker` (TG bot) | `stocky-ai/` | `cd stocky-ai && railway up --service worker` |
| `stocky-web-backend` | `stocky-web/backend/` | `cd stocky-web/backend && railway up --service stocky-web-backend` |

Start commands (in `railway.toml`):
- Bot: `python -m bot.main`
- Backend: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Vercel

| Project | GitHub Repo | Root Dir | Domain |
|---------|------------|---------|--------|
| `stocky-landing` | `SirCharan/stocky-landing` | *(root)* | `stockyai.xyz` |
| `stocky-ai` | `SirCharan/twitter` | `stocky-web/frontend` | `stocky-ai.vercel.app` |

### Current Production URLs
- Web App: `https://stocky-ai.vercel.app`
- API: `https://stocky-web-backend-production.up.railway.app`
- Landing: `https://stockyai.xyz`
