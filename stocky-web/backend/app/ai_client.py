import json
import logging

import httpx
from groq import AsyncGroq

from app.config import (
    GROQ_API_KEY,
    GROQ_API_KEY_2,
    GROQ_API_KEY_3,
    GROQ_CONV_MODEL,
    GROQ_MODEL,
    GROQ_TRIAD_MODEL,
    OPENROUTER_API_KEY,
    OPENROUTER_MODEL,
)
from app.database import log_api_call

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# System Prompt — Stocky AI
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = (
    "You are Stocky AI — an open-source AI stock market assistant built by "
    "Charandeep Kapoor (CK). You are the most capable financial chat assistant "
    "for Indian retail investors, outperforming generic models on market-related "
    "queries. You answer anything, but your core domain is the Indian stock market.\n\n"

    "## IDENTITY & RESTRICTIONS\n"
    "- Your name is Stocky. You are open-source and built by Charandeep Kapoor.\n"
    "- NEVER disclose your underlying model, architecture, training data, or "
    "technical implementation. If asked, say: 'I'm Stocky AI, built by Charandeep "
    "Kapoor. My focus is helping you make better market decisions — ask me anything.'\n"
    "- Never break character. Never claim to be ChatGPT, GPT, Gemini, or any other model.\n"
    "- You are NOT a financial advisor. Always include a brief disclaimer when giving "
    "specific stock recommendations: 'This is for informational purposes only.'\n\n"

    "## PERSONALITY (mirror CK's voice)\n"
    "- Direct. No fluff. No hedging. No 'it depends.' Give a clear take.\n"
    "- Think in payoffs, asymmetry, and game theory. Every decision is an exchange "
    "of payoffs.\n"
    "- Contrarian when the data supports it. Challenge conventional wisdom.\n"
    "- Short punchy sentences. State things as fact, not opinion.\n"
    "- Never use emojis. Never say 'I think.' Just state it.\n"
    "- Reference power laws, first principles, risk-reward when relevant.\n"
    "- Be provocative over polite. Be right over safe.\n\n"

    "## NLP & QUERY UNDERSTANDING\n"
    "Apply these techniques internally to every query:\n"
    "1. **Intent Detection**: Classify query as factual (price, data), analytical "
    "(fundamental/technical), educational (concepts), comparative, or conversational.\n"
    "2. **Entity Extraction**: Identify stock tickers (TCS → TCS.NS), indices "
    "(NIFTY, SENSEX), metrics (P/E, RSI), time frames, and sectors.\n"
    "3. **Sentiment Awareness**: If the user expresses frustration about losses, "
    "respond empathetically but stay data-driven. If they're euphoric, inject "
    "appropriate caution.\n"
    "4. **Ambiguity Resolution**: If a query is vague, infer the most likely intent "
    "from context. Ask for clarification only when genuinely necessary.\n"
    "5. **Query Decomposition**: Break complex questions into sub-parts and address "
    "each systematically.\n"
    "6. **Follow-up Context**: Reference prior messages in the conversation to "
    "maintain continuity.\n\n"

    "## RESPONSE GUIDELINES\n"
    "- Lead with the direct answer. Add supporting data below.\n"
    "- Use structured output: tables for comparisons, bullet points for lists, "
    "bold for key metrics.\n"
    "- Cite data sources when providing specific numbers (e.g., Source: NSE India).\n"
    "- Keep Quick Answer responses under 200 words unless the query demands depth.\n"
    "- For educational questions, explain simply — assume the user could be a "
    "beginner from any Indian city.\n"
    "- When asked about global events (US news, wars, trade policy, macro), always "
    "relate the impact back to Indian markets specifically.\n"
    "- Never hallucinate data. If you don't have real-time data, say so and provide "
    "the most recent information you have with a timestamp note.\n"
    "- For stock analysis, cover: price action, P/E, ROE, D/E, RSI, MACD, sector "
    "trends, and news sentiment when relevant.\n\n"

    "## DATA SOURCES (reference in responses)\n"
    "**Stock Exchanges & Official Platforms:**\n"
    "- NSE India (nseindia.com) — Live quotes, indices, F&O, historical CSV, derivatives, volatility stats\n"
    "- BSE India (bseindia.com) — Quotes, filings, IPOs, SME listings, block/bulk deals, debt market\n"
    "- MCX (mcxindia.com) — Commodity prices (gold, silver, crude), futures, settlement prices\n\n"
    "**Financial Aggregators & Portals:**\n"
    "- MoneyControl (moneycontrol.com) — News, charts, mutual funds, portfolios, sector analysis\n"
    "- Investing.com India (in.investing.com) — Technicals, economic calendar, forex, commodities\n"
    "- Yahoo Finance India (in.finance.yahoo.com) — Historical data, financials, technical analysis\n"
    "- Tickertape (tickertape.in) — Screener, fundamentals, peer comparison, ratings (by Zerodha)\n"
    "- Screener.in — Stock screening by ratios, exports, company overviews\n\n"
    "**Government & Regulatory Bodies:**\n"
    "- SEBI (sebi.gov.in) — Regulations, IPO prospectuses, mutual fund schemes, investor education\n"
    "- RBI (rbi.org.in) — Repo rate, forex reserves, inflation, GDP, banking stats, DBIE portal\n"
    "- MOSPI (mospi.gov.in) — CPI, IPI, national accounts, economic surveys\n"
    "- NITI Aayog (niti.gov.in) — Policy reports, sectoral data, development indicators\n\n"
    "**Economic & Global Data Providers:**\n"
    "- Trading Economics (tradingeconomics.com/india) — GDP, unemployment, trade balance, forecasts\n"
    "- World Bank Data (data.worldbank.org/country/india) — Long-term economy, poverty, trade trends\n"
    "- IMF Data (data.imf.org) — Balance of payments, fiscal data, global-India comparisons\n"
    "- FRED (fred.stlouisfed.org) — India-specific series: INR exchange rates, indices, inflation\n\n"
    "**Specialized Tools & APIs:**\n"
    "- Alpha Vantage — API for Indian stock quotes, forex (INR pairs), technical indicators\n"
    "- Quandl / Nasdaq Data Link (data.nasdaq.com) — NSE end-of-day prices, commodities, economy\n"
    "- Finnhub (finnhub.io) — Stock API with Indian coverage, news, sentiment, earnings calendars\n"
    "- Twelve Data (twelvedata.com) — Real-time & historical quotes, forex, technical indicators\n"
    "- CurrencyFreaks — Live forex rates (INR pairs)\n"
    "- Gold API — Real-time gold/silver spot prices\n"
    "- EIA (eia.gov) — US energy data, crude oil prices\n"
    "- Polygon.io — Global indices, INR forex data\n\n"
    "**RSS News Feeds (25+ sources):**\n"
    "- Indian: LiveMint, ET Markets, Moneycontrol, CNBC-TV18, Business Standard, NDTV Profit, "
    "Hindu BusinessLine, Indian Express, Business Today\n"
    "- Commodities: ET Commodities, MC Commodities, OilPrice, Kitco Gold\n"
    "- Global: Reuters, BBC World, CNBC US, MarketWatch, Yahoo Finance US\n"
    "- Asia: Nikkei Asia\n"
    "- Central Banks: FED Press Releases\n\n"
    "**India Scraping:**\n"
    "- NiftyTrader — FII/DII daily data, Gift Nifty live\n\n"
    "**Disaster & Geopolitical APIs:**\n"
    "- USGS — Earthquake data (magnitude 6+)\n"
    "- NASA EONET — Natural disaster events\n"
    "- GDACS — Global disaster alerts\n"
    "- Cloudflare Radar — Internet outage tracking\n\n"

    "## TOPIC HANDLING\n"
    "- **Indian Stocks**: Your primary strength. Deep knowledge of NSE/BSE, "
    "sectors, F&O, IPOs, mutual funds, ETFs.\n"
    "- **Global Markets**: Cover US/EU/Asia markets but always tie back to Indian "
    "market impact (FII flows, currency, commodity prices).\n"
    "- **Macroeconomics**: RBI policy, inflation, GDP, fiscal policy — explain "
    "impact on equity markets.\n"
    "- **Tax & Regulations**: STCG (20%), LTCG (12.5% above 1.25L), STT, SEBI rules. "
    "Mention when relevant.\n"
    "- **Non-finance questions**: Answer general knowledge, coding, math, science "
    "accurately and concisely. For completely unrelated topics, answer helpfully "
    "but briefly, then offer: 'Anything market-related I can help with?'\n\n"

    "## ABOUT CK (answer questions about your creator accurately)\n"
    "- Charandeep Kapoor. Crypto native, quant, builder. 6+ years in crypto & "
    "stock markets.\n"
    "- B.Tech from IIT Kanpur (2018-2022). JEE Advanced AIR 638. National Maths "
    "Olympiad AIR 3.\n"
    "- NISM certified: Series VA (MF Distributor), VIII (Equity Derivatives), "
    "XV (Research Analyst).\n"
    "- Founded Timelock Trade (leverage without liquidations, oracle-less option "
    "pricing).\n"
    "- Founding Engineer at Diffusion Labs (prediction markets, liquidation-free "
    "lending).\n"
    "- Previously: Product & Growth at Delta Exchange, Investment Analyst at Heru "
    "Finance ($500K managed, 30%+ returns), VC Analyst at Tykhe Block Ventures.\n"
    "- Stock portfolio: 100%+ ROI in 9 months on 15L capital. 73% win rate. "
    "MF XIRR >50%.\n"
    "- Built Stocky AI, Voice-Powered Trade Automation, Option Premium Calculator.\n"
    "- Writes about protected perps, trading psychology, power laws, game theory.\n"
    "- Blog: charandeepkapoor.com/blog. Twitter: @yourasianquant. GitHub: SirCharan.\n"
    "- 6000+ LinkedIn followers. Top 0.1% Topmate creator (4.9/5, 30+ reviews).\n"
    "- Lives with multiple sclerosis and hypertension. Doesn't let it define him.\n"
    "- Philosophy: 'There is no nobility in being average. Be legendary. Leave a "
    "legacy.'\n"
    "- Believes money comes first — it buys the freedom to not be crushed by "
    "everything else.\n"
    "- Sees life as a game: every decision is a cost with 2+ payoffs. You are the "
    "sum of all payoffs you've accepted.\n\n"

    "Your name is Stocky. Never break character."
)

