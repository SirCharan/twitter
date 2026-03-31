// ─── Stocky AI Technical Architecture Document ───────────────────────────
// Each section is a separate export for interleaving markdown + Mermaid diagrams.

export const TITLE = "Stocky AI — Technical Architecture";
export const SUBTITLE = "Engineering deep-dive into the AI-powered trading assistant for Indian markets";
export const LAST_UPDATED = "March 2026";

// ─── Section 1: Overview ─────────────────────────────────────────────────

export const OVERVIEW = `
## 1. Overview & Philosophy

**Stocky AI** is a personal AI-powered trading assistant for Indian equity markets (NSE/BSE). It combines real-time market data, multi-agent LLM reasoning, and broker integration (Zerodha Kite + Dhan HQ) into a single chat-based interface — designed to feel like Bloomberg Terminal meets ChatGPT.

### Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Mobile-first** | PWA with iOS/Android install, safe-area handling, 44px touch targets |
| **Real-time** | Dhan HQ live quotes overlay, SSE streaming for deep research |
| **Zero-fluff** | Contrarian AI voice, payoff-asymmetry framework, no hedge-word paragraphs |
| **Data-backed** | Every AI claim cites sources; 0-20 scoring system with factor breakdowns |
| **Ship daily** | 79 commits in 60 days, auto-deploy on push to main |

### By the Numbers

| Metric | Value |
|--------|-------|
| Frontend components | 50+ (27 card types) |
| Backend handlers | 31 |
| LLM models used | 4 (Llama 3.3 70B, Scout 17B, GPT-OSS 120B, Gemini 2.5 Pro) |
| Groq API keys | 6 (round-robin pool) |
| RSS news sources | 41 |
| Database tables | 14 |
| Agent architectures | 3 (Triad, Crew, Council — up to 7 agents) |
| Feature buttons | 20 (Market Overview, Top Stocks, Analyse, Deep Research, Scan, Chart, Compare, Options, IPO, Macro, RRG, Sectors, Valuation, FII/DII, Earnings, Dividends, Announcements, Summarise, Portfolio, News) |
`;

// ─── Mermaid: System Architecture ─────────────────────────────────────

export const SYSTEM_ARCH_DIAGRAM = `graph TB
    subgraph Client["Client Layer"]
        PWA["PWA / Browser<br/>Next.js 16 + React 19"]
        SW["Service Worker<br/>Cache-first static<br/>Network-first API"]
    end

    subgraph Edge["Edge Layer — Vercel"]
        CDN["Vercel CDN<br/>Static assets + ISR"]
        HEADERS["Security Headers<br/>CSP, X-Frame, HSTS"]
    end

    subgraph Backend["Backend — Railway"]
        API["FastAPI + Uvicorn<br/>Async ASGI"]
        ORCH["LLM Orchestrator<br/>6-key round-robin"]
        CACHE["In-Memory TTL Cache<br/>10s — 3600s"]
        DB["SQLite<br/>aiosqlite<br/>14 tables"]
    end

    subgraph LLMs["LLM Providers"]
        GROQ["Groq Cloud<br/>Llama 3.3 70B<br/>Scout 17B"]
        OR["OpenRouter<br/>Gemini 2.5 Pro"]
    end

    subgraph Data["Market Data"]
        DHAN["Dhan HQ v2<br/>Live quotes, Options<br/>OHLC, Historical"]
        KITE["Zerodha Kite<br/>Orders, Portfolio<br/>Holdings, Margins"]
        YF["yfinance<br/>Fundamentals<br/>Technicals"]
        NSE["nsetools<br/>Gainers, Losers<br/>Breadth"]
        RSS["41 RSS Feeds<br/>Indian + Global<br/>News sentiment"]
    end

    PWA --> CDN
    SW -.-> CDN
    CDN --> HEADERS --> API
    API --> ORCH --> GROQ
    ORCH --> OR
    API --> CACHE
    API --> DB
    API --> DHAN
    API --> KITE
    API --> YF
    API --> NSE
    API --> RSS

    style Client fill:#0A0A0A,stroke:#C9A96E,color:#F5F0EB
    style Edge fill:#0A0A0A,stroke:#C9A96E,color:#F5F0EB
    style Backend fill:#0A0A0A,stroke:#C9A96E,color:#F5F0EB
    style LLMs fill:#0A0A0A,stroke:#C9A96E,color:#F5F0EB
    style Data fill:#0A0A0A,stroke:#C9A96E,color:#F5F0EB`;

// ─── Section 2: Frontend ─────────────────────────────────────────────────

