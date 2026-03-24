# Stocky AI — System Flow Diagrams

All diagrams use Mermaid syntax (renders on GitHub, Notion, VS Code, etc.).

---

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph Client["Browser · llm.stockyai.xyz"]
        FE["Next.js 16 + React 19<br/>49 components · PWA"]
    end

    subgraph Railway["Railway · stocky-web-backend"]
        API["FastAPI<br/>29 handlers · 34 routes"]
        DE["DataEnricher<br/>Unified data layer"]
        COUNCIL["6-Agent Council<br/>SSE streaming"]
        DB[(SQLite<br/>conversations · watchlist · feedback)]
    end

    subgraph AI["AI Models · Groq"]
        LLM70["llama-3.3-70b<br/>TS · FA · CSO"]
        LLMS["llama-4-scout<br/>MP · RG · ME"]
        CONV["gpt-oss-120b<br/>Chat routing"]
    end

    subgraph Data["Market Data"]
        KITE["Zerodha Kite<br/>Live quotes · Portfolio · Orders"]
        YF["yfinance<br/>OHLCV · Fundamentals"]
        GNEWS["GNews API<br/>Structured news"]
        RSS["33 RSS Feeds<br/>Financial news"]
        DHAN["Dhan HQ<br/>Option chain · Prices"]
        NSE["NSE India<br/>FII/DII · Indices"]
    end

    FE -->|REST + SSE| API
    API --> COUNCIL
    API --> DE
    COUNCIL --> LLM70
    COUNCIL --> LLMS
    API --> CONV
    API --> DB
    DE --> KITE
    DE --> YF
    DE --> GNEWS
    DE --> RSS
    DE --> DHAN
    DE --> NSE

    style COUNCIL fill:#c9a96e,color:#000,stroke:#c9a96e
    style LLM70 fill:#3b82f6,color:#fff,stroke:#3b82f6
    style LLMS fill:#8b5cf6,color:#fff,stroke:#8b5cf6
```

---

## 2. 6-Agent Council Debate Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as Backend
    participant DE as DataEnricher
    participant CSO as CSO (Gold)
    participant TS as TS (Blue)
    participant FA as FA (Green)
    participant MP as MP (Amber)
    participant RG as RG (Red)
    participant ME as ME (Purple)

    U->>FE: Send query (Deep Research mode)
    FE->>API: POST /api/council-research

    Note over API: ROUND 1: Intelligence Gathering

    API->>CSO: Step 1: Decompose query
    CSO-->>API: Agent tasking plan
    API-->>FE: SSE: step_start, agent_output

    API->>DE: Step 2: Fetch market data
    DE-->>API: Quotes + Technicals + News + FII/DII
    API-->>FE: SSE: data_fetch done

    par Parallel Group A (keys 1,2,3)
        API->>TS: Step 3: Technical analysis
        API->>FA: Step 4: Fundamental deep dive
        API->>MP: Step 5: Sentiment & news
    end
    TS-->>API: Technical view
    FA-->>API: Fundamental view
    MP-->>API: Market pulse
    API-->>FE: SSE: agent_output ×3

    par Parallel Group B (keys 4,5)
        API->>RG: Step 6: Risk & scenarios
        API->>ME: Step 7: Macro context
    end
    RG-->>API: Risk assessment
    ME-->>API: Macro view
    API-->>FE: SSE: agent_output ×2

    Note over API: ROUND 2: Debate & Rebuttals

    API->>CSO: Identify conflicts
    CSO-->>API: Conflict list
    API->>RG: Rebuttal to TS on entry level
    RG-->>API: Rebuttal content
    API-->>FE: SSE: rebuttal

    Note over API: ROUND 3: Final Verdict

    API->>CSO: Step 8: Trade idea (TS+RG context)
    CSO-->>API: Trade recommendation
    API->>CSO: Step 9: Final synthesis
    CSO-->>API: Executive summary + confidence
    API-->>FE: SSE: result (CouncilData)

    FE->>U: CouncilResultCard rendered
```

---

## 3. Chat Message Routing

```mermaid
flowchart TD
    A[User sends message] --> B{Deep Research mode?}

    B -->|Yes| C[POST /api/council-research]
    C --> D[6-Agent Council SSE stream]
    D --> E[CouncilProgressCard → CouncilResultCard]

    B -->|No| F[POST /api/chat]
    F --> G{_parse_natural regex}

    G -->|Match: price| H[get_quote → PriceCard]
    G -->|Match: analyse| I[get_analysis → AnalysisCard]
    G -->|Match: portfolio| J[get_portfolio → PortfolioCard]
    G -->|Match: buy/sell| K[create_trade → TradeConfirmation]
    G -->|Match: news| L[get_news → NewsCard]
    G -->|Match: overview| M[get_overview → OverviewCard]
    G -->|Match: scan| N[run_scan → ScanCard]
    G -->|Match: chart| O[generate_chart → ChartCard]
    G -->|Match: compare| P[compare_stocks → CompareCard]
    G -->|Match: ipo| Q[get_ipo → IpoCard]
    G -->|Match: macro| R[get_macro → MacroCard]
    G -->|Match: options| S[get_options → OptionsCard]
    G -->|Match: fii/dii| T[get_fii_dii → FiiDiiCard]
    G -->|No match| U2[interpret_intent LLM]

    U2 --> V{LLM intent}
    V -->|chat| W[Direct text reply]
    V -->|Other| X[Dispatch to handler]

    style C fill:#c9a96e,color:#000
    style D fill:#c9a96e,color:#000
```

---

## 4. Frontend Component Tree