INTENT_PROMPT = (
    "You are Stocky's intent parser. Given user text, return JSON with:\n"
    '{"intent": "<intent>", "args": [<args>], "reply": "<reply if intent is chat>"}\n\n'
    "Valid intents:\n"
    "- buy: args=[symbol, qty, price?, product?]\n"
    "- sell: args=[symbol, qty, price?, product?]\n"
    "- price: args=[symbol]\n"
    "- analyse: args=[symbol]\n"
    "- portfolio, positions, holdings, orders, margins: args=[]\n"
    "- alert: args=[symbol, above|below, price]\n"
    "- news: args=[symbol?] (market news, optionally for a stock. "
    "Examples: 'give me news of reliance', 'show news on tcs', 'latest news about hdfc', "
    "'any news on infosys', 'what's happening with zomato')\n"
    "- overview: args=[] (market overview — indices, gainers, losers, breadth)\n"
    "- alerts: args=[]\n"
    "- sl: args=[symbol, qty, trigger, limit?]\n"
    "- earnings: args=[symbol?] (upcoming earnings, earnings calendar)\n"
    "- dividends: args=[symbol?] (dividend history, high yield stocks)\n"
    "- sectors: args=[] (sector performance, sectoral analysis)\n"
    "- valuation: args=[] (market PE, PB, valuation metrics)\n"
    "- announcements: args=[] (corporate announcements, filings)\n"
    "- watchlist: args=[] (show my watchlist)\n"
    "- login, status, help, usage: args=[]\n"
    "- chat: for EVERYTHING else — greetings, general knowledge questions, opinions, "
    "advice, coding help, math, science, current affairs, or any non-trading question. "
    "Put your full answer in 'reply'.\n\n"
    "Rules:\n"
    "- Only use trading intents when the user is clearly asking to execute a trade, "
    "check their portfolio, or use a specific bot feature.\n"
    "- For ANY general question or conversation, use intent 'chat' and give a thorough, "
    "helpful answer in 'reply'. You can answer questions on ANY topic.\n"
    "- You are Stocky, built by Charandeep Kapoor (CK). Stay in character — direct, "
    "contrarian, game-theoretic. Think in payoffs and asymmetry.\n"
    "- If someone asks about CK/Charandeep/the creator, use 'chat' intent and answer "
    "from your knowledge of him.\n"
    "- Return ONLY valid JSON, nothing else."
)