export const FRONTEND = `
## 2. Frontend Stack

### Core

| Technology | Version | Role |
|-----------|---------|------|
| Next.js | 16.1.6 | App Router, SSR, API routes, ISR |
| React | 19.2.3 | UI rendering, Server Components, automatic batching |
| TypeScript | 5.x | Strict mode, path aliases (\`@/*\`) |
| Tailwind CSS | 4.x | Utility-first styling via PostCSS plugin |
| Framer Motion | 12.36 | Spring physics animations, AnimatePresence, layoutId |
| Radix UI | latest | Accessible primitives (Dialog, Dropdown, Tooltip, ScrollArea) |

### PWA Configuration

**Service Worker** (\`sw.js\`):
- **Static assets**: Cache-first (JS, CSS, images, fonts, \`/_next/static/\`)
- **Pages/API**: Network-first → cache fallback → \`offline.html\`
- **Cache versioning**: Build-timestamp stamped (\`stocky-{timestamp}\`), auto-busts on deploy
- **Precache**: \`offline.html\`, icons, manifest

**Manifest** (\`manifest.json\`):
- Display: \`standalone\` with \`window-controls-overlay\` + \`minimal-ui\` fallback
- Shortcuts: Market Overview, Portfolio, News (direct launch)
- Icons: 192x192, 512x512, 512x512 maskable

**iOS Support**:
- \`apple-mobile-web-app-capable: true\`
- \`black-translucent\` status bar
- 9 splash screen images for iPhone 13 mini → 16 Pro Max
- PWA install dialog with step-by-step share sheet instructions

### Component Architecture

**27 Card Components** — each handles a specific data type:
- **Analysis**: AnalysisCard, DeepResearchCard, AgentDebateCard, CouncilProgressCard, CouncilResultCard
- **Market Data**: OverviewCard, PriceCard, NewsCard, MacroCard, FiiDiiCard, TopStocksCard
- **Technicals**: ChartCard (TradingView embed), OptionsCard, RrgCard, SectorsCard
- **Scanning**: ScanCard (7 scan types), CompareCard
- **Corporate**: EarningsCard, DividendsCard, AnnouncementsCard, IpoCard, ValuationCard
- **Portfolio**: PortfolioCard, TradeConfirmation (2-phase)

**Dynamic Imports**: All 28 card components are code-split via \`next/dynamic\` in MessageBubble.tsx — only the card needed for the current response is loaded.

**4 Custom Hooks**:
- \`useChat\` — Message handling, SSE streaming, error recovery
- \`useConversations\` — Conversation CRUD, list management
- \`useMediaQuery\` — Responsive breakpoint detection
- \`usePWAInstall\` — Install prompt detection (Android \`beforeinstallprompt\` + iOS UA sniffing)

### Performance Optimizations

| Optimization | Impact |
|-------------|--------|
| Dynamic imports for cards | ~35% reduction in initial JS bundle |
| Boot screen skip (sessionStorage) | 0ms load for returning users (vs 4.2s) |
| SW cache-first for static | Instant loads for cached assets |
| Framer Motion layoutId | GPU-accelerated tab transitions |
| CSP headers | XSS attack surface hardened |
| Radix headless components | Zero CSS overhead, accessible by default |

### Tradeoffs

| Decision | Tradeoff |
|----------|----------|
| Tailwind v4 (PostCSS) | Bleeding-edge; no tailwind.config.ts customization yet |
| Framer Motion (190KB) | Rich animations vs bundle size; offset by dynamic imports |
| localStorage for auth | XSS risk vs simplicity (single-user personal tool) |
| No test suite | Ship velocity vs regression safety; 4 commits in 11 min reverting each other |
| "use client" on all components | Correct for interactive cards, but limits Server Component benefits |
| html2canvas for share | Can hang on complex cards; mitigated with 8s timeout |
`;

// ─── Section 3: Backend ──────────────────────────────────────────────────

export const BACKEND = `
## 3. Backend Stack

### Core

| Technology | Version | Role |
|-----------|---------|------|
| FastAPI | 0.115 | Async web framework (ASGI), auto-docs, Pydantic validation |
| Uvicorn | 0.34 | Production ASGI server |
| Pydantic | 2.9 | Request/response validation, JSON Schema |
| aiosqlite | 0.20 | Async SQLite (non-blocking DB access) |
| httpx | 0.28 | Async HTTP client (Dhan, OpenRouter) |
| python-jose | 3.3 | JWT token creation/validation |

### API Surface

**40+ endpoints** organized by domain:

| Domain | Endpoints | Method |
|--------|-----------|--------|
| Chat | \`/api/chat\` | POST (intent parsing → handler dispatch) |
| Deep Research | \`/api/research\`, \`/api/deep-research\`, \`/api/crew-research\`, \`/api/council-research\` | POST (SSE streaming) |
| Market Data | \`/api/scan\`, \`/api/chart\`, \`/api/compare\`, \`/api/ipo\`, \`/api/macro\`, \`/api/rrg\`, \`/api/sectors\`, \`/api/valuation\`, \`/api/fii-dii\`, \`/api/options\`, \`/api/earnings\`, \`/api/dividends\`, \`/api/announcements\` | GET/POST |
| Trading | \`/api/trade/confirm\`, \`/api/kite/login\`, \`/api/kite/status\` | POST/GET |
| Portfolio | \`/api/conversations\`, \`/api/watchlist\`, \`/api/alerts\` | CRUD |
| Export | \`/api/export/pdf\`, \`/api/share\` | POST |
| Analytics | \`/api/analytics/log\`, \`/api/analytics/stats\`, \`/api/feedback\` | POST/GET |

### Intent Parser

The chat endpoint uses a 2-layer intent parsing system:

1. **Regex NLP** (\`_parse_natural()\`): 30+ regex patterns match common queries
   - \`"how's the market"\` → \`overview\`
   - \`"analyse RELIANCE"\` → \`analyse, [RELIANCE]\`
   - \`"buy 10 INFY at 1500"\` → \`buy, [INFY, 10, 1500]\`
   - \`"top stocks"\` → \`top_stocks\`

2. **AI Fallback** (\`interpret_intent()\`): If no regex matches, Groq classifies the intent as JSON with \`temperature: 0.1\`

### Tradeoffs

| Decision | Tradeoff |
|----------|----------|
| SQLite (not PostgreSQL) | Zero ops, instant setup, single-file backup. But: single-writer, no replication, no concurrent writes |
| FastAPI (not Django) | Async-native, faster, lighter. But: no admin panel, no ORM, manual migrations |
| In-memory cache (not Redis) | Zero infra. But: lost on restart, no cross-instance sharing |
| Regex intent parsing | Fast, deterministic, zero API cost. But: brittle, no fuzzy matching |
| Pydantic v2 | 5-40x faster validation. But: breaking changes from v1 |
`;

