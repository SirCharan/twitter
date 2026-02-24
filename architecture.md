# Stocky AI — Visual Architecture

All diagrams use Mermaid (rendered on GitHub, Notion, and most markdown viewers).

---

## 1. System Overview

```mermaid
graph TB
    subgraph Users
        U1[CK on Telegram]
        U2[CK on Browser]
    end

    subgraph Railway["Railway — fearless-determination project"]
        TG["stocky-ai/bot/main.py\nTelegram Bot\nservice: worker"]
        API["stocky-web/backend/app/main.py\nFastAPI REST API\nservice: stocky-web-backend"]
    end

    subgraph Vercel["Vercel"]
        FE["stocky-web/frontend\nNext.js 15 Chat UI\nstocky-ai.vercel.app"]
        LP["stocky-landing\nMarketing Site\nstockyai.xyz\n(separate repo: SirCharan/stocky-landing)"]
    end

    subgraph External["External Services"]
        GROQ["Groq API\nllama-3.3-70b-versatile\nllama-3.1-8b-instant"]
        KITE["Zerodha Kite\nConnect API v5"]
        YF["yfinance\nQuarterly + Technical\n+ Fundamental data"]
        RSS["10 RSS Feeds\nLiveMint · ET Markets\nMoneycontrol · CNBC · etc."]
        NSE["nsetools\nNSE Index data"]
    end

    U1 -->|Telegram messages| TG
    U2 -->|HTTPS| FE
    FE -->|REST + JWT| API
    TG --> GROQ
    TG --> KITE
    TG --> YF
    TG --> RSS
    TG --> NSE
    API --> GROQ
    API --> KITE
    API --> YF
    API --> RSS
    API --> NSE
```

---

## 2. Telegram Bot — NLP Pipeline

```mermaid
flowchart TD
    MSG["User Message\ne.g. 'how is reliance doing'"]

    MSG --> NLP["handle_text()\nnlp.py"]

    NLP --> REGEX["_parse_natural(text)\nRegex matching\n~0ms — no AI"]

    REGEX -->|"Match: analyse/buy/sell\nprice/portfolio/news/etc."| DISPATCH["DISPATCH[intent]\nDirect handler call"]

    REGEX -->|"No match"| CHATCHECK{"_CHAT_RE match?\nAND no _TRADING_TERMS?"}

    CHATCHECK -->|"YES\nhi/hello/what is X\nexplain Y/how does Z"| BASIC["chat_basic(text)\nai_client.py\nModel: llama-3.1-8b-instant\nmax_tokens: 200 · temp: 0.7\nLatency: 0.3–0.8s"]

    CHATCHECK -->|"NO"| INTENT["interpret_intent(text)\nai_client.py\nModel: llama-3.3-70b-versatile\ntemp: 0.1 · JSON response\nLatency: 1–3s"]

    INTENT --> JSON["{intent, args, reply}"]

    JSON -->|"intent == 'chat'"| REPLY["Reply with 'reply' field\nfrom JSON directly"]

    JSON -->|"intent == 'analyse'"| ANALYSE["analyse.analyse()"]
    JSON -->|"intent == 'buy'/'sell'"| TRADE["trading.buy/sell_command()"]
    JSON -->|"intent == 'price'"| PRICE["market.price()"]
    JSON -->|"intent == 'portfolio'"| PORT["portfolio.portfolio()"]
    JSON -->|"other intents"| OTHER["...other handlers"]

    JSON -->|"Error / unknown"| FALLBACK["_offer_fallback_choices()\nInline keyboard buttons"]

    BASIC --> SEND["update.message.reply_text()"]
    REPLY --> SEND
    DISPATCH --> SEND
    ANALYSE --> SEND
    TRADE --> SEND
    PRICE --> SEND
    PORT --> SEND
    OTHER --> SEND
    FALLBACK --> SEND
```

---

## 3. Web Backend — Chat Dispatch