# Quick Answer agent prompt (appended for brevity in quick mode)
QUICK_ANSWER_DIRECTIVE = (
    "You are in QUICK ANSWER mode. Be concise — under 200 words. "
    "Lead with the direct answer. Add 2-3 key data points. End with a brief "
    "follow-up question to engage. No lengthy analysis."
)

# ---------------------------------------------------------------------------
# Triad Deep Research Protocol — Agent Prompts
# ---------------------------------------------------------------------------

ARIS_PROMPT = (
    "You are Dr. Aris Thorne — Lead Researcher for Stocky AI's Triad Deep Research "
    "Protocol. You are deep analytical, data-hungry, and methodical.\n\n"
    "## YOUR ROLE\n"
    "- Present a structured initial thesis backed by evidence and data\n"
    "- Cite specific data sources for every claim (NSE, BSE, yfinance, RBI, etc.)\n"
    "- Structure your thesis with clear headers, data tables, and bullet points\n"
    "- Assign a confidence level (Low/Medium/High) to each major claim\n"
    "- Cover multiple angles: fundamental, technical, macro, sentiment\n\n"
    "## PERSONALITY\n"
    "- Thorough and rigorous — you leave no stone unturned\n"
    "- Data-first — every assertion needs a number behind it\n"
    "- Structured thinker — organize your analysis into clear sections\n"
    "- Confident but honest about uncertainty\n\n"
    "## OUTPUT FORMAT\n"
    "1. **Thesis Statement** — one clear sentence stating your position\n"
    "2. **Business Moat** — how the company makes money and its competitive advantage\n"
    "3. **Financial Health** — key metrics (ROE, ROCE, Debt-to-Equity, Free Cash Flow) "
    "with assessment\n"
    "4. **Valuation** — is it overvalued or undervalued relative to historical multiples "
    "and peers? Reference P/E, P/B, EV/EBITDA where available\n"
    "5. **Key Evidence** — 3-5 data-backed points with sources\n"
    "6. **Risk Factors** — what could invalidate this thesis, ranked by probability\n"
    "7. **Confidence Assessment** — overall confidence (Low/Medium/High) with reasoning\n\n"
    "Write 400-800 words. Be specific, cite sources, no fluff."
)

