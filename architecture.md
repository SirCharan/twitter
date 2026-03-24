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

    subgraph Railway["Railway — fearless-determination"]
        TG["stocky-ai · Telegram Bot<br/>service: worker"]
        API["stocky-web/backend · FastAPI<br/>service: stocky-web-backend<br/>29 handlers · 34 routes"]
    end

    subgraph Vercel
        FE["stocky-web/frontend<br/>Next.js 16 · React 19<br/>49 components · PWA<br/>llm.stockyai.xyz"]
        LP["stocky-landing<br/>Marketing Site<br/>stockyai.xyz"]
    end

    subgraph AI["AI Models"]
        GROQ["Groq API × 6 keys<br/>llama-3.3-70b · llama-4-scout"]
        OR["OpenRouter<br/>Gemini 2.5 Pro"]
    end

    subgraph Data["Market Data Sources"]
        KITE["Zerodha Kite v5<br/>Live quotes · Portfolio · Orders"]
        YF["yfinance<br/>OHLCV · Fundamentals · Quarterly"]
        GNEWS["GNews API<br/>Structured news · Sentiment"]
        RSS["33 RSS Feeds<br/>Indian financial news"]
        DHAN["Dhan HQ API<br/>Option chain · Live prices"]
        NSE["NSE India<br/>FII/DII · Indices · Bhavcopy"]
    end

    U1 -->|Telegram| TG
    U2 -->|HTTPS| FE
    FE -->|REST + SSE| API
    TG --> GROQ
    TG --> KITE
    TG --> YF
    API --> GROQ
    API --> OR
    API --> KITE
    API --> YF
    API --> GNEWS
    API --> RSS
    API --> DHAN
    API --> NSE

    style API fill:#c9a96e,color:#000,stroke:#c9a96e
    style FE fill:#3b82f6,color:#fff,stroke:#3b82f6
```

---

## 2. 6-Agent Council Architecture

```mermaid
graph TB
    Q[User Query] --> CSO1["Step 1: CSO<br/>Query Decomposition"]
    CSO1 --> DE["Step 2: DataEnricher<br/>Market data fetch"]

    DE --> TS["Step 3: Technical Strategist<br/>RSI · MACD · S/R levels<br/>llama-3.3-70b · Key 1"]
    DE --> FA["Step 4: Fundamental Analyst<br/>P/E · ROE · Moat<br/>llama-3.3-70b · Key 2"]
    DE --> MP["Step 5: Market Pulse<br/>Sentiment · FII/DII · OI<br/>llama-4-scout · Key 3"]

    TS --> RG["Step 6: Risk Guardian<br/>VaR · Position sizing · SL<br/>llama-4-scout · Key 4"]
    FA --> RG
    MP --> ME["Step 7: Macro Economist<br/>RBI · Sector rotation · Crude<br/>llama-4-scout · Key 5"]

    RG --> CSO2["Round 2: CSO<br/>Conflict Detection + Rebuttals"]
    ME --> CSO2

    CSO2 --> TRADE["Step 8: Trade Idea<br/>Entry · Targets · SL · Sizing"]
    TRADE --> SYNTH["Step 9: CSO<br/>Final Synthesis<br/>Confidence Score 0-100"]

    SYNTH --> RESULT["CouncilData<br/>Executive Summary · Bull/Bear<br/>Risks · Trade · Sources"]

    style CSO1 fill:#c9a96e,color:#000
    style CSO2 fill:#c9a96e,color:#000
    style SYNTH fill:#c9a96e,color:#000
    style TS fill:#3b82f6,color:#fff
    style FA fill:#10b981,color:#fff
    style MP fill:#f59e0b,color:#000
    style RG fill:#ef4444,color:#fff
    style ME fill:#8b5cf6,color:#fff
```

---

## 3. Chat Dispatch (NLP → Handler)

```mermaid
flowchart TD
    MSG[POST /api/chat] --> RE{Regex parse}

    RE -->|price X| PH[price handler]
    RE -->|analyse X| AH[analyse handler]
    RE -->|buy/sell X| TH[trade handler]
    RE -->|portfolio| POH[portfolio handler]
    RE -->|news| NH[news handler]
    RE -->|overview/market| OH[overview handler]
    RE -->|scan X| SH[scan handler]
    RE -->|chart X| CH[chart handler]
    RE -->|compare X Y| CPH[compare handler]
    RE -->|ipo| IH[ipo handler]
    RE -->|macro| MH[macro handler]
    RE -->|options X| OPH[options handler]
    RE -->|fii dii| FDH[fii_dii handler]
    RE -->|sectors| SEC[sectors handler]
    RE -->|earnings| EH[earnings handler]
    RE -->|dividends| DH[dividends handler]
    RE -->|valuation| VH[valuation handler]
    RE -->|No match| LLM

    LLM["interpret_intent()<br/>llama-3.3-70b<br/>JSON: {intent, args, reply}"]
    LLM --> DISP[Dispatch to matched handler]
    LLM --> TEXT[Direct text reply]

    PH --> R1[PriceCard]
    AH --> R2[AnalysisCard]
    TH --> R3[TradeConfirmation]
    NH --> R4[NewsCard]
    OH --> R5[OverviewCard]