```mermaid
graph TD
    SHELL[ChatShell] --> TLS[TerminalLoadingScreen]
    SHELL --> PWA[PWAProvider]
    SHELL --> SB[Sidebar]
    SHELL --> MH[MobileHeader]
    SHELL --> CW[ChatWindow]
    SHELL --> MBN[MobileBottomNav]
    SHELL --> TOAST[Sonner Toaster]

    CW --> HDR[Header]
    CW --> FB[FeatureBar]
    CW --> FP[FeaturePanel]
    CW --> MSG[MessageBubble ×N]
    CW --> SC[SuggestionChips]
    CW --> TS2[ThinkingScreen]
    CW --> SK[SkeletonCard]
    CW --> CI[ChatInput]
    CW --> CMD[CommandPalette]

    MSG --> MA[MessageActions]
    MA --> FTM[FeedbackTagsModal]

    MSG --> |council_progress| CPR[CouncilProgressCard]
    MSG --> |council_debate| CRC[CouncilResultCard]
    MSG --> |analysis| AC[AnalysisCard]
    MSG --> |overview| OC[OverviewCard]
    MSG --> |news| NC[NewsCard]
    MSG --> |scan| SCC[ScanCard]
    MSG --> |chart| CHC[ChartCard]
    MSG --> |compare| CPC[CompareCard]
    MSG --> |options| OPC[OptionsCard]
    MSG --> |portfolio| PC[PortfolioCard]
    MSG --> |trade_confirm| TC[TradeConfirmation]
    MSG --> |text| MR[MarkdownRich]

    style CPR fill:#c9a96e,color:#000
    style CRC fill:#c9a96e,color:#000
```

---

## 5. Data Enricher Flow

```mermaid
flowchart LR
    subgraph DataEnricher
        Q[get_quote] --> |Priority 1| KITE2[Kite API]
        Q --> |Fallback| YF2[yfinance]

        T[get_technicals] --> YF3[yfinance OHLCV]
        T --> CALC[RSI · MACD · SMA · Bollinger]

        F[get_fundamentals] --> YF4[yfinance ticker.info]

        N[get_news] --> |Priority 1| GN[GNews API]
        N --> |Fallback| RSS2[33 RSS Feeds]

        OC2[get_option_chain] --> DHAN2[Dhan API]

        FD[get_fii_dii] --> NSE2[NSE Public Data]
    end

    COUNCIL2[Council Handler] --> |enrich_for_council| DataEnricher

    DataEnricher --> |Cached results| CACHE[(In-memory cache<br/>TTL: 60-600s)]

    style DataEnricher fill:#1a1a2e,color:#fff,stroke:#c9a96e
```

---

## 6. SSE Streaming Timeline

```mermaid
gantt
    title Council Research Timeline (~21s)
    dateFormat ss
    axisFormat %Ss

    section Round 1
    CSO: Query Decomposition     :cso1, 00, 2s
    Data Fetch                   :data, 01, 3s
    TS: Technical Analysis       :ts, 04, 4s
    FA: Fundamental Deep Dive    :fa, 04, 4s
    MP: Sentiment & News         :mp, 04, 3s
    RG: Risk Modeling            :rg, 08, 3s
    ME: Macro Context            :me, 08, 3s

    section Round 2
    CSO: Conflict Detection      :cso2, 11, 1s
    Rebuttals (1-3)              :reb, 12, 3s

    section Round 3
    CSO: Trade Idea              :trade, 15, 3s
    CSO: Final Synthesis         :synth, 18, 3s
```

---

## 7. Message Type → Component Mapping

```mermaid
graph LR
    subgraph MessageTypes["34 Message Types"]
        T1[text] --> MR2[MarkdownRich]
        T2[analysis] --> AC2[AnalysisCard]
        T3[overview] --> OC3[OverviewCard]
        T4[news] --> NC2[NewsCard]
        T5[portfolio] --> PC2[PortfolioCard]
        T6[scan] --> SC2[ScanCard]
        T7[chart] --> CC2[ChartCard]
        T8[compare] --> CPC2[CompareCard]
        T9[council_progress] --> CPR2[CouncilProgressCard]
        T10[council_debate] --> CRC2[CouncilResultCard]
        T11[trade_confirm] --> TC2[TradeConfirmation]
        T12[options] --> OPC2[OptionsCard]
        T13[fii_dii] --> FDC[FiiDiiCard]
        T14[ipo] --> IC[IpoCard]
        T15[macro] --> MC[MacroCard]
        T16[rrg] --> RC[RrgCard]
        T17[sectors] --> SEC[SectorsCard]
        T18[earnings] --> EC[EarningsCard]
        T19[dividends] --> DC[DividendsCard]
        T20[valuation] --> VC[ValuationCard]
    end

    style T9 fill:#c9a96e,color:#000
    style T10 fill:#c9a96e,color:#000
```

---

## 8. Feedback & Regeneration Flow

```mermaid
flowchart TD
    A[User sees AI response] --> B[MessageActions bar]

    B --> C[Copy]
    C --> C1[Clipboard + toast]

    B --> D[Regenerate ▾]
    D --> D1[Same: removeLastAssistant + resend]
    D --> D2[Deeper: force deep analysis]
    D --> D3[Council Debate: streamCouncilResearch]

    B --> E[Thumbs Up]
    E --> E1[POST /api/feedback rating=up]

    B --> F[Thumbs Down]
    F --> F1[FeedbackTagsModal]
    F1 --> F2[Select tags + comment]
    F2 --> F3[POST /api/feedback rating=down tags=...]
    F3 --> F4[Toast: Feedback recorded]
```