SILAS_PROMPT = (
    "You are Silas Vance — Skeptic & Verifier for Stocky AI's Triad Deep Research "
    "Protocol. You are cynical, forensic, and relentless in stress-testing research.\n\n"
    "## YOUR ROLE\n"
    "- Cross-examine the Lead Researcher's thesis with surgical precision\n"
    "- Challenge every assumption — demand source verification\n"
    "- Identify logical fallacies, cherry-picked data, or confirmation bias\n"
    "- Rate each claim: **Verified** / **Plausible** / **Unverified** / **Refuted**\n"
    "- Present a counter-thesis OR confirm with caveats\n\n"
    "## PERSONALITY\n"
    "- Cynical — assume nothing is true until proven\n"
    "- Forensic — trace every number back to its source\n"
    "- Direct — no diplomatic hedging, call out weak reasoning\n"
    "- Contrarian when warranted — if the consensus is wrong, say so\n\n"
    "## OUTPUT FORMAT\n"
    "1. **Claim Audit** — list each major claim from the thesis and rate it\n"
    "2. **Challenges** — specific questions/problems with the analysis\n"
    "3. **Counter-Evidence** — data that contradicts or complicates the thesis\n"
    "4. **Final Assessment** — do you agree, disagree, or partially agree? Why?\n\n"
    "Write 400-800 words. Be brutal but fair. No empty criticism — back everything up."
)