```mermaid
flowchart TD
    REQ["POST /api/chat\n{message, conversation_id}\nJWT authenticated"]

    REQ --> SAVE1["Save user message\nto conversations table"]

    SAVE1 --> HIST["Load last 10 messages\nfor context"]

    HIST --> REGEX["_parse_natural(text)\nSame regex as TG bot\n~0ms"]

    REGEX -->|"Match"| WDISPATCH["Direct handler dispatch"]

    REGEX -->|"No match"| WINTERP["interpret_intent(text, history=last_4)\nModel: llama-3.3-70b-versatile\nLatency: 1–3s"]

    WINTERP --> WJSON["{intent, args, reply}"]

    WJSON -->|"analyse"| WAN["handlers/analyse.py\nget_analysis(symbol)\nLatency: 8–15s total"]
    WJSON -->|"price"| WPR["handlers/market.py\nget_price(symbol)\nLatency: ~200ms"]
    WJSON -->|"portfolio"| WPO["handlers/portfolio.py\nLatency: ~200ms"]
    WJSON -->|"buy / sell"| WTR["handlers/trading.py\ninitiate_trade()\nCreates pending_action row"]
    WJSON -->|"news"| WNE["handlers/news.py\nget_news(symbol?)\nLatency: 2–5s"]
    WJSON -->|"overview"| WOV["handlers/overview.py\nget_overview()\nLatency: 1–2s"]
    WJSON -->|"chat"| WREP["Return reply field\nfrom JSON directly"]
    WJSON -->|"cost"| WCOST["DB query tokens\nCompute Claude Opus 4.6 cost\n→ '$X.XX'"]

    WDISPATCH --> SAVE2["Save assistant response\nto conversations table"]
    WAN --> SAVE2
    WPR --> SAVE2
    WPO --> SAVE2
    WTR --> SAVE2
    WNE --> SAVE2
    WOV --> SAVE2
    WREP --> SAVE2
    WCOST --> SAVE2

    SAVE2 --> RESP["ChatResponse\n{type, content, data,\naction_id, conversation_id}"]
```

---

## 4. Stock Analysis Pipeline

```mermaid
flowchart LR
    SYM["symbol input\ne.g. 'RELIANCE'"]

    SYM --> RES["_resolve_symbol()\nNSE symbol + yf symbol\n+ news search terms"]

    RES --> TICK["yf.Ticker(yf_symbol)\nvalidation ~0.5s"]

    TICK --> PAR["Parallel execution\nvia run_in_executor"]

    PAR --> FUND["_get_fundamental_data()\nyfinance ticker.info\nP/E · ROE · D/E · growth\nmargins · market cap\n→ score 0–10\nLatency: ~0.5–1s"]

    PAR --> TECH["_get_technical_data()\nyfinance 1y OHLCV download\nRSI(14) · MACD(12/26/9)\nSMA(50/200) · momentum\nvolume ratio · 52W range\n→ score 0–10\nLatency: ~1–3s"]

    PAR --> NEWS["_get_news_data(search_terms)\n10 RSS feeds parallel\nKeyword sentiment scoring\ntitle×3 weight, body×1\n→ articles[] + score 0–10\nLatency: ~2–5s"]

    PAR --> QTR["_get_quarterly_results()\nyfinance quarterly_income_stmt\n8 quarters fetched\nQoQ + YoY deltas computed\nReturn enriched top 4\nLatency: ~0.5s"]

    PAR --> SHR["_get_shareholding()\nyfinance major_holders\nLatency: ~0.3s"]

    FUND --> OVER["overall_score =\nfund + tech + news\nmax: 30"]
    TECH --> OVER
    NEWS --> OVER

    NEWS --> NANAL["_generate_news_analysis()\nGroq llama-3.3-70b\nPrompt: top 6 titles\n→ 1-2 sentence summary\nLatency: ~1–2s"]

    OVER --> VERDICT["analyse_verdict(name, scores)\nGroq llama-3.3-70b\nmax_tokens: 128 · temp: 0.7\n→ 1-2 sentence take\nLatency: ~0.5–1s"]

    FUND --> RESP["get_analysis() return\n{name, symbol, overall_score,\nfundamental{score,pe,roe,...},\ntechnical{score,rsi,macd,...},\nnews{score,articles,analysis},\nquarterly[{+qoq+yoy}],\nshareholding, verdict}"]
    TECH --> RESP
    NEWS --> RESP
    QTR --> RESP
    SHR --> RESP
    NANAL --> RESP
    VERDICT --> RESP
```