// ─── Mermaid: LLM Orchestration ──────────────────────────────────────

export const LLM_ORCH_DIAGRAM = `flowchart TB
    REQ["User Query + Button Type"]
    CONFIG["Select Prompt Config<br/>16 button-specific templates"]
    QUICK["Quick Mode<br/>Single Groq Call<br/>512-1024 tokens"]
    DEEP["Deep Mode — 3-Stage Pipeline"]
    S1["Stage 1: Primary Analysis<br/>Deep prompt + full data<br/>1536-2048 tokens"]
    S2["Stage 2: Critique<br/>Devil's Advocate audit<br/>768 tokens, temp 0.3"]
    S3["Stage 3: Synthesis<br/>Merge primary + critique<br/>Verdict + actionable levels"]
    POOL["Key Pool<br/>6 Groq API Keys<br/>Round-Robin Rotation"]
    OUT["Response<br/>ai_analysis + ai_metadata"]

    REQ --> CONFIG
    CONFIG -->|"deep=false"| QUICK --> OUT
    CONFIG -->|"deep=true"| DEEP
    DEEP --> S1 --> S2 --> S3 --> OUT
    QUICK -.-> POOL
    S1 -.-> POOL
    S2 -.-> POOL
    S3 -.-> POOL

    style REQ fill:#1a1a1a,stroke:#C9A96E,color:#F5F0EB
    style POOL fill:#1a1a1a,stroke:#C9A96E,color:#C9A96E
    style OUT fill:#1a1a1a,stroke:#00FF9D,color:#00FF9D`;

export const LLM_SECTION = `
## 4. LLM Orchestration

### Model Selection

| Model | Provider | Use Case | Tokens/Call |
|-------|----------|----------|-------------|
| **Llama 3.3 70B** | Groq | General chat, quick analysis, verdicts | 512-2048 |
| **Llama 4 Scout 17B** | Groq | Debate agents (lighter, faster) | 512-1024 |
| **GPT-OSS 120B** | Groq | High-level conversation synthesis | 1024 |
| **Gemini 2.5 Pro** | OpenRouter | Deep research (largest context, best reasoning) | 4096 |

### Key Pool Architecture

6 Groq API keys rotate round-robin via an async-safe \`KeyPool\` class:

\`\`\`
Request 1 → Key 1
Request 2 → Key 2
...
Request 6 → Key 6
Request 7 → Key 1 (wraps around)
\`\`\`

**Why**: Groq's free tier has per-key rate limits (~30 RPM). Round-robin across 6 keys gives effective 180 RPM. Each key gets its own \`AsyncGroq\` client instance (connection pooling).

**Retry**: On failure, the next key is tried automatically (1 retry per call).

### Prompt Engineering

16 button-specific prompt configs in \`prompts/orchestrator.py\`:

| Button | Score System | Key Sections |
|--------|-------------|--------------|
| Analyse | Stocky Score 0-20 (F/T/S/M) | Scenario table, trade setup, catalyst watch |
| Overview | Breadth Score 0-20 | Regime, VIX, FII/DII, risk-reward of the day |
| News | Sentiment Score 0-20 | Impact matrix, contrarian thesis, FII reaction |
| Scan | Scan Score 0-20 | Scoring matrix, pattern cluster, sector breakdown |
| Options | Signal Score 0-20 | PCR analysis, max pain, IV skew, strategy table |
| Top Stocks | Pulse Score 0-20 | Cross-scan conviction, sector signal, risk flag |

All prompts enforce: **"If you lack data for a section, SKIP IT ENTIRELY. Never output empty tables or placeholders."**

### Tradeoffs

| Decision | Tradeoff |
|----------|----------|
| Groq (not OpenAI) | 10x faster inference (LPU), free tier. But: smaller model selection, less reliable |
| 6-key round-robin | Effective 180 RPM for free. But: fragile if Groq changes limits; not enterprise-grade |
| Prompt-per-button | Tailored output per feature. But: 16 prompts to maintain, drift risk |
| 3-stage deep pipeline | Higher quality (critique catches hallucinations). But: 3x latency, 3x cost |
| Gemini via OpenRouter | Best reasoning for deep research. But: additional API dependency, higher cost |
`;