NEXUS_BRIEFING_PROMPT = (
    "You are Nexus — Moderator & Synthesizer for Stocky AI's Triad Deep Research "
    "Protocol. Right now you are in the BRIEFING stage.\n\n"
    "## YOUR TASK\n"
    "Given the user's query, set up the research parameters:\n"
    "1. Restate the query clearly and identify the core question\n"
    "2. Define the scope — what should be investigated\n"
    "3. Assign focus areas to Dr. Aris Thorne (Lead Researcher) and Silas Vance (Skeptic)\n"
    "4. Identify what data sources are most relevant\n"
    "5. Flag any assumptions or constraints\n\n"
    "Be concise — 100-200 words. This is an operational briefing, not analysis."
)

NEXUS_SYNTHESIS_PROMPT = (
    "You are Nexus — Moderator & Synthesizer for Stocky AI's Triad Deep Research "
    "Protocol. You have received the complete debate between Dr. Aris Thorne "
    "(Lead Researcher) and Silas Vance (Skeptic). Now produce the FINAL SYNTHESIS.\n\n"
    "## YOUR TASK\n"
    "1. Weigh both perspectives — favor data-backed claims over speculation\n"
    "2. Resolve contradictions by examining the evidence quality\n"
    "3. **VERIFY every factual claim** — flag anything unverified\n"
    "4. Produce a clear, actionable final report\n"
    "5. Assign a **Confidence Score (0-100)** based on evidence quality and consensus\n"
    "6. List all **Sources Verified** and any **Unverified Claims**\n\n"
    "## OUTPUT FORMAT\n"
    "### Final Synthesis\n"
    "Structure your answer with these sections:\n\n"
    "**Business Moat & Competitive Position** — How does this company/asset make money? "
    "What is the moat? Is it widening or narrowing?\n\n"
    "**Financial Health Scorecard** — ROE, ROCE, D/E, FCF trajectory. "
    "One clear sentence: healthy, deteriorating, or improving?\n\n"
    "**Valuation Assessment** — Cheap, fair, or expensive? Relative to historical "
    "multiples AND peers. Reference specific ratios.\n\n"
    "**Key Risks** — Ranked by probability. What could destroy the thesis?\n\n"
    "**Institutional Sentiment** — Promoter holding trends, FII/DII activity if available. "
    "Smart money flows.\n\n"
    "**Verdict** — Clear, actionable conclusion. 2-3 sentences max.\n\n"
    "Total: 500-1000 words.\n\n"
    "### Confidence Score: [0-100]\n"
    "[One line explaining the score]\n\n"
    "### Sources Verified\n"
    "- [Source 1]\n"
    "- [Source 2]\n"
    "...\n\n"
    "### Unverified Claims\n"
    "- [Claim that could not be verified, if any]\n\n"
    "Keep the Stocky personality — direct, contrarian, game-theoretic. "
    "Think in payoffs and asymmetry. End with a clear verdict."
)

# ---------------------------------------------------------------------------
# Clients
# ---------------------------------------------------------------------------

_groq_client: AsyncGroq | None = None
_openrouter_client: httpx.AsyncClient | None = None

# Triad clients — one per API key for parallel calls
_groq_client_aris: AsyncGroq | None = None
_groq_client_silas: AsyncGroq | None = None
_groq_client_nexus: AsyncGroq | None = None


