# AI Architecture — Deep Research & 6-Agent Stocky Council

## Overview

Stocky AI uses multiple agent systems for research depth. The primary system is the **6-Agent Stocky Council** — a structured debate protocol where specialised AI agents analyse a query from different angles, challenge each other, and produce a unified report with confidence scoring.

| System | Agents | Route | Status |
|--------|--------|-------|--------|
| **Stocky Council** | 6 agents, 9 steps, 3 rounds | `POST /api/council-research` | **Default** (Deep Research mode) |
| Triad Protocol | 3 agents (Nexus, Aris, Silas) | `POST /api/deep-research` | Legacy fallback |
| Crew Research | 7 agents (Planner → Analysts → Critic → Synthesizer) | `POST /api/crew-research` | Legacy fallback |

---

## The 6-Agent Stocky Council

### Agent Roster

| # | Agent | Short | Model | API Key | Colour | Role |
|---|-------|-------|-------|---------|--------|------|
| 1 | Technical Strategist | TS | llama-3.3-70b | GROQ_API_KEY | #3b82f6 (blue) | Chart patterns, RSI/MACD/Bollinger, Fibonacci, support/resistance, entry/exit levels |
| 2 | Fundamental Analyst | FA | llama-3.3-70b | GROQ_API_KEY_2 | #10b981 (green) | Financials, ratios (ROE/P/E/EV/EBITDA), earnings quality, moat, management |
| 3 | Market Pulse Agent | MP | llama-4-scout | GROQ_API_KEY_3 | #f59e0b (amber) | News sentiment, FII/DII flows, options chain, social temperature, event risk |
| 4 | Risk Guardian | RG | llama-4-scout | GROQ_API_KEY_4 | #ef4444 (red) | Position sizing, VaR, correlation, stop-loss logic, portfolio impact |
| 5 | Macro Economist | ME | llama-4-scout | GROQ_API_KEY_5 | #8b5cf6 (purple) | RBI policy, global cues, sector rotation, inflation, dollar/crude impact |
| 6 | Chief Synthesis Officer | CSO | llama-3.3-70b | GROQ_API_KEY_6 | #c9a96e (gold) | Query decomposition, conflict arbitration, confidence scoring, final synthesis |

**Model strategy:** Critical analysis agents (TS, FA, CSO) use the larger 70b model for depth. Speed agents (MP, RG, ME) use the faster scout model. Each agent has a dedicated API key for true parallel execution.

### 9 Research Steps (3 Rounds)

```
ROUND 1: INTELLIGENCE GATHERING
  Step 1: CSO    → Query decomposition & agent tasking
  Step 2: DATA   → DataEnricher fetches market data (non-LLM)
  Step 3: TS     → Technical analysis        ┐
  Step 4: FA     → Fundamental deep dive      ├─ Parallel (keys 1,2,3)
  Step 5: MP     → Sentiment & news flow      ┘
  Step 6: RG     → Risk & scenario modeling   ┐
  Step 7: ME     → Macro context              ┘─ Parallel (keys 4,5)

ROUND 2: DEBATE & REBUTTALS
  CSO identifies conflicts between agents
  Challenged agents respond (2-3 rebuttals max)

ROUND 3: FINAL VERDICT
  Step 8: TRADE  → Collaborative trade idea (TS + RG context → CSO)
  Step 9: CSO    → Final synthesis, confidence score, executive summary
```

### Parallelism & Timing

- Steps 3+4+5 run in parallel (3 separate API keys, no rate limit conflicts)
- Steps 6+7 run in parallel after data fetch
- Steps 1, 8, 9 are serial (CSO only)
- **Target wall-clock time: ~21 seconds**

### SSE Streaming Protocol

The council streams Server-Sent Events to the frontend in real-time:

```
council_start    → Frontend initialises progress card with 6 agent avatars
step_start       → Step begins (label, agent, round number)
agent_thinking   → Live thinking text from current agent
agent_output     → Agent's analysis complete (content, elapsed time)
data_fetch       → Market data fetch progress (started/done, source counts)
round_start      → New debate round begins
rebuttal         → Agent challenges another agent
result           → Final CouncilData payload
done             → Stream complete
```