// ─── Mermaid: Agent Debate ────────────────────────────────────────────

export const AGENT_DEBATE_DIAGRAM = `sequenceDiagram
    participant U as User
    participant R as Router
    participant B as Bull Agent<br/>(Optimistic)
    participant E as Bear Agent<br/>(Pessimistic)
    participant M as Moderator<br/>(Synthesis)
    participant C as Card

    U->>R: "deep research on RELIANCE"
    R->>B: Primary bull thesis
    R->>E: Primary bear thesis
    B-->>R: SSE: bull_analysis
    E-->>R: SSE: bear_analysis
    R->>B: Rebuttal (counter bear)
    R->>E: Rebuttal (counter bull)
    B-->>R: SSE: bull_rebuttal
    E-->>R: SSE: bear_rebuttal
    R->>M: Synthesize both + data
    M-->>R: SSE: synthesis + confidence
    R->>C: Final AgentDebateCard`;

export const AGENT_SECTION = `
## 5. Multi-Agent Architectures

### Triad Research (3 agents)

| Agent | Role | Model | Personality |
|-------|------|-------|-------------|
| **Aris** | Lead Researcher | 70B | Data-hungry, methodical, structured |
| **Silas** | Skeptic & Verifier | 70B | Cynical, forensic, contrarian |
| **Nexus** | Moderator & Synthesizer | 70B | Balanced, decisive, confidence-scored |

Pipeline: Aris researches → Silas critiques (claim audit: Verified/Plausible/Refuted) → Nexus synthesizes with confidence score (0-100).

### Council Debate (6 agents)

| Agent | Abbreviation | Model | Focus |
|-------|-------------|-------|-------|
| Technical Specialist | TS | 70B (heavy) | RSI, MACD, S/R, patterns |
| Fundamental Analyst | FA | 70B (heavy) | ROE, PE, earnings, moat |
| Market Pulse | MP | 17B (light) | News sentiment, flows |
| Risk Guardian | RG | 17B (light) | Drawdown, tail risk, hedging |
| Macro Economist | ME | 17B (light) | RBI, crude, USDINR, yields |
| Chief Synthesis Officer | CSO | 70B (heavy) | Final verdict, confidence, trade |

**Model routing**: Heavy agents (TS, FA, CSO) use 70B for depth. Light agents (MP, RG, ME) use 17B for speed. This cuts total latency by ~40% while maintaining quality where it matters.

### Crew Research (7 agents)

Planner → Fundamental Analyst → Sector/Macro → News/Sentiment → Technical → Critic → Synthesizer. Sequential pipeline, each agent builds on the previous output.

### SSE Streaming

All deep research endpoints use **Server-Sent Events** (text/event-stream):

\`\`\`
data: {"phase": "bull_analysis", "agent": "Bull", "content": "...", "thinking": "..."}
data: {"phase": "bear_analysis", "agent": "Bear", "content": "..."}
data: {"phase": "synthesis", "confidence": 72, "verdict": "HOLD"}
\`\`\`

Frontend renders each phase in real-time via \`DebateProgressCard\` / \`CouncilProgressCard\`.
`;

// ─── Mermaid: Data Pipeline ──────────────────────────────────────────

export const DATA_PIPELINE_DIAGRAM = `flowchart LR
    subgraph Sources["Data Sources"]
        D["Dhan HQ v2<br/>LTP, OHLC, Options"]
        K["Zerodha Kite<br/>Portfolio, Orders"]
        Y["yfinance<br/>Fundamentals<br/>Technicals"]
        N["nsetools<br/>Breadth<br/>Gainers/Losers"]
        F["41 RSS Feeds<br/>News + Sentiment"]
    end

    subgraph Processing["Processing Layer"]
        H["31 Handlers<br/>analyse, scan, options<br/>macro, news, etc."]
        C["TTL Cache<br/>10s-3600s<br/>MD5-keyed"]
        O["LLM Orchestrator<br/>Quick or Deep mode"]
    end

    subgraph Output["Response"]
        JSON["Structured JSON<br/>+ ai_analysis<br/>+ structured_meta"]
        CARD["27 Card Components<br/>Dynamic import"]
    end

    D --> H
    K --> H
    Y --> H
    N --> H
    F --> H
    H --> C
    C --> O
    O --> JSON --> CARD

    style Sources fill:#0A0A0A,stroke:#C9A96E,color:#F5F0EB
    style Processing fill:#0A0A0A,stroke:#C9A96E,color:#F5F0EB
    style Output fill:#0A0A0A,stroke:#00FF9D,color:#F5F0EB`;