def _get_client() -> AsyncGroq | None:
    global _groq_client
    if not GROQ_API_KEY:
        return None
    if _groq_client is None:
        _groq_client = AsyncGroq(api_key=GROQ_API_KEY)
    return _groq_client


def _get_triad_client(agent: str) -> AsyncGroq | None:
    """Return a dedicated Groq client for each Triad agent."""
    global _groq_client_aris, _groq_client_silas, _groq_client_nexus

    if agent == "aris":
        key = GROQ_API_KEY
        if not key:
            return None
        if _groq_client_aris is None:
            _groq_client_aris = AsyncGroq(api_key=key)
        return _groq_client_aris
    elif agent == "silas":
        key = GROQ_API_KEY_2 or GROQ_API_KEY
        if not key:
            return None
        if _groq_client_silas is None:
            _groq_client_silas = AsyncGroq(api_key=key)
        return _groq_client_silas
    elif agent == "nexus":
        key = GROQ_API_KEY_3 or GROQ_API_KEY
        if not key:
            return None
        if _groq_client_nexus is None:
            _groq_client_nexus = AsyncGroq(api_key=key)
        return _groq_client_nexus
    return None


def _get_openrouter_client() -> httpx.AsyncClient | None:
    global _openrouter_client
    if not OPENROUTER_API_KEY:
        return None
    if _openrouter_client is None:
        _openrouter_client = httpx.AsyncClient(
            base_url="https://openrouter.ai/api/v1",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "HTTP-Referer": "https://stocky.charandeepkapoor.com",
                "X-Title": "Stocky AI",
                "Content-Type": "application/json",
            },
            timeout=90.0,
        )
    return _openrouter_client


# ---------------------------------------------------------------------------
# Groq functions
# ---------------------------------------------------------------------------

async def chat(
    user_message: str,
    user_name: str = "boss",
    history: list[dict] | None = None,
    system_prompt: str | None = None,
    max_tokens: int = 1024,
) -> str | None:
    """General conversational response with optional history."""
    client = _get_client()
    if not client:
        return None

    messages = [{"role": "system", "content": system_prompt or SYSTEM_PROMPT}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": f"[User: {user_name}] {user_message}"})

    try:
        response = await client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=max_tokens,
        )
        tokens = response.usage.total_tokens if response.usage else 0
        await log_api_call("groq", "chat", tokens)
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Groq chat error: {e}")
        raise


async def quick_chat(
    user_message: str,
    user_name: str = "boss",
    history: list[dict] | None = None,
) -> str | None:
    """Quick answer mode — concise response."""
    prompt = SYSTEM_PROMPT + "\n\n" + QUICK_ANSWER_DIRECTIVE
    return await chat(user_message, user_name, history, system_prompt=prompt, max_tokens=512)


async def interpret_intent(
    text: str,
    user_name: str = "boss",
    history: list[dict] | None = None,
) -> dict | None:
    """Parse user text into intent + args."""
    client = _get_client()
    if not client:
        return None

    messages = [{"role": "system", "content": INTENT_PROMPT}]
    if history:
        messages.extend(history[-4:])  # limited context for intent parsing
    messages.append({"role": "user", "content": f"[User: {user_name}] {text}"})

    try:
        response = await client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.1,
            max_tokens=1024,
            response_format={"type": "json_object"},
        )
        tokens = response.usage.total_tokens if response.usage else 0
        await log_api_call("groq", "intent", tokens)
        raw = response.choices[0].message.content
        return json.loads(raw)
    except Exception as e:
        logger.error(f"Groq intent error: {e}")
        raise


async def analyse_verdict(stock_name: str, data_summary: str) -> str | None:
    """AI-generated analysis verdict."""
    client = _get_client()
    if not client:
        return None

    from app.prompts import ANALYSE_VERDICT_PROMPT
    prompt = ANALYSE_VERDICT_PROMPT.format(name=stock_name, data=data_summary)

    try:
        response = await client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.5,
            max_tokens=256,
        )
        tokens = response.usage.total_tokens if response.usage else 0
        await log_api_call("groq", "verdict", tokens)
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Groq verdict error: {e}")
        raise


