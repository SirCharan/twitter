# LLM Architecture — Stocky AI

---

## Model Provider

**Groq API** — `AsyncGroq` client. Fast inference via groq.com.

Same API key used by both the Telegram bot (`stocky-ai/`) and web backend (`stocky-web/backend/`).

---

## Models in Use

| Use Case | Model | Max Tokens | Temperature | Approx Latency |
|----------|-------|-----------|-------------|----------------|
| Trading intent parsing | `llama-3.3-70b-versatile` | 1024 | 0.1 | 1–3s |
| General chat / Q&A (web + TG) | `llama-3.3-70b-versatile` | 1024 | 0.7 | 1–3s |
| Greetings + basic Q&A (TG only) | `llama-3.1-8b-instant` | 200 | 0.7 | 0.3–0.8s |
| Stock analysis verdict | `llama-3.3-70b-versatile` | 128 | 0.7 | 0.5–1s |
| News analysis summary | `llama-3.3-70b-versatile` | 1024 | 0.7 | 1–2s |

---

## Message Routing — Telegram Bot

File: `stocky-ai/bot/handlers/nlp.py`

```
User message
    │
    ├─► _parse_natural(text)
    │       Regex NLP. Catches: buy/sell/price/portfolio/analyse/news/
    │       overview/alerts/help/status/login/usage/margins/orders...
    │       → If match: dispatch directly (zero AI calls)
    │
    ├─► _CHAT_RE match AND NOT _TRADING_TERMS?
    │       _CHAT_RE: hi/hello/hey/what is X/explain Y/how does Z
    │       _TRADING_TERMS: buy/sell/nifty/price/portfolio/analyse/...
    │       → chat_basic(text)
    │         Model: llama-3.1-8b-instant
    │         Fast path — no JSON parsing needed
    │
    └─► _ai_fallback(text)
            → interpret_intent(text, user_name)
              Model: llama-3.3-70b-versatile
              Returns: {"intent": "...", "args": [...], "reply": "..."}
              → Dispatch to handler OR reply with "reply" field directly
```

---

## Message Routing — Web Backend

File: `stocky-web/backend/app/handlers/chat.py`

```
POST /api/chat  {message, conversation_id}
    │
    ├─► _parse_natural(text) — same regex patterns as TG bot
    │       → dispatch directly
    │
    └─► interpret_intent(text, history=last_4_messages)
            Model: llama-3.3-70b-versatile
            Returns: {"intent": "...", "args": [...], "reply": "..."}
            → dispatch to handler
            → save response to conversations table
```

Key difference from TG bot: web backend passes conversation history (last 10 messages stored, last 4 passed to intent parser for context).

---

## Prompts

### SYSTEM_PROMPT — Stocky's Persona

Used in: `chat()`, `chat_basic()`, `analyse_verdict()`, all non-intent Groq calls.

Defines:
- Stocky's personality: direct, no fluff, game-theoretic, contrarian, punchy sentences
- Never hedge. Never say "I think." State as fact.
- Think in payoffs, asymmetry, risk-reward
- CK's full biography (IIT Kanpur, JEE AIR 638, NMO AIR 3, Timelock Trade, Diffusion Labs, etc.)
- Core domain: Indian markets (NSE/BSE) via Zerodha Kite
- Answers any topic, not just trading

### INTENT_PROMPT — JSON Intent Parser

Used in: `interpret_intent()` only.

Maps user text to structured JSON:
```json
{"intent": "buy", "args": ["TCS", "10", "3500"], "reply": ""}
```

Valid intents:
```
buy, sell, price, analyse, portfolio, positions, holdings, orders, margins,
alert, news, overview, alerts, sl, maxloss, login, status, help, usage, chat
```