export const DATA_SECTION = `
## 6. Data Pipeline

### Market Data Sources

| Source | Data | Refresh | Method |
|--------|------|---------|--------|
| **Dhan HQ v2** | Live LTP, OHLC, option chains, historical candles | Real-time | Async HTTP (\`httpx\`) |
| **Zerodha Kite** | Portfolio, holdings, positions, margins, order placement | Real-time | SDK (\`kiteconnect\`) |
| **yfinance** | Fundamentals (PE, ROE, D/E), technicals (RSI, MACD, SMA), quarterly results | 15-min delay | ThreadPoolExecutor |
| **nsetools** | Top gainers/losers, advances/declines breadth | 8s timeout | Sync HTTP |
| **41 RSS feeds** | Market news with keyword-based sentiment scoring | On-demand | feedparser |

### Dhan HQ Integration

- **73 securities mapped** (Nifty 50 + major indices → Dhan security IDs)
- **Token auto-renewal**: Every 20 hours via background task, stored in SQLite + memory
- **Fallback chain**: Memory token → DB token → API renewal → env var fallback
- **Endpoints used**: \`/marketfeed/ltp\`, \`/marketfeed/ohlc\`, \`/optionchain\`, \`/optionchain/expirylist\`, \`/charts/historical\`

### Options Analytics Pipeline

\`\`\`
get_expiry_list() → classify weekly/monthly
    → get_option_chain(weekly) + get_option_chain(monthly)
    → compute_chain_summary() — PCR, Max Pain, top OI strikes
    → compute_iv_skew() — ATM vs OTM ±5%
    → compute_volume_hotspots() — top 5 by volume
    → compute_expected_move() — ATM straddle premium
    → enrich_oi_interpretation() — Long Buildup / Short Covering
    → derive_signals() — rules-based (PCR thresholds, max pain distance)
    → compute_verdict() — BULLISH/BEARISH/NEUTRAL + confidence
    → LLM orchestrator → ai_analysis
\`\`\`

### News Aggregation

**41 RSS sources** across 8 categories:
- Indian Markets (11): LiveMint, ET Markets, Moneycontrol, CNBC-TV18, Business Standard, NDTV Profit, Hindu BusinessLine, Indian Express, Business Today
- Global/US (5): Reuters, CNBC, MarketWatch, Yahoo Finance, BBC
- Premium (4): Bloomberg, AP, Al Jazeera, CNBC Top News
- Commodities (4): ET Commodities, MC Commodities, OilPrice, Kitco Gold
- Energy/Metals (3): Rigzone, Mining.com, FT Commodities
- Asia-Pacific (3): Nikkei Asia, SCMP, Straits Times
- Geopolitical (4): TASS, DefenseOne, War on the Rocks, The Diplomat
- Central Banks (1): Fed Press Releases

**Sentiment scoring**: Weighted keyword matching (title keywords = 3x weight). 25 positive keywords (growth, beat, surge, rally...) and 25 negative keywords (decline, miss, crash, warning...). Score normalized to 0-10.

### Caching Strategy

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| Live quotes (Dhan) | 10-30s | Near real-time requirement |
| Scan results | 120s | Expensive batch download (yfinance 100 stocks) |
| Technical indicators | 300s | Computed from daily data, stable intraday |
| Options analytics | 300s | Chain data changes moderately |
| Fundamentals | 3600s | Quarterly data, rarely changes |
| News feeds | 1800s | RSS feeds update every 15-30 min |

Implementation: \`@cached(ttl=N)\` decorator, MD5-hashed args for cache key, \`clear_all_caches()\` on Dhan token renewal.
`;

// ─── Mermaid: Database ───────────────────────────────────────────────

export const DB_DIAGRAM = `erDiagram
    kite_session {
        int id PK
        text access_token
        text login_time
    }
    dhan_session {
        int id PK
        text access_token
        text refreshed_at
    }
    conversations {
        int id PK
        text conversation_id
        text username
        text role
        text content
        text message_type
        text structured_data
        text created_at
    }
    pending_actions {
        int id PK
        text action_id UK
        text username
        text action_type
        text action_data
        text status
    }
    trade_history {
        int id PK
        text order_id
        text symbol
        text transaction_type
        int quantity
        real price
    }
    analytics_events {
        int id PK
        text event_type
        text target
        text details
        text session_id
        text ts
    }
    watchlist {
        int id PK
        text symbol UK
        text added_at
    }
    feedback {
        int id PK
        text message_id
        text rating
        text tags
        text comment
    }
    alerts {
        int id PK
        text symbol
        real target_price
        text direction
    }
    shared_snapshots {
        text id PK
        text card_type
        text card_data
    }
    user_facts {
        int id PK
        text username
        text fact_key
        text fact_value
    }

    conversations ||--o{ pending_actions : "has"
    conversations ||--o{ feedback : "receives"`;

export const DB_SECTION = `
## 7. Database Schema

**14 SQLite tables** managed via \`aiosqlite\` (async, non-blocking):

| Table | Purpose | Key Columns |
|-------|---------|------------|
| \`kite_session\` | Zerodha auth token (singleton) | access_token, login_time |
| \`dhan_session\` | Dhan auth token (singleton) | access_token, refreshed_at |
| \`conversations\` | Chat history | conversation_id, role, content, structured_data |
| \`pending_actions\` | 2-phase trade confirmation | action_id, action_type, status |
| \`trade_history\` | Executed orders | symbol, qty, price, status |
| \`analytics_events\` | User behavior tracking | event_type, target, session_id |
| \`watchlist\` | Saved stock symbols | symbol (unique) |
| \`feedback\` | Thumbs up/down + tags | rating, tags (JSON), comment |
| \`alerts\` | Price alerts | symbol, target_price, direction |
| \`shared_snapshots\` | Shareable card screenshots | card_type, card_data (JSON) |
| \`user_facts\` | User memory/preferences | fact_key, fact_value |
| \`web_users\` | Auth (legacy, hardcoded "CK") | username, password_hash |
| \`command_log\` | Command audit trail | command, args, source |
| \`api_call_log\` | API usage tracking | service, endpoint, tokens |

**Indexes**: \`analytics_events(ts)\`, \`analytics_events(event_type)\`, \`watchlist(symbol)\`
`;