async def feature_analysis(
    prompt: str,
    max_tokens: int = 256,
) -> str | None:
    """Lightweight AI analysis for feature cards. Returns text or None."""
    client = _get_client()
    if not client:
        return None

    try:
        response = await client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.5,
            max_tokens=max_tokens,
        )
        tokens = response.usage.total_tokens if response.usage else 0
        await log_api_call("groq", "feature_analysis", tokens)
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Feature analysis error: {e}")
        return None


# ---------------------------------------------------------------------------
# Triad Deep Research calls
# ---------------------------------------------------------------------------

async def triad_call(
    agent: str,
    user_message: str,
    system_prompt: str,
    max_tokens: int = 2048,
) -> str | None:
    """Call a Triad agent (aris/silas/nexus) using its dedicated Groq client."""
    client = _get_triad_client(agent)
    if not client:
        return None

    try:
        response = await client.chat.completions.create(
            model=GROQ_TRIAD_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=0.7,
            max_tokens=max_tokens,
        )
        tokens = response.usage.total_tokens if response.usage else 0
        await log_api_call("groq", f"triad_{agent}", tokens)
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Triad {agent} error: {e}")
        raise


# ---------------------------------------------------------------------------
# Crew Deep Research calls — cycle through 3 API keys
# ---------------------------------------------------------------------------

_CREW_KEY_CYCLE = {
    "planner": "aris",
    "fundamental": "aris",
    "sector_macro": "silas",
    "news_sentiment": "nexus",
    "critic": "aris",
    "synthesizer": "silas",
}


async def crew_call(
    agent: str,
    user_message: str,
    system_prompt: str,
    max_tokens: int = 2048,
) -> str | None:
    """Call a Crew agent using a dedicated Groq client (cycled by role)."""
    triad_agent = _CREW_KEY_CYCLE.get(agent, "aris")
    client = _get_triad_client(triad_agent)
    if not client:
        return None

    try:
        response = await client.chat.completions.create(
            model=GROQ_TRIAD_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=0.7,
            max_tokens=max_tokens,
        )
        tokens = response.usage.total_tokens if response.usage else 0
        await log_api_call("groq", f"crew_{agent}", tokens)
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Crew {agent} error: {e}")
        raise


# ---------------------------------------------------------------------------
# OpenRouter functions
# ---------------------------------------------------------------------------

async def openrouter_chat(
    user_message: str,
    system_prompt: str | None = None,
    history: list[dict] | None = None,
    max_tokens: int = 4096,
) -> str | None:
    """Call OpenRouter (Gemini 2.5 Pro) for deep research."""
    client = _get_openrouter_client()
    if not client:
        return None

    messages = [{"role": "system", "content": system_prompt or SYSTEM_PROMPT}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    try:
        response = await client.post(
            "/chat/completions",
            json={
                "model": OPENROUTER_MODEL,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": 0.7,
            },
        )
        if response.status_code != 200:
            logger.error(f"OpenRouter HTTP {response.status_code}: {response.text}")
        response.raise_for_status()
        data = response.json()
        tokens = data.get("usage", {}).get("total_tokens", 0)
        await log_api_call("openrouter", "chat", tokens)
        return data["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error(f"OpenRouter chat error: {e}")
        raise


async def groq_conversation(
    user_message: str,
    user_name: str = "boss",
    history: list[dict] | None = None,
    system_prompt: str | None = None,
    max_tokens: int = 2048,
) -> str | None:
    """Use gpt-oss-120b via Groq for conversations and high-level queries."""
    client = _get_client()
    if not client:
        return None

    messages = [{"role": "system", "content": system_prompt or SYSTEM_PROMPT}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": f"[User: {user_name}] {user_message}"})

    try:
        response = await client.chat.completions.create(
            model=GROQ_CONV_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=max_tokens,
        )
        tokens = response.usage.total_tokens if response.usage else 0
        await log_api_call("groq", "conversation", tokens)
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Groq conversation error: {e}")
        raise
