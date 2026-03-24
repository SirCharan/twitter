# LLM Architecture — Stocky AI

---

## Model Providers

| Provider | Client | Used For |
|----------|--------|----------|
| **Groq** | `AsyncGroq` × 6 clients | Council agents, chat, analysis, intent parsing |
| **OpenRouter** | `AsyncOpenAI` (OpenRouter base) | Gemini fallback for complex queries |

---

## Models in Use

| Use Case | Model | Max Tokens | Temp | Key |
|----------|-------|-----------|------|-----|
| Chat routing / intent parsing | `llama-3.3-70b-versatile` | 1024 | 0.1 | GROQ_API_KEY |
| General chat / Q&A | `llama-3.3-70b-versatile` | 1024 | 0.7 | GROQ_API_KEY |
| Conversational context | `openai/gpt-oss-120b` | 2048 | 0.7 | GROQ_API_KEY |
| Council: TS (Technical) | `llama-3.3-70b-versatile` | 2048 | 0.7 | GROQ_API_KEY |
| Council: FA (Fundamental) | `llama-3.3-70b-versatile` | 2048 | 0.7 | GROQ_API_KEY_2 |
| Council: MP (Market Pulse) | `llama-4-scout-17b-16e` | 1536 | 0.7 | GROQ_API_KEY_3 |
| Council: RG (Risk Guardian) | `llama-4-scout-17b-16e` | 1536 | 0.7 | GROQ_API_KEY_4 |
| Council: ME (Macro Economist) | `llama-4-scout-17b-16e` | 1536 | 0.7 | GROQ_API_KEY_5 |
| Council: CSO (Synthesis) | `llama-3.3-70b-versatile` | 3000 | 0.7 | GROQ_API_KEY_6 |
| Triad: Aris/Silas/Nexus | `llama-4-scout-17b-16e` | 2048 | 0.7 | Keys 1-3 |
| Crew: All agents | `llama-4-scout-17b-16e` | 2048 | 0.7 | Keys 1-3 cycled |
| Gemini fallback | `google/gemini-2.5-pro-preview` | 4096 | 0.7 | OPENROUTER_API_KEY |

**Strategy:** Critical analysis (TS, FA, CSO) uses the larger 70b model. Speed roles (MP, RG, ME) use the lighter scout model. Each agent has a dedicated API key for full parallelism.

---

## Message Routing — Web Backend

File: `stocky-web/backend/app/handlers/chat.py`

```
POST /api/chat  {message, conversation_id}
    │
    ├─► _parse_natural(text) — regex patterns (50+ intents)
    │       price, analyse, portfolio, buy, sell, news, overview,
    │       scan, chart, compare, ipo, macro, rrg, options, fii_dii,
    │       sectors, earnings, dividends, valuation, announcements...
    │       → dispatch directly (zero AI calls)
    │
    └─► interpret_intent(text, history=last_4_messages)
            Model: llama-3.3-70b-versatile
            Returns: {"intent": "...", "args": [...], "reply": "..."}
            → dispatch to handler
            → save to conversations table
```

Deep Research bypasses chat routing entirely:
```
POST /api/council-research  {query}
    → stream_council_debate(query)
    → 6-agent SSE stream
    → CouncilData result
```

---

## Prompts

### SYSTEM_PROMPT — Stocky's Persona
Defines: personality (direct, no fluff, contrarian), CK's biography, domain (Indian markets via Kite), data source citations, response guidelines.

### INTENT_PROMPT — JSON Intent Parser
Maps user text to structured JSON: `{"intent": "buy", "args": ["TCS", "10", "3500"], "reply": ""}`. Valid intents: buy, sell, price, analyse, portfolio, news, overview, scan, chart, compare, ipo, macro, options, fii_dii, sectors, earnings, dividends, valuation, announcements, chat.

### Council Agent Prompts (6)
File: `stocky-web/backend/app/prompts/council.py`

Each agent has a detailed system prompt defining:
- Role identity and expertise scope
- Specific data sources to reference (from DataEnricher output)
- Required output sections (structured markdown)
- Word limits (300-800 words per agent, 800-1200 for CSO)
- Instruction to cite data with timestamps

### Orchestrator Prompt
File: `stocky-web/backend/app/prompts/orchestrator.py`

Enhanced chat prompt that forces the LLM to use real data, skip sections with no data, and never produce empty tables or placeholders.

---

## Analysis Pipeline

File: `stocky-web/backend/app/handlers/analyse.py`

```
get_analysis(symbol)
    ├─► get_fundamentals()     yfinance ticker.info → P/E, ROE, D/E, margins, growth → score 0-10
    ├─► get_technicals()       yfinance 1y OHLCV → RSI, MACD, SMA, momentum → score 0-10
    ├─► get_news()             GNews API + RSS feeds → sentiment scoring → score 0-10
    ├─► get_quarterly()        yfinance quarterly income → QoQ, YoY deltas
    ├─► get_shareholding()     yfinance major_holders
    ├─► generate_news_ai()     Groq → 1-2 sentence summary
    └─► analyse_verdict()      Groq → bold verdict (max 128 tokens)

Overall score = technical + fundamental + news (0-30)
Latency: ~8-15s
```

---

## Response Types (34)

| Type | Component | When |
|------|-----------|------|
| `text` | MarkdownRich | Chat, Q&A |
| `analysis` | AnalysisCard | Stock analysis |
| `overview` | OverviewCard | Market overview |
| `news` | NewsCard | News articles |
| `portfolio` | PortfolioCard | Holdings + P&L |
| `scan` | ScanCard | Market scans |
| `chart` | ChartCard | TradingView embed |
| `compare` | CompareCard | Side-by-side comparison |
| `council_progress` | CouncilProgressCard | Council streaming |
| `council_debate` | CouncilResultCard | Council final report |
| `trade_confirm` | TradeConfirmation | Pending trade |
| `options` | OptionsCard | PCR, max pain, OI |
| `fii_dii` | FiiDiiCard | FII/DII flows |
| `ipo` | IpoCard | IPO tracker |
| `macro` | MacroCard | Macro dashboard |
| `rrg` | RrgCard | Sector rotation |
| `sectors` | SectorsCard | Sector performance |
| `earnings` | EarningsCard | Earnings calendar |
| `dividends` | DividendsCard | Dividend data |
| `valuation` | ValuationCard | Market PE/PB |
| `announcements` | AnnouncementsCard | Corporate actions |
| `price` | PriceCard | Live quote |
| `positions/holdings/orders/margins` | DataTable | Trading data |
| `deep_research` | DeepResearchCard | Legacy deep research |
| `agent_debate/debate_progress` | AgentDebateCard | Legacy triad |
| `progress` | ProgressCard | Step progress |
| `suggestion` | SuggestionCard | Follow-up suggestions |
| `error` | Inline text | Error message |

---

## Token Tracking

Every Groq call logged to `api_call_log` table: `(service, endpoint, tokens, ts)`.

Display formula (branding):
```python
display_tokens = actual_tokens * 101
cost = (display_tokens * 0.4 * 15 + display_tokens * 0.6 * 75) / 1_000_000
```

---

## Conversation History

- Every message saved to `conversations` table with `structured_data` JSON column
- Intent parsing uses last 4 messages for context
- Chat uses full history for conversational continuity
- Conversations listable, loadable, deletable via API