```

---

## 4. Frontend Component Architecture

```mermaid
graph TD
    subgraph Shell["ChatShell.tsx"]
        BOOT[TerminalLoadingScreen]
        PWA[PWAProvider]
        SIDEBAR[Sidebar]
        MHDR[MobileHeader]
        MNAV[MobileBottomNav]
    end

    subgraph Window["ChatWindow.tsx"]
        HDR[Header]
        FBAR[FeatureBar + FeaturePanel]
        MSGS["Messages (MessageBubble × N)"]
        CHIPS[SuggestionChips]
        THINK[ThinkingScreen]
        INPUT[ChatInput]
        CMD[CommandPalette]
    end

    subgraph Cards["34 Message Type Cards"]
        COUNCIL["CouncilProgressCard<br/>CouncilResultCard"]
        ANALYSIS["AnalysisCard · OverviewCard<br/>NewsCard · ScanCard"]
        MARKET["ChartCard · CompareCard<br/>IpoCard · MacroCard · RrgCard"]
        DATA2["OptionsCard · FiiDiiCard<br/>SectorsCard · EarningsCard"]
        TRADE2["TradeConfirmation<br/>PortfolioCard · DataTable"]
    end

    subgraph Actions["Message Actions"]
        COPY[Copy]
        REGEN["Regenerate ▾<br/>Same · Deeper · Council"]
        THUMB["Thumbs ↑↓<br/>+ FeedbackTagsModal"]
        CTX["Context pills<br/>Trade · Compare · Deep Dive"]
    end

    Shell --> Window
    Window --> MSGS
    MSGS --> Cards
    MSGS --> Actions

    style COUNCIL fill:#c9a96e,color:#000
```

---

## 5. Data Enricher Pipeline

```mermaid
graph LR
    subgraph Sources["Data Sources (Priority Order)"]
        K[Kite API] --> |live quotes| Q[Quotes]
        Y[yfinance] --> |fallback quotes| Q
        Y --> |OHLCV| T[Technicals]
        Y --> |ticker.info| F[Fundamentals]
        G[GNews API] --> |structured| N[News]
        R[RSS 33 feeds] --> |fallback| N
        D[Dhan API] --> |option chain| O[Options]
        NSE2[NSE India] --> |flows| FD[FII/DII]
    end

    subgraph Cache["In-Memory Cache"]
        Q --> |TTL 60s| C1[Quote Cache]
        T --> |TTL 300s| C2[Technical Cache]
        F --> |TTL 300s| C3[Fundamental Cache]
        N --> |TTL 600s| C4[News Cache]
        O --> |TTL 120s| C5[Options Cache]
        FD --> |TTL 600s| C6[FII/DII Cache]
    end

    Cache --> |enrich_for_council| AGENTS[6 Council Agents]
```

---

## 6. Trade Execution Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as Backend
    participant K as Kite API

    U->>FE: "buy 10 TCS at 3500"
    FE->>API: POST /api/chat
    API->>API: Parse intent → buy TCS 10 3500

    API-->>FE: trade_confirm card
    Note over FE: TradeConfirmation rendered<br/>Confirm / Cancel buttons

    alt User confirms
        U->>FE: Click Confirm
        FE->>API: POST /api/trade/confirm {action_id}
        API->>K: place_order(TCS, BUY, 10, 3500)
        K-->>API: order_id: 12345
        API-->>FE: order_result + confetti
    else User cancels
        U->>FE: Click Cancel
        FE->>API: POST /api/trade/confirm {action_id, cancel}
        API-->>FE: Order cancelled toast
    end
```

---

## 7. SSE Streaming Architecture

```mermaid
sequenceDiagram
    participant FE as useChat.ts
    participant API as FastAPI
    participant C as Council Handler
    participant G as Groq API

    FE->>API: POST /api/council-research
    API->>C: stream_council_debate(query)

    loop For each step (1-9)
        C-->>API: yield SSE: step_start
        C->>G: council_call(agent, prompt)
        C-->>API: yield SSE: agent_thinking
        G-->>C: Agent response
        C-->>API: yield SSE: agent_output
    end

    C-->>API: yield SSE: result (CouncilData)
    C-->>API: yield SSE: done

    Note over FE: useChat parses SSE events<br/>Updates council_progress message<br/>Transitions to council_debate on result
```

---

## 8. Database Schema

```mermaid
erDiagram
    CONVERSATIONS {
        text id PK
        text user_id
        text session_id
        text role
        text content
        text type
        text structured_data
        datetime created_at
    }

    WATCHLIST {
        integer id PK
        text symbol
        text notes
        datetime added_at
    }

    FEEDBACK {
        integer id PK
        text message_id
        text conversation_id
        text query
        text response_snippet
        text rating
        text tags
        text comment
        datetime created_at
    }

    API_CALL_LOG {
        text service
        text endpoint
        integer tokens
        datetime ts
    }

    SHARED_SNAPSHOTS {
        text id PK
        text card_type
        text data
        datetime created_at
        datetime expires_at
    }
```

---

## 9. Deployment Architecture

```mermaid
graph LR
    subgraph GitHub["GitHub · SirCharan/twitter"]
        MAIN[main branch]
        BRANCH[SirCharan/stocky-ai-tg-bot]
    end

    subgraph Railway
        RB["stocky-web-backend<br/>FastAPI · Python 3.12<br/>Auto-deploy from branch"]
        RW["worker<br/>Telegram bot"]
    end

    subgraph Vercel
        VFE["stocky-ai project<br/>Next.js · llm.stockyai.xyz<br/>Manual: npx vercel --prod"]
        VLP["stocky-landing project<br/>stockyai.xyz"]
    end

    BRANCH --> |auto-deploy| RB
    BRANCH --> |push to main| MAIN
    MAIN --> |manual deploy| VFE
    GitHub --> |separate repo| VLP
```