---

## 5. Trade Confirmation Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as Next.js Frontend
    participant API as FastAPI Backend
    participant DB as SQLite DB
    participant KITE as Kite Connect

    User->>FE: "buy 10 TCS at 3500"
    FE->>API: POST /api/chat
    API->>API: parse intent → buy
    API->>DB: INSERT pending_actions<br/>{action_id: uuid, status: pending,<br/>data: {symbol,qty,price,txn_type}}
    API->>FE: {type: "trade_confirm",<br/>action_id: "abc123",<br/>data: {symbol,qty,price}}
    FE->>User: TradeConfirmation card<br/>"Review before executing"

    User->>FE: Click Confirm
    FE->>API: POST /api/trade/confirm<br/>{action_id: "abc123", action: "confirm"}
    API->>DB: SELECT pending_actions WHERE id=abc123
    API->>KITE: place_order(symbol, qty, price,<br/>txn_type, product, order_type)
    KITE->>API: {order_id: "456789"}
    API->>DB: UPDATE pending_actions status=confirmed
    API->>DB: INSERT trade_history
    API->>FE: {type: "order_result",<br/>content: "BUY 10 TCS. Order ID: 456789"}
    FE->>User: Success confirmation
```

---

## 6. Kite Authentication Flow

```mermaid
flowchart TD
    START["auto_login() called\n(startup or 7:40 AM scheduler)"]

    START --> S1["requests.Session()\nGET kite login page"]
    S1 --> S2["POST login form\n{user_id, password}"]
    S2 --> S3["GET TOTP challenge page"]
    S3 --> TOTP["pyotp.TOTP(KITE_TOTP_SECRET).now()\nGenerates 6-digit code"]
    TOTP --> S4["POST TOTP code"]
    S4 --> S5["Follow redirect\nExtract request_token from URL"]
    S5 --> S6["KiteConnect.generate_session\n(request_token, api_secret)\n→ {access_token}"]
    S6 --> DB["UPDATE kite_session SET\naccess_token=... WHERE id=1"]
    DB --> DONE["Authenticated ✓\nToken valid ~6-8 hours"]

    DONE -.->|"Next request"| USE["get_authenticated_kite()\nRead token from DB\nkiteconnect.KiteConnect(\n  api_key, access_token)"]
```

---

## 7. Frontend Component & Data Flow

```mermaid
flowchart TD
    subgraph UI["Next.js Frontend"]
        SHELL["ChatShell.tsx\n'use client'"]
        SIDEBAR["Sidebar.tsx\nConversation list"]
        WINDOW["ChatWindow.tsx"]
        LIST["MessageList\nscrollable"]
        INPUT["ChatInput.tsx\ntextarea + send"]
        BUBBLE["MessageBubble.tsx\nroutes by message.type"]
    end

    subgraph Cards["Rich Response Cards"]
        AC["AnalysisCard.tsx\ntype: 'analysis'\n• ScoreBar\n• expand/collapse news\n• Stocky's Take (AI)\n• expand/collapse quarterly\n• QoQ/YoY badges"]
        PC["PriceCard.tsx\ntype: 'price'\nLTP · OHLC · volume"]
        PO["PortfolioCard.tsx\ntype: 'portfolio'\nday P&L · holdings"]
        NC["NewsCard.tsx\ntype: 'news'\narticles · Stocky's Summary"]
        OC["OverviewCard.tsx\ntype: 'overview'\nindices · breadth · gainer/loser"]
        TC["TradeConfirmation.tsx\ntype: 'trade_confirm'\nConfirm · Cancel buttons"]
        DT["DataTable.tsx\npositions/holdings/orders/margins"]
    end

    subgraph Hooks["React Hooks"]
        UC["useChat.ts\nmessages state\nsendMessage()\nconfirmTrade()"]
        UCV["useConversations.ts\nconversations list\nloadConversation()"]
    end

    subgraph API["API Layer"]
        APITS["api.ts\nsendMessage()\nconfirmTrade()\ngetConversations()\ngetMessages()"]
    end

    SHELL --> SIDEBAR
    SHELL --> WINDOW
    WINDOW --> LIST
    WINDOW --> INPUT
    LIST --> BUBBLE

    BUBBLE --> AC
    BUBBLE --> PC
    BUBBLE --> PO
    BUBBLE --> NC
    BUBBLE --> OC
    BUBBLE --> TC
    BUBBLE --> DT

    INPUT -->|"user types"| UC
    UC --> APITS
    APITS -->|"JWT fetch"| BACKEND["FastAPI\n/api/chat"]
    BACKEND --> APITS
    APITS --> UC
    UC --> LIST

    SIDEBAR --> UCV
    UCV --> APITS