### Output Structure (CouncilData)

The final `result` event contains the full structured report:

```json
{
  "query": "Is Reliance a good buy?",
  "agents": [{"name": "Technical Strategist", "short": "TS", "icon": "...", "color": "#3b82f6", "skills": [...]}],
  "steps": [{"step": 1, "agent": "CSO", "label": "Query Decomposition", "content": "...", "elapsed": 1.8}],
  "rebuttals": [{"agent": "RG", "target": "TS", "conflict": "entry level", "content": "...", "elapsed": 2.1}],
  "synthesis": {
    "executive_summary": "...",
    "bull_case": "...",
    "bear_case": "...",
    "key_risks": [{"risk": "Geopolitical tensions", "probability": 35}],
    "trade": {
      "action": "BUY",
      "entry": 2450, "target_1": 2620, "target_2": 2780, "stoploss": 2380,
      "sizing": "2-3% of portfolio", "timeframe": "2-4 weeks", "risk_reward": "1:2.5"
    },
    "confidence_score": 78,
    "sources": ["yfinance", "GNews", "NSE India"],
    "unverified_claims": []
  },
  "total_elapsed": 21.3,
  "timestamp": "2026-03-24T10:15:00Z"
}
```

---

## Data Enricher Service

File: `stocky-web/backend/app/services/data_enricher.py`

A unified data layer that all agents call instead of raw APIs. Provides caching, parallel fetching, and graceful fallback.

| Method | Source | Cache TTL | Used By |
|--------|--------|-----------|---------|
| `get_quote(symbol)` | Kite (live) → yfinance (delayed) | 60s | All agents |
| `get_historical(symbol)` | yfinance 1Y OHLCV | 300s | TS |
| `get_technicals(symbol)` | Computed from OHLCV (RSI, MACD, SMA, Bollinger) | 300s | TS |
| `get_fundamentals(symbol)` | yfinance ticker.info + quarterly | 300s | FA |
| `get_news(query)` | GNews API → RSS fallback | 600s | MP |
| `get_option_chain(symbol)` | Dhan API | 120s | MP, RG |
| `get_fii_dii()` | NSE public data | 600s | MP, ME |
| `enrich_for_council(query, tickers)` | All above in parallel | — | Council handler |

---

## Frontend Components

### CouncilProgressCard
Renders during streaming. Shows:
- 6 agent avatar badges with active glow
- Round indicator (1/3, 2/3, 3/3)
- Overall progress bar (step X/9)
- Per-step rows: status icon, label, agent badge, elapsed time
- Running step: animated pulse ring + rotating thinking text
- LIVE badge

### CouncilResultCard
Renders after completion. Shows:
- Confidence meter (0-100, animated, colour-coded: red/yellow/green)
- Executive summary (always open)
- Bull case / Bear case (side-by-side on desktop)
- Key risks with probability badges
- Actionable trade card (entry, targets, SL, sizing, R:R)
- 6 collapsible agent sections
- Rebuttals section
- Sources verified / unverified claims
- Export PDF button
- Disclaimer

---

## Legacy Systems

### Triad Protocol (3 Agents)
- **Nexus** — moderator, briefing, final synthesis
- **Dr. Aris Thorne** — lead researcher, thesis, rebuttal
- **Silas Vance** — skeptic, cross-examination, final assessment
- 5 phases: briefing → thesis → cross-exam → rebuttal → synthesis
- Sequential execution, ~15s total

### Crew Research (7 Agents)
- Planner → DataFetcher → 3 Analysts (parallel) → Critic (loops if confidence < 70) → Synthesizer
- Hybrid parallel/sequential, ~30-45s total
- Confidence loop: Critic re-runs up to 2x if score below threshold

Both legacy systems remain available as fallback endpoints.

---

## Feedback System

- **Thumbs up**: Instant POST to `/api/feedback` with `rating: "up"`
- **Thumbs down**: Opens FeedbackTagsModal with quick tags (Missing data, Wrong analysis, Too vague, Risks ignored, Outdated) + free text → POST to `/api/feedback`
- Stored in SQLite `feedback` table with message_id, query, response snippet, tags, comment
- Regenerate menu: Regenerate Same / Deeper Analysis / Council Debate