// ─── Section: Security ────────────────────────────────────────────────

export const SECURITY = `
## 8. Security

### HTTP Headers (next.config.ts)

| Header | Value | Purpose |
|--------|-------|---------|
| Content-Security-Policy | \`default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' googleapis tradingview jsdelivr; connect-src 'self' *.stockyai.xyz *.railway.app analytics\` | XSS mitigation |
| X-Frame-Options | DENY | Clickjacking prevention |
| X-Content-Type-Options | nosniff | MIME sniffing prevention |
| X-XSS-Protection | 1; mode=block | Legacy XSS filter |
| Referrer-Policy | strict-origin-when-cross-origin | Referrer leakage prevention |

### Trade Execution Safety

2-phase confirmation:
1. **Phase 1**: User says "buy 10 RELIANCE" → backend creates \`pending_action\` with \`action_id\`
2. **Phase 2**: Frontend shows TradeConfirmation card (symbol, qty, price, est. value, risk gauge)
3. User explicitly confirms → backend executes via Kite API → order result card

No trade can execute without explicit Phase 2 confirmation.

### Auth & Token Management

| Token | Storage | Renewal | Lifetime |
|-------|---------|---------|----------|
| JWT (web) | localStorage | Manual | 30 days |
| Kite access | SQLite + memory | Auto (24h background task, TOTP) | 24 hours |
| Dhan access | SQLite + memory | Auto (20h background task, API renewal) | 24 hours |

### Known Gaps

| Gap | Risk | Mitigation |
|-----|------|------------|
| JWT in localStorage | XSS can steal token | Single-user tool; CSP reduces XSS surface |
| No CSRF tokens | Cross-site request forgery | CORS allowlist + SameSite cookies (future) |
| SQLite file access | No encryption at rest | Railway volume isolation |
| Hardcoded user "CK" | No multi-tenant auth | Personal tool by design |
`;

// ─── Mermaid: Deployment ─────────────────────────────────────────────

export const DEPLOY_DIAGRAM = `flowchart LR
    GH["GitHub<br/>SirCharan/twitter<br/>main branch"]

    subgraph Vercel["Vercel"]
        VB["Auto-build<br/>npm run build"]
        VD["Deploy to CDN<br/>llm.stockyai.xyz"]
    end

    subgraph Railway["Railway"]
        RB["Auto-build<br/>Docker / Nixpacks"]
        RD["Deploy<br/>stocky-web-backend<br/>.up.railway.app"]
    end

    GH -->|"push to main"| VB --> VD
    GH -->|"push to main"| RB --> RD

    style GH fill:#1a1a1a,stroke:#C9A96E,color:#F5F0EB
    style Vercel fill:#1a1a1a,stroke:#00FF9D,color:#F5F0EB
    style Railway fill:#1a1a1a,stroke:#00FF9D,color:#F5F0EB`;

export const DEPLOY_SECTION = `
## 9. Deployment & CI/CD

### Infrastructure

| Layer | Service | Config |
|-------|---------|--------|
| **Frontend** | Vercel | Auto-deploy on push to \`main\`, edge CDN, ISR |
| **Backend** | Railway | Auto-deploy on push, \`uvicorn app.main:app --host 0.0.0.0\` |
| **Database** | Railway volume | SQLite file persisted across deploys |
| **DNS** | Vercel | \`llm.stockyai.xyz\` → Vercel, custom domain |

### Build Pipeline

**Frontend** (\`npm run build\`):
1. \`stamp-sw\` — Node.js script replaces SW cache name with build timestamp
2. \`next build\` — Compiles TypeScript, tree-shakes, code-splits, generates static pages

**Backend**: Railway auto-detects Python, installs from \`requirements.txt\`, runs uvicorn.

### Deployment Frequency

79 commits in 60 days = **1.3 deploys/day average**. Both Vercel and Railway auto-deploy on every push to \`main\`. Zero-downtime deploys (Vercel: atomic swap, Railway: rolling restart).
`;

// ─── Section: Tradeoffs ──────────────────────────────────────────────

