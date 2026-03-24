# Stocky AI — Complete System Documentation

> Every diagram, flow, component, endpoint, and architecture decision in one file.
> All diagrams use [Mermaid](https://mermaid.js.org/) syntax — renders natively on GitHub, Notion, and VS Code.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [6-Agent Stocky Council](#3-6-agent-stocky-council)
4. [Council Debate Sequence](#4-council-debate-sequence)
5. [Council Execution Timeline](#5-council-execution-timeline)
6. [Chat Message Routing](#6-chat-message-routing)
7. [API Endpoint Map](#7-api-endpoint-map)
8. [Frontend Component Tree](#8-frontend-component-tree)
9. [Message Type → Component Mapping](#9-message-type--component-mapping)
10. [Data Sources & Enricher Pipeline](#10-data-sources--enricher-pipeline)
11. [Trade Execution Flow](#11-trade-execution-flow)
12. [SSE Streaming Architecture](#12-sse-streaming-architecture)
13. [Database Schema](#13-database-schema)
14. [Deployment Architecture](#14-deployment-architecture)
15. [Frontend State Management](#15-frontend-state-management)
16. [Feedback & Regeneration Flow](#16-feedback--regeneration-flow)
17. [PWA & Mobile Architecture](#17-pwa--mobile-architecture)
18. [Environment Variables](#18-environment-variables)
19. [LLM Model Strategy](#19-llm-model-strategy)
20. [File Tree](#20-file-tree)

---

## 1. System Overview

```mermaid
graph TB
    subgraph Users["Users"]
        U1["CK on Telegram"]
        U2["CK on Browser<br/>(Desktop + Mobile PWA)"]
    end

    subgraph Railway["Railway — fearless-determination"]
        TG["stocky-ai<br/>Telegram Bot<br/>service: worker"]
        API["stocky-web/backend<br/>FastAPI · 42 routes<br/>service: stocky-web-backend"]
        DB[(SQLite<br/>13 tables)]
    end

    subgraph Vercel["Vercel"]
        FE["stocky-web/frontend<br/>Next.js 16 · React 19<br/>49 components · PWA<br/>llm.stockyai.xyz"]
        LP["stocky-landing<br/>Marketing Site<br/>stockyai.xyz"]
    end

    subgraph AI["AI Models"]
        G70["Groq · llama-3.3-70b<br/>TS · FA · CSO agents<br/>Chat · Analysis"]
        GS["Groq · llama-4-scout<br/>MP · RG · ME agents"]
        GC["Groq · gpt-oss-120b<br/>Conversational context"]
        OR["OpenRouter<br/>Gemini 2.5 Pro fallback"]
    end

    subgraph Data["Market Data"]
        KITE["Zerodha Kite v5<br/>Live quotes · Portfolio<br/>Orders · Margins"]
        YF["yfinance<br/>OHLCV · Fundamentals<br/>Quarterly results"]
        GNEWS["GNews API<br/>Structured news<br/>Sentiment scoring"]
        RSS["33 RSS Feeds<br/>LiveMint · ET Markets<br/>Moneycontrol · CNBC"]
        DHAN["Dhan HQ API<br/>Option chain · PCR<br/>Max pain · IV skew"]
        NSE["NSE India<br/>FII/DII flows<br/>Indices · Bhavcopy"]
    end

    U1 -->|Telegram API| TG
    U2 -->|HTTPS| FE
    FE -->|REST + SSE| API
    API --> DB
    TG --> G70
    TG --> KITE
    TG --> YF
    API --> G70
    API --> GS
    API --> GC
    API --> OR
    API --> KITE
    API --> YF
    API --> GNEWS
    API --> RSS
    API --> DHAN
    API --> NSE

    style API fill:#c9a96e,color:#000
    style FE fill:#3b82f6,color:#fff
    style G70 fill:#3b82f6,color:#fff
    style GS fill:#8b5cf6,color:#fff
```

---

## 2. Technology Stack

```mermaid
graph LR
    subgraph Backend["Backend · Python"]
        FA2["FastAPI 0.115"]
        GROQ2["groq (AsyncGroq) × 6"]
        SQLITE["aiosqlite"]
        YF2["yfinance"]
        HTTPX["httpx"]
        FPDF["fpdf2"]
        FEED["feedparser"]
    end

    subgraph Frontend["Frontend · TypeScript"]
        NEXT["Next.js 16.1"]
        REACT["React 19"]
        TW["Tailwind CSS 4"]
        FM["Framer Motion 12"]
        RADIX["Radix UI<br/>Tooltip · Dialog<br/>Dropdown · ScrollArea"]
        SONNER["Sonner (toasts)"]
        LUCIDE["Lucide React (icons)"]
    end

    subgraph Infra["Infrastructure"]
        RAIL["Railway<br/>Nixpacks · Python 3.12"]
        VERC["Vercel<br/>Edge · ISR"]
        GH["GitHub<br/>SirCharan/twitter"]
    end

    Backend --> RAIL
    Frontend --> VERC
    RAIL --> GH
    VERC --> GH
```

---

## 3. 6-Agent Stocky Council

```mermaid
graph TB
    Q["User Query"] --> CSO1["Step 1 · CSO 🏛️<br/>Query Decomposition<br/>llama-3.3-70b · Key 6"]

    CSO1 --> DE["Step 2 · DataEnricher<br/>Market data fetch<br/>(non-LLM, parallel)"]

    DE --> TS["Step 3 · TS 📊<br/>Technical Analysis<br/>RSI · MACD · S/R levels<br/>llama-3.3-70b · Key 1"]
    DE --> FA3["Step 4 · FA 📈<br/>Fundamental Deep Dive<br/>P/E · ROE · Moat<br/>llama-3.3-70b · Key 2"]
    DE --> MP["Step 5 · MP 📡<br/>Sentiment & News<br/>FII/DII · OI · Events<br/>llama-4-scout · Key 3"]

    TS --> RG["Step 6 · RG 🛡️<br/>Risk & Scenarios<br/>VaR · Position sizing<br/>llama-4-scout · Key 4"]
    FA3 --> RG
    MP --> ME["Step 7 · ME 🌐<br/>Macro Context<br/>RBI · Sector rotation<br/>llama-4-scout · Key 5"]

    RG --> CSO2["Round 2 · CSO<br/>Conflict Detection<br/>+ Rebuttals"]
    ME --> CSO2

    CSO2 --> TRADE["Step 8 · Trade Idea<br/>Entry · Targets · SL · Sizing<br/>R:R ratio"]
    TRADE --> SYNTH["Step 9 · CSO<br/>Final Synthesis<br/>Confidence Score 0-100"]

    SYNTH --> RESULT["CouncilData<br/>Executive Summary<br/>Bull/Bear Cases<br/>Key Risks + Probabilities<br/>Actionable Trade<br/>Sources Verified"]

    style CSO1 fill:#c9a96e,color:#000
    style CSO2 fill:#c9a96e,color:#000
    style SYNTH fill:#c9a96e,color:#000
    style TRADE fill:#c9a96e,color:#000
    style TS fill:#3b82f6,color:#fff
    style FA3 fill:#10b981,color:#fff
    style MP fill:#f59e0b,color:#000
    style RG fill:#ef4444,color:#fff
    style ME fill:#8b5cf6,color:#fff
    style RESULT fill:#1a1a2e,color:#c9a96e,stroke:#c9a96e
```

### Agent Details

| Agent | Short | Model | API Key | Colour | Skills |
|-------|-------|-------|---------|--------|--------|
| Technical Strategist | TS | llama-3.3-70b | GROQ_API_KEY | #3b82f6 | Chart patterns, RSI/MACD/Bollinger, Support/Resistance, Entry/Exit |
| Fundamental Analyst | FA | llama-3.3-70b | GROQ_API_KEY_2 | #10b981 | Financial ratios, Earnings quality, Moat analysis, Valuation |
| Market Pulse Agent | MP | llama-4-scout | GROQ_API_KEY_3 | #f59e0b | News sentiment, FII/DII flows, Options chain, Event risk |
| Risk Guardian | RG | llama-4-scout | GROQ_API_KEY_4 | #ef4444 | Position sizing, Stop-loss logic, VaR, Portfolio impact |
| Macro Economist | ME | llama-4-scout | GROQ_API_KEY_5 | #8b5cf6 | RBI policy, Global cues, Sector rotation, Inflation/FX |
| Chief Synthesis Officer | CSO | llama-3.3-70b | GROQ_API_KEY_6 | #c9a96e | Conflict resolution, Confidence scoring, Final recommendation |

---

## 4. Council Debate Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend (useChat)
    participant API as FastAPI
    participant DE as DataEnricher
    participant CSO as CSO 🏛️
    participant TS2 as TS 📊
    participant FA4 as FA 📈
    participant MP2 as MP 📡
    participant RG2 as RG 🛡️
    participant ME2 as ME 🌐

    U->>FE: Send query (Deep Research mode)
    FE->>API: POST /api/council-research
    Note over FE: Shows CouncilProgressCard

    rect rgb(40, 40, 60)
        Note over API,ME2: ROUND 1: Intelligence Gathering
        API->>CSO: Step 1: Decompose query
        CSO-->>API: Agent tasking plan
        API-->>FE: SSE: council_start + step_start + agent_output

        API->>DE: Step 2: Fetch all market data
        DE-->>API: Quotes + Technicals + News + FII/DII + Options
        API-->>FE: SSE: data_fetch done

        par Parallel Group A (3 keys)
            API->>TS2: Step 3: Technical analysis
            API->>FA4: Step 4: Fundamental deep dive
            API->>MP2: Step 5: Sentiment & news
        end
        TS2-->>API: Technical view
        FA4-->>API: Fundamental view
        MP2-->>API: Market pulse
        API-->>FE: SSE: agent_output ×3

        par Parallel Group B (2 keys)
            API->>RG2: Step 6: Risk & scenarios
            API->>ME2: Step 7: Macro context
        end
        RG2-->>API: Risk assessment
        ME2-->>API: Macro view
        API-->>FE: SSE: agent_output ×2
    end

    rect rgb(60, 40, 40)
        Note over API,ME2: ROUND 2: Debate & Rebuttals
        API->>CSO: Identify conflicts
        CSO-->>API: Conflict list
        API->>RG2: Rebuttal: TS entry level too aggressive
        RG2-->>API: Counter-argument
        API-->>FE: SSE: rebuttal
    end

    rect rgb(40, 60, 40)
        Note over API,CSO: ROUND 3: Final Verdict
        API->>CSO: Step 8: Generate trade idea
        CSO-->>API: Trade setup (entry/SL/targets/sizing)
        API->>CSO: Step 9: Final synthesis
        CSO-->>API: Executive summary + confidence score
        API-->>FE: SSE: result (CouncilData)
    end

    Note over FE: Transitions to CouncilResultCard
    FE->>U: Full report rendered
```

---

## 5. Council Execution Timeline

```mermaid
gantt
    title Council Research (~21 seconds wall-clock)
    dateFormat ss
    axisFormat %Ss

    section Round 1
    CSO Query Decomposition      :cso1, 00, 2s
    DataEnricher Fetch           :data, 01, 3s
    TS Technical Analysis        :ts, 04, 4s
    FA Fundamental Deep Dive     :fa, 04, 4s
    MP Sentiment & News          :mp, 04, 3s
    RG Risk Modeling             :rg, 08, 3s
    ME Macro Context             :me, 08, 3s

    section Round 2
    CSO Conflict Detection       :cso2, 11, 1s
    Rebuttals (1-3)              :reb, 12, 3s

    section Round 3
    CSO Trade Idea               :trade, 15, 3s
    CSO Final Synthesis          :synth, 18, 3s
```

---

## 6. Chat Message Routing

```mermaid
flowchart TD
    A["User sends message"] --> B{"Deep Research<br/>mode active?"}

    B -->|Yes| C["POST /api/council-research"]
    C --> D["6-Agent Council<br/>SSE stream → CouncilProgressCard<br/>→ CouncilResultCard"]

    B -->|No| F["POST /api/chat"]
    F --> G{"Regex parse<br/>(_parse_natural)"}

    G -->|"price X"| H["PriceCard"]
    G -->|"analyse X / how is X"| I["AnalysisCard"]
    G -->|"buy/sell X"| J["TradeConfirmation"]
    G -->|"portfolio/holdings/positions"| K["PortfolioCard / DataTable"]
    G -->|"news"| L["NewsCard"]
    G -->|"overview / market"| M["OverviewCard"]
    G -->|"scan"| N["ScanCard"]
    G -->|"chart"| O["ChartCard"]
    G -->|"compare X Y"| P["CompareCard"]
    G -->|"ipo"| Q["IpoCard"]
    G -->|"macro"| R["MacroCard"]
    G -->|"rrg"| S["RrgCard"]
    G -->|"options / option chain"| T["OptionsCard"]
    G -->|"fii / dii"| U2["FiiDiiCard"]
    G -->|"sectors"| V["SectorsCard"]
    G -->|"earnings"| W["EarningsCard"]
    G -->|"dividends"| X["DividendsCard"]
    G -->|"valuation"| Y["ValuationCard"]
    G -->|"announcements"| Z["AnnouncementsCard"]
    G -->|No regex match| LLM["interpret_intent()<br/>llama-3.3-70b → JSON"]
    LLM --> DISP["Dispatch or<br/>direct text reply"]

    style C fill:#c9a96e,color:#000
    style D fill:#c9a96e,color:#000
```

---

## 7. API Endpoint Map

```mermaid
graph LR
    subgraph Chat["Chat & Research"]
        E1["POST /api/chat"]
        E2["POST /api/council-research"]
        E3["POST /api/deep-research"]
        E4["POST /api/crew-research"]
        E5["POST /api/research"]
    end

    subgraph Market["Market Data"]
        E6["POST /api/scan"]
        E7["POST /api/chart"]
        E8["POST /api/compare"]
        E9["GET /api/ipo"]
        E10["GET /api/macro"]
        E11["GET /api/rrg"]
        E12["GET /api/fii-dii"]
        E13["GET /api/options"]
        E14["GET /api/sectors"]
        E15["GET /api/valuation"]
        E16["GET /api/earnings"]
        E17["GET /api/dividends"]
        E18["GET /api/announcements"]
    end

    subgraph Trading["Trading"]
        E19["POST /api/trade/confirm"]
        E20["GET /api/kite/status"]
        E21["POST /api/kite/login"]
        E22["GET/POST/DELETE /api/alerts"]
    end

    subgraph User["User Features"]
        E23["POST /api/feedback"]
        E24["POST/GET/DELETE /api/watchlist"]
        E25["POST /api/export/pdf"]
        E26["POST/GET /api/share"]
        E27["POST /api/summarise"]
    end

    subgraph System["System"]
        E28["GET/POST/DELETE /api/conversations"]
        E29["POST /api/analytics/track"]
        E30["GET /api/analytics/stats"]
        E31["GET /api/health"]
    end

    style E2 fill:#c9a96e,color:#000
```

### Complete Route List (42 endpoints)

| Method | Path | Handler | Response |
|--------|------|---------|----------|
| POST | `/api/chat` | `chat()` | JSON (ChatResponse) |
| POST | `/api/council-research` | `council_research_endpoint()` | SSE stream |
| POST | `/api/deep-research` | `deep_research_general()` | SSE stream |
| POST | `/api/crew-research` | `crew_research_endpoint()` | SSE stream |
| POST | `/api/research` | `research_stream()` | SSE stream |
| POST | `/api/trade/confirm` | `trade_action()` | JSON |
| POST | `/api/scan` | `scan_endpoint()` | JSON |
| POST | `/api/chart` | `chart_endpoint()` | JSON |
| POST | `/api/compare` | `compare_endpoint()` | JSON |
| GET | `/api/ipo` | `ipo_endpoint()` | JSON |
| GET | `/api/macro` | `macro_endpoint()` | JSON |
| GET | `/api/rrg` | `rrg_endpoint()` | JSON |
| GET | `/api/fii-dii` | `fii_dii_endpoint()` | JSON |
| GET | `/api/options` | `options_endpoint()` | JSON |
| GET | `/api/sectors` | `sectors_endpoint()` | JSON |
| GET | `/api/valuation` | `valuation_endpoint()` | JSON |
| GET | `/api/earnings` | `earnings_endpoint()` | JSON |
| GET | `/api/dividends` | `dividends_endpoint()` | JSON |
| GET | `/api/announcements` | `announcements_endpoint()` | JSON |
| POST | `/api/feedback` | `submit_feedback()` | JSON |
| POST | `/api/watchlist` | `add_watchlist()` | JSON |
| GET | `/api/watchlist` | `get_watchlist_endpoint()` | JSON |
| DELETE | `/api/watchlist/{symbol}` | `remove_watchlist()` | JSON |
| POST | `/api/export/pdf` | `export_pdf_endpoint()` | PDF binary |
| POST | `/api/share` | `create_share_endpoint()` | JSON |
| GET | `/api/share/{id}` | `get_share_endpoint()` | JSON |
| POST | `/api/summarise` | `summarise_endpoint()` | JSON |
| GET | `/api/conversations` | `list_conversations()` | JSON |
| GET | `/api/conversations/{id}` | `get_conversation()` | JSON |
| DELETE | `/api/conversations/{id}` | `remove_conversation()` | JSON |
| GET | `/api/kite/status` | `kite_status()` | JSON |
| POST | `/api/kite/login` | `kite_login()` | JSON |
| GET | `/api/alerts` | `list_alerts()` | JSON |
| POST | `/api/alerts` | `create_alert_endpoint()` | JSON |
| DELETE | `/api/alerts/{id}` | `delete_alert_endpoint()` | JSON |
| POST | `/api/analytics/track` | `log_analytics_compat()` | JSON |
| GET | `/api/analytics/stats` | `analytics_stats()` | JSON |
| GET | `/api/health` | `health()` | JSON |

---

## 8. Frontend Component Tree

```mermaid
graph TD
    SHELL["ChatShell.tsx<br/>Root layout · PWA · Sidebar · Nav"]
    SHELL --> BOOT["TerminalLoadingScreen<br/>Matrix rain · Boot log · Glitch"]
    SHELL --> PWA2["PWAProvider + PWAInstallDialog"]
    SHELL --> SB["Sidebar<br/>Conversation history"]
    SHELL --> MH["MobileHeader<br/>Hamburger · Logo · New"]
    SHELL --> CW["ChatWindow<br/>Main chat container"]
    SHELL --> MBN["MobileBottomNav<br/>5 tabs: Chat · Portfolio · Markets · Research · Tools"]
    SHELL --> TOAST2["Sonner Toaster"]

    CW --> HDR2["Header<br/>Desktop: logo + links + feedback + new"]
    CW --> FB2["FeatureBar<br/>Chip categories: Quick · Research · Markets · Data · Tools"]
    CW --> FP2["FeaturePanel<br/>Parameter inputs for features"]
    CW --> MSGS["MessageBubble × N<br/>Routes to 34 card types"]
    CW --> SC3["SuggestionChips<br/>Dynamic follow-up pills"]
    CW --> THINK["ThinkingScreen<br/>Terminal-style thinking indicator"]
    CW --> SKEL["SkeletonCard<br/>Type-specific loading shimmers"]
    CW --> CI2["ChatInput<br/>Mode toggle · Textarea · Send/Stop"]
    CW --> CMD2["CommandPalette<br/>Cmd+K quick actions"]

    MSGS --> MA2["MessageActions<br/>Copy · Regenerate ▾ · Thumbs ↑↓ · Context pills"]
    MA2 --> FTM2["FeedbackTagsModal<br/>Quick tags + free text → /api/feedback"]

    MSGS --> CARDS["34 Card Components"]

    style SHELL fill:#1a1a2e,color:#c9a96e,stroke:#c9a96e
    style CW fill:#1a1a2e,color:#fff,stroke:#3b82f6
```

### All 49 Components

| Category | Components |
|----------|-----------|
| **Core** | ChatWindow, ChatInput, MessageBubble, MessageActions, Sidebar, Header, MobileHeader |
| **Council** | CouncilProgressCard, CouncilResultCard |
| **Analysis** | AnalysisCard, DeepResearchCard, AgentDebateCard, DebateProgressCard |
| **Market** | OverviewCard, NewsCard, ScanCard, ChartCard, CompareCard |
| **Data** | OptionsCard, FiiDiiCard, SectorsCard, EarningsCard, DividendsCard, ValuationCard, AnnouncementsCard |
| **Trading** | TradeConfirmation, PortfolioCard, PriceCard, DataTable |
| **Navigation** | FeatureBar, FeaturePanel, MobileBottomNav, CommandPalette, SuggestionChips, SuggestionCard |
| **Loading** | SkeletonCard, ThinkingScreen, TerminalLoadingScreen, ProgressCard, TypingIndicator |
| **UI** | FeedbackModal, FeedbackTagsModal, Confetti, ErrorBoundary, MarkdownRich |
| **PWA** | PWAProvider, PWAInstallDialog |
| **Primitives** | ui/CardWrapper, ui/Tooltip, ui/Dialog, ui/ScrollArea |

---

## 9. Message Type → Component Mapping

```mermaid
graph LR
    subgraph Types["34 Message Types"]
        direction TB
        T1["text"] --> C1["MarkdownRich"]
        T2["analysis"] --> C2["AnalysisCard"]
        T3["overview"] --> C3["OverviewCard"]
        T4["news"] --> C4["NewsCard"]
        T5["portfolio"] --> C5["PortfolioCard"]
        T6["scan"] --> C6["ScanCard"]
        T7["chart"] --> C7["ChartCard"]
        T8["compare"] --> C8["CompareCard"]
        T9["council_progress"] --> C9["CouncilProgressCard"]
        T10["council_debate"] --> C10["CouncilResultCard"]
        T11["options"] --> C11["OptionsCard"]
        T12["fii_dii"] --> C12["FiiDiiCard"]
        T13["trade_confirm"] --> C13["TradeConfirmation"]
        T14["ipo"] --> C14["IpoCard"]
        T15["macro"] --> C15["MacroCard"]
        T16["rrg"] --> C16["RrgCard"]
        T17["sectors"] --> C17["SectorsCard"]
        T18["earnings"] --> C18["EarningsCard"]
        T19["dividends"] --> C19["DividendsCard"]
        T20["valuation"] --> C20["ValuationCard"]
        T21["announcements"] --> C21["AnnouncementsCard"]
        T22["positions/holdings/orders/margins"] --> C22["DataTable"]
        T23["price"] --> C23["PriceCard"]
        T24["deep_research"] --> C24["DeepResearchCard"]
        T25["agent_debate/debate_progress"] --> C25["AgentDebateCard"]
    end

    style T9 fill:#c9a96e,color:#000
    style T10 fill:#c9a96e,color:#000
```

**Full MessageType union (34 types):**
```
text | analysis | portfolio | positions | holdings | orders | margins | price
news | overview | trade_confirm | order_result | alerts | usage | error
deep_research | progress | scan | chart | compare | ipo | macro | rrg
suggestion | agent_debate | debate_progress | earnings | dividends | sectors
valuation | announcements | fii_dii | options | council_progress | council_debate
```

---

## 10. Data Sources & Enricher Pipeline

```mermaid
flowchart TB
    subgraph Sources["External Data Sources"]
        KITE3["Zerodha Kite v5<br/>Live quotes · OHLC · Volume<br/>Portfolio · Orders · Margins"]
        YF3["yfinance<br/>1Y OHLCV · Fundamentals<br/>Quarterly · Shareholding"]
        GN2["GNews API<br/>Structured news (100/day)<br/>Indian market focus"]
        RSS3["33 RSS Feeds<br/>LiveMint · ET Markets<br/>Moneycontrol · CNBC<br/>Reuters · BBC"]
        DHAN3["Dhan HQ API<br/>Full option chain<br/>PCR · Max pain · IV skew"]
        NSE3["NSE India<br/>FII/DII cash flows<br/>F&O participant OI<br/>NSDL FPI data"]
    end

    subgraph Enricher["DataEnricher Service<br/>(data_enricher.py)"]
        GQ["get_quote()"]
        GH2["get_historical()"]
        GT["get_technicals()<br/>RSI · MACD · SMA · Bollinger"]
        GF["get_fundamentals()<br/>P/E · ROE · D/E · margins"]
        GN3["get_news()<br/>GNews → RSS fallback"]
        GOC["get_option_chain()<br/>PCR · max pain · OI"]
        GFD["get_fii_dii()"]
        EFC["enrich_for_council()<br/>All above in parallel"]
    end

    subgraph Cache["In-Memory Cache"]
        C60["Quotes<br/>TTL: 60s"]
        C300["Technicals + Fundamentals<br/>TTL: 300s"]
        C600["News + FII/DII<br/>TTL: 600s"]
        C120["Options<br/>TTL: 120s"]
    end

    KITE3 --> GQ
    YF3 --> GQ
    YF3 --> GH2
    YF3 --> GT
    YF3 --> GF
    GN2 --> GN3
    RSS3 --> GN3
    DHAN3 --> GOC
    NSE3 --> GFD

    GQ --> C60
    GT --> C300
    GF --> C300
    GN3 --> C600
    GOC --> C120
    GFD --> C600

    EFC --> |"Parallel asyncio.gather"| Cache

    Cache --> |"CouncilContext dict"| AGENTS2["6 Council Agents"]

    style Enricher fill:#1a1a2e,color:#c9a96e,stroke:#c9a96e
```

---

## 11. Trade Execution Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as Backend
    participant K as Kite API

    U->>FE: "buy 10 TCS at 3500"
    FE->>API: POST /api/chat
    API->>API: _parse_natural → buy intent
    API->>API: Create pending_action in DB

    API-->>FE: trade_confirm (TradeConfirmation card)
    Note over FE: Shows symbol, qty, price<br/>Confirm / Cancel buttons

    alt Confirm
        U->>FE: Click Confirm
        FE->>API: POST /api/trade/confirm {action_id}
        API->>K: place_order(TCS, BUY, 10, LIMIT, 3500)
        K-->>API: order_id: 240324000012345
        API->>API: Log to trade_history
        API-->>FE: order_result + Confetti animation
    else Cancel
        U->>FE: Click Cancel
        FE->>API: POST /api/trade/confirm {action_id, cancel}
        API-->>FE: "Order cancelled" toast
    end
```

---

## 12. SSE Streaming Architecture

```mermaid
sequenceDiagram
    participant FE as useChat.ts
    participant API as FastAPI
    participant CH as Council Handler
    participant DE2 as DataEnricher
    participant G as Groq API × 6

    FE->>API: POST /api/council-research {query}
    API->>CH: stream_council_debate(query)

    CH-->>API: yield {"type": "council_start", "agents": [...]}
    API-->>FE: SSE event

    CH->>G: council_call("CSO", step1_prompt)
    CH-->>API: yield {"type": "step_start", "step": 1}
    CH-->>API: yield {"type": "agent_thinking", "agent": "CSO"}
    G-->>CH: CSO response
    CH-->>API: yield {"type": "agent_output", "agent": "CSO", "elapsed": 1.8}
    API-->>FE: SSE events (FE updates CouncilProgressCard)

    CH->>DE2: enrich_for_council(query, tickers)
    DE2-->>CH: CouncilContext
    CH-->>API: yield {"type": "data_fetch", "status": "done"}

    par 3 agents in parallel
        CH->>G: council_call("TS", tech_prompt)
        CH->>G: council_call("FA", fund_prompt)
        CH->>G: council_call("MP", pulse_prompt)
    end

    Note over CH,G: Results arrive as each completes

    CH-->>API: yield {"type": "result", "data": CouncilData}
    CH-->>API: yield {"type": "done"}
    API-->>FE: Final SSE events

    Note over FE: Transitions message type:<br/>council_progress → council_debate<br/>Renders CouncilResultCard
```

---

## 13. Database Schema

```mermaid
erDiagram
    conversations {
        text id PK
        text user_id
        text session_id
        text role "user | assistant"
        text content
        text type "34 message types"
        text structured_data "JSON blob"
        datetime created_at
    }

    pending_actions {
        text action_id PK
        text user_id
        text action_type "buy | sell"
        text params "JSON: symbol, qty, price"
        text status "pending | confirmed | cancelled"
        datetime created_at
    }

    trade_history {
        integer id PK
        text user_id
        text symbol
        text txn_type
        integer quantity
        real price
        text order_id
        text status
        datetime executed_at
    }

    watchlist {
        integer id PK
        text symbol UK
        text notes
        datetime added_at
    }

    feedback {
        integer id PK
        text message_id
        text conversation_id
        text query
        text response_snippet
        text rating "up | down"
        text tags "JSON array"
        text comment
        datetime created_at
    }

    alerts {
        integer id PK
        text user_id
        text symbol
        text condition "above | below"
        real target_price
        text status "active | triggered | cancelled"
        datetime created_at
    }

    shared_snapshots {
        text id PK
        text card_type
        text data "JSON"
        datetime created_at
        datetime expires_at
    }

    api_call_log {
        text service
        text endpoint
        integer tokens
        datetime ts
    }

    analytics_events {
        integer id PK
        text event_type
        text event_name
        text metadata "JSON"
        datetime created_at
    }

    kite_session {
        text user_id PK
        text access_token
        text login_time
    }

    user_facts {
        integer id PK
        text user_id
        text fact
        datetime created_at
    }

    conversations ||--o{ feedback : "has feedback"
    conversations ||--o{ pending_actions : "creates"
    pending_actions ||--o| trade_history : "executes"
```

---

## 14. Deployment Architecture

```mermaid
graph TB
    subgraph GitHub["GitHub · SirCharan/twitter"]
        MAIN["main branch"]
        BRANCH2["SirCharan/stocky-ai-tg-bot<br/>(working branch)"]
    end

    subgraph Railway2["Railway · fearless-determination"]
        RBE["stocky-web-backend<br/>FastAPI · Python 3.12<br/>Nixpacks · Auto-deploy"]
        RWK["worker<br/>Telegram bot<br/>Auto-deploy"]
        RDB["Persistent volume<br/>SQLite DB files"]
    end

    subgraph Vercel2["Vercel · sircharans-projects"]
        VFE2["stocky-ai project<br/>Next.js 16<br/>Root: stocky-web/frontend<br/>Domain: llm.stockyai.xyz"]
        VLP2["stocky-landing project<br/>Separate repo<br/>Domain: stockyai.xyz"]
    end

    subgraph DNS["DNS · Cloudflare"]
        D1["llm.stockyai.xyz → Vercel"]
        D2["stockyai.xyz → Vercel"]
        D3["terminal.stockyai.xyz → ?"]
    end

    BRANCH2 -->|"auto-deploy on push"| RBE
    BRANCH2 -->|"auto-deploy on push"| RWK
    BRANCH2 -->|"push to main"| MAIN
    MAIN -->|"npx vercel --prod"| VFE2

    RBE --> RDB
    RWK --> RDB

    VFE2 --> D1
    VLP2 --> D2

    style BRANCH2 fill:#c9a96e,color:#000
```

---

## 15. Frontend State Management

```mermaid
graph TD
    subgraph useChat["useChat.ts — Central State"]
        MSG2["messages: ChatMessage[]"]
        LOAD["isLoading: boolean"]
        CONV["conversationId: string | null"]
        ABORT["abortControllerRef"]
    end

    subgraph Functions["Exported Functions"]
        SM["sendMessage(text)"]
        SDR["streamDeepResearch(stock, mode)"]
        SGDR["streamGeneralDeepResearch(query)"]
        SCR["streamCouncilResearch(query)"]
        HTA["handleTradeAction(id, action)"]
        LC["loadConversation(id)"]
        NC["newChat()"]
        RLA["removeLastAssistant()"]
        SG["stopGeneration()"]
    end

    subgraph Consumers["Components That Consume State"]
        CW2["ChatWindow"]
        CI3["ChatInput"]
        MB["MessageBubble × N"]
        MA3["MessageActions"]
        SC4["SuggestionChips"]
    end

    useChat --> Functions
    Functions --> |"via ChatShell props"| Consumers

    SM -->|"POST /api/chat"| API2["Backend"]
    SCR -->|"POST /api/council-research"| API2
    SDR -->|"POST /api/research"| API2
    SG -->|"AbortController.abort()"| ABORT

    style SCR fill:#c9a96e,color:#000
```

---

## 16. Feedback & Regeneration Flow

```mermaid
flowchart TD
    A["User sees AI response"] --> B["MessageActions bar appears"]

    B --> C["📋 Copy"]
    C --> C1["navigator.clipboard.writeText()"]
    C1 --> C2["✓ icon morph + toast"]

    B --> D["🔄 Regenerate ▾ dropdown"]
    D --> D1["Regenerate Same<br/>removeLastAssistant() + resend"]
    D --> D2["Deeper Analysis<br/>removeLastAssistant() + force deep"]
    D --> D3["Council Debate<br/>removeLastAssistant() + streamCouncilResearch()"]

    B --> E["👍 Thumbs Up"]
    E --> E1["POST /api/feedback<br/>rating: 'up'"]
    E1 --> E2["Icon fills green + toast"]

    B --> F["👎 Thumbs Down"]
    F --> F1["FeedbackTagsModal opens"]
    F1 --> F2["Select tags:<br/>Missing data · Wrong analysis<br/>Too vague · Risks ignored · Outdated"]
    F2 --> F3["Optional comment"]
    F3 --> F4["POST /api/feedback<br/>rating: 'down', tags: [...], comment"]
    F4 --> F5["Icon fills red + 'Feedback recorded' toast"]

    B --> G["Context Pills (per type)"]
    G --> G1["analysis → Trade · Compare · Council Deep Dive"]
    G --> G2["council_debate → Execute · Ask TS · Ask RG"]
    G --> G3["news → Summarise · Council Deep Dive"]
    G --> G4["overview → Sector Rotation · Council Deep Dive"]

    style D3 fill:#c9a96e,color:#000
```

---

## 17. PWA & Mobile Architecture

```mermaid
graph TD
    subgraph Mobile["Mobile Experience"]
        MH2["MobileHeader<br/>☰ Sidebar · Logo · + New"]
        CW3["ChatWindow<br/>hideHeaderOnMobile=true"]
        FAB["Deep Research FAB<br/>Floating toggle above nav"]
        INP["ChatInput<br/>Fixed above bottom nav<br/>safe-area-inset-bottom"]
        NAV["MobileBottomNav<br/>💬 Chat · 📊 Portfolio · 📈 Markets<br/>🔬 Research · 🧰 Tools"]
    end

    subgraph PWA3["PWA Features"]
        SW["Service Worker<br/>next-pwa"]
        MANIFEST["manifest.json<br/>name: Stocky AI<br/>theme: #0A0A0A"]
        INSTALL["PWAInstallDialog<br/>Terminal-styled prompt<br/>Shows 800ms after boot"]
        IOS["iOS detection<br/>Manual install instructions"]
    end

    subgraph Boot["Boot Sequence"]
        B1["TerminalLoadingScreen<br/>4.2s minimum"]
        B2["Matrix rain canvas"]
        B3["9-line boot log typewriter"]
        B4["Progress bar 0-100%"]
        B5["Random glitch effects"]
        B6["Click to skip"]
    end

    Boot --> Mobile
    PWA3 --> Mobile

    style NAV fill:#1a1a2e,color:#c9a96e,stroke:#c9a96e
```

---

## 18. Environment Variables

```mermaid
graph TD
    subgraph Trading["Trading APIs"]
        K1["KITE_API_KEY"]
        K2["KITE_API_SECRET"]
        K3["KITE_USER_ID"]
        K4["KITE_PASSWORD"]
        K5["KITE_TOTP_SECRET"]
        D1b["DHAN_CLIENT_ID"]
        D2b["DHAN_ACCESS_TOKEN"]
    end

    subgraph AI2["AI / LLM"]
        G1["GROQ_API_KEY → TS agent"]
        G2["GROQ_API_KEY_2 → FA agent"]
        G3["GROQ_API_KEY_3 → MP agent"]
        G4["GROQ_API_KEY_4 → RG agent"]
        G5["GROQ_API_KEY_5 → ME agent"]
        G6["GROQ_API_KEY_6 → CSO agent"]
        GM["GROQ_MODEL<br/>llama-3.3-70b-versatile"]
        GT2["GROQ_TRIAD_MODEL<br/>llama-4-scout"]
        GCH["GROQ_COUNCIL_MODEL_HEAVY<br/>llama-3.3-70b"]
        GCL["GROQ_COUNCIL_MODEL_LIGHT<br/>llama-4-scout"]
        OR2["OPENROUTER_API_KEY"]
        ORM["OPENROUTER_MODEL<br/>gemini-2.5-pro"]
    end

    subgraph External2["External"]
        GN4["GNEWS_API_KEY"]
    end

    subgraph App["Application"]
        WSK["WEB_SECRET_KEY"]
        DBP["DB_PATH"]
        AO["ALLOWED_ORIGINS"]
    end
```

---

## 19. LLM Model Strategy

```mermaid
graph TD
    subgraph Critical["Critical Analysis (70b)"]
        TS3["TS · Technical Strategist<br/>Chart patterns need precision"]
        FA5["FA · Fundamental Analyst<br/>Financial analysis needs depth"]
        CSO3["CSO · Chief Synthesis Officer<br/>Synthesis quality matters most"]
        CHAT3["General chat routing"]
        INTENT2["Intent parsing"]
    end

    subgraph Speed["Speed Roles (scout)"]
        MP3["MP · Market Pulse Agent<br/>News aggregation, sentiment"]
        RG3["RG · Risk Guardian<br/>Risk calculations, sizing"]
        ME3["ME · Macro Economist<br/>Macro context"]
        TRIAD3["Triad agents (legacy)"]
        CREW3["Crew agents (legacy)"]
    end

    subgraph Fallback["Fallback"]
        CONV3["Conversational context<br/>gpt-oss-120b via Groq"]
        GEM["Complex queries<br/>Gemini 2.5 Pro via OpenRouter"]
    end

    style Critical fill:#3b82f6,color:#fff
    style Speed fill:#8b5cf6,color:#fff
    style Fallback fill:#6b7280,color:#fff
```

---

## 20. File Tree

```
osaka/
├── stocky-ai/                    Telegram bot
│   ├── bot/
│   │   ├── main.py               Entry point
│   │   ├── ai_client.py          Groq integration
│   │   ├── kite_auth.py          TOTP auto-login
│   │   ├── kite_client.py        Kite wrapper
│   │   ├── database.py           SQLite
│   │   └── handlers/             Command handlers
│   └── requirements.txt
│
├── stocky-web/
│   ├── backend/                  FastAPI REST API
│   │   ├── app/
│   │   │   ├── main.py           42 routes
│   │   │   ├── ai_client.py      6 Groq clients
│   │   │   ├── config.py         25+ env vars
│   │   │   ├── database.py       13 tables
│   │   │   ├── kite_client.py    Zerodha wrapper
│   │   │   ├── handlers/         29 handler modules
│   │   │   │   ├── chat.py       Main chat routing
│   │   │   │   ├── council.py    6-Agent Council ★
│   │   │   │   ├── agent_debate.py  3-Agent Triad
│   │   │   │   ├── crew_research.py 7-Agent Crew
│   │   │   │   ├── analyse.py    Stock analysis
│   │   │   │   ├── overview.py   Market overview
│   │   │   │   ├── news.py       RSS + GNews
│   │   │   │   ├── trading.py    Order execution
│   │   │   │   ├── options.py    Option chain (Dhan)
│   │   │   │   ├── fii_dii.py    FII/DII flows
│   │   │   │   ├── scan.py       Market scanning
│   │   │   │   ├── chart.py      TradingView charts
│   │   │   │   ├── compare.py    Stock comparison
│   │   │   │   ├── ipo.py        IPO tracker
│   │   │   │   ├── macro.py      Macro dashboard
│   │   │   │   ├── rrg.py        Sector rotation
│   │   │   │   ├── sectors.py    Sector performance
│   │   │   │   ├── earnings.py   Earnings calendar
│   │   │   │   ├── dividends.py  Dividend data
│   │   │   │   ├── valuation.py  Market PE/PB
│   │   │   │   ├── announcements.py Corporate actions
│   │   │   │   ├── watchlist.py  Watchlist CRUD
│   │   │   │   ├── export_pdf.py PDF generation
│   │   │   │   ├── share.py      Shareable links
│   │   │   │   ├── portfolio.py  Holdings/positions
│   │   │   │   ├── market.py     Price quotes
│   │   │   │   ├── alerts.py     Price alerts
│   │   │   │   └── deep_research.py  Legacy research
│   │   │   ├── services/
│   │   │   │   └── data_enricher.py  Unified data layer ★
│   │   │   └── prompts/
│   │   │       ├── __init__.py   Base + crew prompts
│   │   │       ├── orchestrator.py  Chat orchestrator
│   │   │       └── council.py    6 agent prompts ★
│   │   ├── .env                  Credentials (gitignored)
│   │   └── requirements.txt
│   │
│   └── frontend/                 Next.js 16 chat UI
│       ├── public/               Static assets
│       └── src/
│           ├── app/
│           │   ├── chat/
│           │   │   ├── ChatShell.tsx       Root layout ★
│           │   │   ├── components/        49 components
│           │   │   │   ├── ChatWindow.tsx  Main container
│           │   │   │   ├── ChatInput.tsx   Mode toggle + input
│           │   │   │   ├── MessageBubble.tsx  Card router
│           │   │   │   ├── MessageActions.tsx Copy/regen/feedback
│           │   │   │   ├── CouncilProgressCard.tsx  Live progress ★
│           │   │   │   ├── CouncilResultCard.tsx    Final report ★
│           │   │   │   ├── FeedbackTagsModal.tsx    Thumbs down tags
│           │   │   │   └── ... (42 more)
│           │   │   └── hooks/
│           │   │       ├── useChat.ts      State + streaming ★
│           │   │       ├── useConversations.ts
│           │   │       ├── useMediaQuery.ts
│           │   │       └── usePWAInstall.ts
│           │   └── ...
│           └── lib/
│               ├── types.ts       34 message types
│               ├── api.ts         42 API functions
│               ├── cn.ts          Class utility
│               └── analytics.ts   Event tracking
│
├── stocky-landing/               Marketing site
│
├── everything.md                 This file ★
├── README.md                     Project overview
├── ai.md                         Deep Research architecture
├── llm.md                        LLM models & routing
├── architecture.md               Visual Mermaid diagrams
├── system-flow.md                End-to-end flowcharts
├── summary.md                    Full technical reference
├── llm.txt                       AI-readable project summary
├── agents.txt                    AI agent navigation guide
└── CLAUDE.md                     Landing page deploy rules
```

---

*Built by [Charandeep Kapoor](https://charandeepkapoor.com) · [stockyai.xyz](https://stockyai.xyz) · March 2026*