Rules enforced in prompt:
- Only use trading intents for actual trading requests
- `chat` intent for everything else — full answer in `reply` field
- Persona must be consistent (CK's voice)
- Return ONLY valid JSON (`response_format: {"type": "json_object"}`)

---

## Analysis Pipeline

File: `stocky-web/backend/app/handlers/analyse.py` (web) and `stocky-ai/bot/handlers/analyse.py` (TG bot)

```
get_analysis(symbol)
    │
    ├─► _validate_yf_ticker()          yfinance — validates symbol
    │
    ├─► _get_fundamental_data()        yfinance ticker.info
    │     P/E, ROE, D/E, earnings growth, revenue growth,
    │     profit margin, P/B, dividend yield, market cap
    │     → score 0–10
    │     latency: ~0.5–1s
    │
    ├─► _get_technical_data()          yfinance 1y daily OHLCV
    │     RSI(14), MACD(12/26/9), SMA(50/200), momentum,
    │     volume ratio(5d/20d avg), 52W range position
    │     → score 0–10
    │     latency: ~1–3s
    │
    ├─► _get_news_data()               10 RSS feeds (parallel)
    │     Filter articles by stock name/symbol
    │     Sentiment: title×3 + body×1 keyword scoring
    │     Positive: growth, beat, surge, upgrade, accumulate, overweight...
    │     Negative: decline, miss, downgrade, reduce, sell rating, target cut...
    │     → score 0–10
    │     latency: ~2–5s
    │
    ├─► _get_quarterly_results()       yfinance quarterly_income_stmt
    │     Fetches 8 quarters, computes QoQ and YoY deltas for first 4
    │     Returns: [{period, revenue, net_income, eps, *_qoq, *_yoy}]
    │     latency: ~0.5–1s
    │
    ├─► _get_shareholding()            yfinance major_holders
    │     latency: ~0.5s
    │
    ├─► _generate_news_analysis()      Groq llama-3.3-70b-versatile
    │     Input: top 6 article titles
    │     Prompt: "Summarise sentiment and key theme in 1-2 sentences"
    │     Output: short text → returned as news.analysis
    │     latency: ~1–2s
    │
    └─► analyse_verdict()              Groq llama-3.3-70b-versatile
          Input: fund/tech/news scores + overall
          Prompt: "Give Stocky's verdict in 1-2 sentences. Think payoffs."
          max_tokens: 128 (intentionally short)
          Output: bold 1-2 sentence take
          latency: ~0.5–1s

Total analysis latency: ~8–15s (mostly RSS feeds + yfinance downloads)
Overall score = technical_score + fundamental_score + news_score (0–30)
```

---

## Token Tracking & Cost Display

Every Groq call logs to the `api_call_log` table:
```sql
(service TEXT, endpoint TEXT, tokens INTEGER, ts DATETIME)
```

`get_ai_token_totals()` returns `(today_tokens, alltime_tokens)`.

### Display formula (used in `/usage` command and web cost intent)

```python
display_tokens = actual_tokens * 101          # ×101 branding multiplier

# Cost using Claude Opus 4.6 pricing (brand positioning):
# Input:  $15 / 1M tokens
# Output: $75 / 1M tokens
# Assume 40% input, 60% output split

cost = (display_tokens * 0.4 * 15 + display_tokens * 0.6 * 75) / 1_000_000
```

Usage message format: `"Today: {calls*101:,} calls and {tokens*101:,} tokens used"`

---

## Conversation History (Web Backend Only)

- Every user message + assistant response saved to `conversations` table
- `structured_data` column stores JSON for rich card data (AnalysisData, PortfolioData, etc.)
- `get_conversation_history(session_id, limit=10)` retrieves last 10 messages
- Intent parsing uses last 4 messages: `history[-4:]` (performance — fewer tokens)
- `chat()` uses full history (conversational continuity for general Q&A)

---

## Response Types

The `type` field in `ChatResponse` tells the frontend which component to render:

| Type | Component | When |
|------|-----------|------|
| `text` | Plain text / markdown | Chat, Q&A, help |
| `analysis` | `AnalysisCard` | Stock analysis |
| `price` | `PriceCard` | Price quote |
| `portfolio` | `PortfolioCard` | Portfolio summary |
| `positions` | `DataTable` | Open positions |
| `holdings` | `DataTable` | Holdings |
| `orders` | `DataTable` | Today's orders |
| `margins` | `DataTable` | Available margin |
| `news` | `NewsCard` | News articles |
| `overview` | `OverviewCard` | Market overview |
| `trade_confirm` | `TradeConfirmation` | Awaiting confirmation |
| `order_result` | Inline text | Order placed result |
| `alerts` | `AlertsCard` | Active alerts list |
| `usage` | Inline text | Token/call stats |
| `error` | Inline text | Error message |