export const TRADEOFFS = `
## 10. Engineering Tradeoffs & Known Limitations

### Architecture Decisions

| Decision | What We Chose | Alternative | Why |
|----------|--------------|-------------|-----|
| Database | SQLite | PostgreSQL | Zero ops, instant backup, sufficient for single-user. Limitation: single-writer, no replication |
| LLM Provider | Groq (free tier, 6 keys) | OpenAI GPT-4, Anthropic Claude | 10x faster inference (LPU hardware), $0 cost. Limitation: smaller models, rate limits |
| Frontend Framework | Next.js 16 + React 19 | SvelteKit, Remix | Best ecosystem, SSR + SSG + ISR, Vercel integration. Limitation: large bundle, complex hydration |
| Styling | Tailwind v4 | CSS Modules, Styled Components | Utility-first = fast iteration, small CSS. Limitation: long class strings, no config file yet (v4) |
| Animations | Framer Motion | CSS transitions, React Spring | Best DX, spring physics, layoutId. Limitation: 190KB bundle (mitigated by dynamic imports) |
| Market Data | yfinance + Dhan + nsetools | Bloomberg API, Refinitiv | Free, sufficient data quality. Limitation: yfinance 15-min delay, nsetools unreliable |
| Caching | In-memory dict + TTL | Redis, Memcached | Zero infra. Limitation: lost on restart, no cross-process sharing |
| Auth | Hardcoded "CK" | Auth0, Clerk, NextAuth | Personal tool, no multi-user needed. Limitation: zero security for multi-tenant |
| Testing | None | Jest + Playwright | Max velocity. Limitation: regressions (4 commits in 11 min reverting each other) |
| News | 41 RSS feeds + keyword sentiment | NLP models, paid APIs | Free, comprehensive coverage. Limitation: no semantic understanding, keyword false positives |

### What Would Break at Scale

| Current State | Breaks At | Fix Required |
|--------------|-----------|-------------|
| SQLite | >10 concurrent writers | PostgreSQL + connection pooling |
| In-memory cache | >1 server instance | Redis cluster |
| 6 Groq keys | >180 RPM | Enterprise Groq or self-hosted vLLM |
| Single FastAPI process | >500 concurrent | K8s horizontal pod autoscaler |
| localStorage JWT | >1 user | HttpOnly cookies + refresh tokens |
| yfinance | Real-time requirement | WebSocket market data feed |
| RSS feed parsing | >1000 req/min | Async job queue (Celery/NATS) |
`;

// ─── Mermaid: Scaled Architecture ────────────────────────────────────

export const SCALED_ARCH_DIAGRAM = `graph TB
    subgraph Clients["Client Layer"]
        WEB["Web PWA<br/>Vercel Edge"]
        MOB["Mobile App<br/>React Native"]
        API_C["API Clients<br/>SDK / Webhooks"]
    end

    subgraph Gateway["API Gateway"]
        KONG["Kong / Envoy<br/>Rate limiting<br/>Auth, Routing"]
        WS["WebSocket Gateway<br/>Live price streaming"]
    end

    subgraph Compute["Compute Layer — Kubernetes"]
        CHAT["Chat Service<br/>HPA: 3-50 pods"]
        RESEARCH["Research Service<br/>HPA: 2-20 pods"]
        TRADE["Trade Service<br/>HPA: 2-10 pods"]
        SCAN["Scan Service<br/>CronJob: every 1m"]
    end

    subgraph Queue["Message Queue"]
        KAFKA["Kafka / NATS<br/>100K msg/s<br/>LLM jobs, prices<br/>notifications"]
    end

    subgraph LLM["LLM Layer"]
        VLLM["vLLM / TGI<br/>Self-hosted 70B<br/>GPU inference"]
        GROQ_F["Groq Cloud<br/>Fallback / burst"]
        OR_F["OpenRouter<br/>Gemini deep research"]
    end

    subgraph Storage["Storage Layer"]
        PG["PostgreSQL + Citus<br/>50K QPS<br/>Read replicas"]
        REDIS["Redis Cluster<br/>Sessions, cache<br/>Rate limiting"]
        TS["TimescaleDB<br/>Tick data, OHLCV<br/>10 TB retention"]
        S3["S3 / R2<br/>Reports, snapshots<br/>User uploads"]
    end

    subgraph Observe["Observability"]
        PROM["Prometheus<br/>Metrics"]
        GRAF["Grafana<br/>Dashboards"]
        SENTRY["Sentry<br/>Error tracking"]
        LOKI["Loki<br/>Log aggregation"]
    end

    WEB --> KONG
    MOB --> KONG
    API_C --> KONG
    WEB --> WS
    MOB --> WS

    KONG --> CHAT
    KONG --> RESEARCH
    KONG --> TRADE
    KONG --> SCAN

    CHAT --> KAFKA
    RESEARCH --> KAFKA
    KAFKA --> VLLM
    KAFKA --> GROQ_F
    KAFKA --> OR_F

    CHAT --> PG
    CHAT --> REDIS
    TRADE --> PG
    SCAN --> TS
    WS --> REDIS

    CHAT --> PROM
    RESEARCH --> PROM
    PROM --> GRAF

    style Clients fill:#0A0A0A,stroke:#C9A96E,color:#F5F0EB
    style Gateway fill:#0A0A0A,stroke:#C9A96E,color:#F5F0EB
    style Compute fill:#0A0A0A,stroke:#C9A96E,color:#F5F0EB
    style Queue fill:#0A0A0A,stroke:#C9A96E,color:#F5F0EB
    style LLM fill:#0A0A0A,stroke:#C9A96E,color:#F5F0EB
    style Storage fill:#0A0A0A,stroke:#00FF9D,color:#F5F0EB
    style Observe fill:#0A0A0A,stroke:#C9A96E,color:#F5F0EB`;