```

---

## 8. Sentiment Scoring — News Articles

```mermaid
flowchart LR
    FEED["RSS Feed Entry\n{title, summary}"]

    FEED --> MATCH{"Contains stock\nname/symbol?"}

    MATCH -->|"No"| SKIP["Skip article"]

    MATCH -->|"Yes"| SPLIT["Split into:\ntitle_lower\nbody_lower"]

    SPLIT --> PKWS["Positive keywords:\ngrowth · beat · surge\nupgrade · accumulate\noverweight · rally\ntarget raised · rerating..."]

    SPLIT --> NKWS["Negative keywords:\ndecline · miss · downgrade\nreduce · avoid · exit\nsell rating · target cut\nunderweight · downside..."]

    PKWS --> SCORE["Score calculation:\npos = title_hits×3 + body_hits×1\nneg = title_hits×3 + body_hits×1\ntotal = pos + neg + 1\nsentiment = (pos - neg) / total\nRange: -1.0 to +1.0"]

    NKWS --> SCORE

    SCORE --> ART["Article stored:\n{source, title, date,\nsentiment, link}"]

    ART --> AGG["Aggregate all articles:\navg_sentiment = mean(sentiments)\nnews_score = 5 + avg×5\nClamped to 0–10"]

    AGG --> DISP["Display:\n▲ if sentiment > 0\n▼ if sentiment < 0\n● if sentiment == 0"]
```

---

## 9. Latency Budget Summary

```
User asks: "how is Reliance doing"
─────────────────────────────────────────────────────────────────
Step                               Who            Approx Time
─────────────────────────────────────────────────────────────────
1. NLP intent parsing              Groq 70B       1–3s
2. yfinance validate_ticker        yfinance       0.3–0.5s
3. _get_fundamental_data           yfinance       0.5–1s
4. _get_technical_data (1y OHLCV)  yfinance       1–3s
5. _get_news_data (10 RSS feeds)   feedparser     2–5s  ← bottleneck
6. _get_quarterly_results          yfinance       0.5–1s
7. _get_shareholding               yfinance       0.3s
8. _generate_news_analysis         Groq 70B       1–2s
9. analyse_verdict                 Groq 70B       0.5–1s
─────────────────────────────────────────────────────────────────
Total (steps 2-9 partially parallel):             ~8–15s
─────────────────────────────────────────────────────────────────

User asks: "buy 10 TCS at 3500"
─────────────────────────────────────────────────────────────────
1. Regex NLP match                 local          ~0ms
2. initiate_trade() + DB write     local          ~5ms
─────────────────────────────────────────────────────────────────
Total (to trade_confirm card):                    ~10ms

After confirm click:
3. Kite place_order()              Kite API       100–300ms
─────────────────────────────────────────────────────────────────

User says: "hi"
─────────────────────────────────────────────────────────────────
1. _CHAT_RE match                  local          ~0ms
2. chat_basic()                    Groq 8B        300–800ms
─────────────────────────────────────────────────────────────────
Total:                                            ~0.3–0.8s
```