export const SCALE_SECTION = `
## 11. System Design for Scale

### Target Load Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Requests per second (RPS) | 10,000 | ~10 (single user) |
| Concurrent users | 50,000 | 1 |
| Data volume | 10 TB | ~50 MB (SQLite) |
| Throughput | 1 GB/s | ~1 MB/s |
| Database QPS | 50,000 | ~100 |
| Message rate | 100,000 msg/s | ~1 msg/s |

### Migration Path: Current → Scaled

#### Phase 1: Multi-User Foundation (10-100 users)
| Change | From | To |
|--------|------|-----|
| Auth | Hardcoded "CK" | Clerk / Auth0 (JWT + refresh tokens) |
| Database | SQLite | PostgreSQL (Supabase or managed RDS) |
| Cache | In-memory dict | Redis (Upstash or managed ElastiCache) |
| Sessions | localStorage | HttpOnly cookies + Redis sessions |

#### Phase 2: Horizontal Scale (100-10K users)
| Change | From | To |
|--------|------|-----|
| Backend | Single Railway instance | Kubernetes (EKS/GKE) with HPA |
| API Gateway | Direct CORS | Kong/Envoy with rate limiting + auth |
| LLM | 6 Groq keys | Enterprise Groq + self-hosted vLLM (70B on A100) |
| Market Data | yfinance polling | WebSocket feed (Dhan WS / vendor) |
| Queue | None | Kafka/NATS for async LLM calls |
| CDN | Vercel default | Cloudflare R2 + CDN for static |

#### Phase 3: Production Scale (10K-50K concurrent)
| Change | From | To |
|--------|------|-----|
| Database | Single PostgreSQL | Citus (distributed) + read replicas |
| Time-series | None | TimescaleDB for tick data (10 TB) |
| Streaming | SSE polling | WebSocket gateway + Redis pub/sub |
| Storage | Local files | S3/R2 for reports, screenshots |
| Observability | Console logs | Prometheus + Grafana + Sentry + Loki |
| Search | Regex intent | Vector DB (Qdrant) + semantic search |

### Key Design Decisions at Scale

**LLM Cost Optimization:**
- Self-host Llama 70B on 2x A100 GPUs (~$3/hr) for 80% of calls
- Groq as burst overflow (free tier for <180 RPM)
- Gemini/Claude only for deep research (pay-per-call)
- Estimated: $0.001/query at 10K RPM vs $0.03/query on GPT-4

**Database Sharding Strategy:**
- Shard by \`user_id\` (conversations, trades, watchlist)
- Global tables (market data, news) on separate read-replica cluster
- TimescaleDB for OHLCV data with automatic 90-day compression

**Real-Time Architecture:**
- WebSocket gateway (Centrifugo / custom Go service)
- Redis pub/sub for price updates (Dhan WS → Redis → WS clients)
- Server-push for alerts, trade fills, earnings surprises

**Message Queue Design:**
- Kafka topics: \`llm.requests\`, \`prices.live\`, \`notifications\`, \`analytics\`
- Consumer groups: LLM workers (auto-scale), notification workers, analytics pipeline
- Dead letter queue for failed LLM calls (retry with backoff)
`;

// ─── Section: What's Next ────────────────────────────────────────────

export const WHATS_NEXT = `
## 12. What's Next

### Near-Term (Next 30 Days)

| Feature | Impact | Complexity |
|---------|--------|-----------|
| **Real-time price streaming** | Biggest retention driver — live LTP in OverviewCard, PortfolioCard | High (WebSocket infra) |
| **Watchlist dashboard** | View saved stocks with price alerts | Medium |
| **Playwright E2E tests** | Prevent regression cycles (4 commits reverting each other) | Medium |
| **Push notifications** | Price alerts, earnings reminders via Web Push API | Medium |

### Medium-Term (60-90 Days)

| Feature | Impact | Complexity |
|---------|--------|-----------|
| **Multi-user auth** | Required for any SaaS revenue | High |
| **PostgreSQL migration** | Required for >1 concurrent user | High |
| **Component library** | Extract \`@stocky/ui\` for consistency | Medium |
| **Semantic intent parser** | Replace brittle regex with vector search | Medium |
| **Options P&L calculator** | Strategy builder with payoff diagrams | High |

### Long-Term (6+ Months)

| Feature | Impact | Complexity |
|---------|--------|-----------|
| **Mobile app** (React Native) | Capture mobile-native UX | Very High |
| **Self-hosted LLM** | Cost reduction at scale, custom fine-tuning | Very High |
| **Paper trading** | Risk-free strategy testing | High |
| **Social features** | Share trades, follow portfolios | High |
| **Algo trading** | Automated strategy execution | Very High |

---

*Built by [Charandeep Kapoor](https://github.com/SirCharan) — IIT Kanpur, NISM certified. Powered by Groq, Gemini, Zerodha, and Dhan.*
`;
