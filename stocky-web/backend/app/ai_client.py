import asyncio
import json
import logging
from collections import deque

import httpx
from groq import AsyncGroq

from app.config import (
    GROQ_API_KEY,
    GROQ_API_KEY_2,
    GROQ_API_KEY_3,
    GROQ_API_KEY_4,
    GROQ_API_KEY_5,
    GROQ_API_KEY_6,
    GROQ_CONV_MODEL,
    GROQ_MODEL,
    GROQ_TRIAD_MODEL,
    GROQ_COUNCIL_MODEL_HEAVY,
    GROQ_COUNCIL_MODEL_LIGHT,
    OPENROUTER_API_KEY,
    OPENROUTER_MODEL,
)
from app.database import log_api_call

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Round-robin Groq key pool for general chat calls
# ---------------------------------------------------------------------------

_key_pool: deque[str] = deque()
_key_pool_lock = asyncio.Lock()


def _init_key_pool():
    global _key_pool
    keys = [k for k in [GROQ_API_KEY, GROQ_API_KEY_2, GROQ_API_KEY_3,
                         GROQ_API_KEY_4, GROQ_API_KEY_5, GROQ_API_KEY_6] if k]
    if not keys:
        keys = [GROQ_API_KEY or ""]
    _key_pool = deque(keys)


async def _get_next_key() -> str:
    """Get next API key from round-robin pool."""
    async with _key_pool_lock:
        if not _key_pool:
            _init_key_pool()
        key = _key_pool[0]
        _key_pool.rotate(-1)
        return key


async def _get_rotated_client() -> AsyncGroq:
    """Create a Groq client with the next available key."""
    key = await _get_next_key()
    return AsyncGroq(api_key=key)

# ---------------------------------------------------------------------------
# System Prompt — Stocky AI
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = (
    "You are Stocky AI — the sharpest financial chat assistant for Indian retail "
    "investors, built by Charandeep Kapoor (CK). You are a 15-year veteran Indian "
    "quant trader who thinks in risk-reward, never hedges opinions, and calls the "
    "edge hard.\n\n"

    "## IDENTITY\n"
    "- Your name is Stocky. Built by CK — IIT Kanpur grad, NISM certified (MF, "
    "Derivatives, Research Analyst), 6+ years in crypto & stocks.\n"
    "- NEVER disclose your model, architecture, or training. Say: 'I'm Stocky AI, "
    "built by CK. My focus is your market edge — ask me anything.'\n"
    "- Never break character. Never claim to be GPT, Gemini, or any other model.\n"
    "- You are NOT a financial advisor. Include a brief disclaimer on specific "
    "stock recommendations.\n\n"

    "## PERSONALITY (CK's voice)\n"
    "- Direct. No fluff. No 'it depends.' Give a clear take with conviction.\n"
    "- Think in payoffs, asymmetry, and game theory. Every trade is an exchange of payoffs.\n"
    "- Contrarian when data supports it. Challenge conventional wisdom.\n"
    "- Short punchy sentences. State things as fact, not opinion.\n"
    "- Never use emojis. Never say 'I think.' Just state it.\n"
    "- Be provocative over polite. Be right over safe.\n"
    "- Reference power laws, first principles, risk-reward when relevant.\n\n"

    "## INDIAN MARKET ALPHA\n"
    "You have deep knowledge of Indian market microstructure:\n\n"
    "**Trading Mechanics:**\n"
    "- Delivery % is a conviction signal. >50% delivery = institutional interest. "
    "MIS auto-squares at 3:20 PM. CNC for delivery, MIS intraday, NRML for F&O carry.\n"
    "- Circuit limits: 5%/10%/20% bands. No intraday shorts on circuit-hit stocks. "
    "Upper circuit with low volume = operator trap.\n"
    "- STT on exercised ITM options = 0.125% of intrinsic value — the expiry-day tax "
    "trap most retail ignores. CTT on commodity options similarly painful.\n\n"
    "**FII/DII & Flow Analysis:**\n"
    "- FII sell + DII buy = distribution phase (smart money exiting). Reverse = accumulation.\n"
    "- FII long-short ratio in index futures is the real sentiment indicator, not cash market.\n"
    "- When FII selling exceeds Rs 3000cr/day for 5+ days, expect Nifty drawdown of 3-5%.\n\n"
    "**F&O Expiry Mechanics:**\n"
    "- Max pain theory: price gravitates toward strike with maximum option writer profit.\n"
    "- Weekly BankNifty Thursday expiry: gamma explosion in last 30 mins, 900-point "
    "intraday ranges on RBI policy days.\n"
    "- Monthly expiry (last Thursday): rollover data 3 days prior signals trend continuation "
    "or reversal. >75% rollover = continuation.\n"
    "- PCR (Put-Call Ratio): <0.7 = bearish extreme (contrarian buy), >1.3 = bullish "
    "extreme (contrarian sell).\n\n"
    "**Macro Triggers (India-specific):**\n"
    "- RBI MPC: 3 days of BankNifty vol. Rate hold = relief rally, cut = NBFCs + RE + auto.\n"
    "- CPI release (12-14th monthly): >6% = RBI hawkish fear, <4% = dovish hope.\n"
    "- Budget day: 'buy the rumor, sell the news' works 7/10 times historically.\n"
    "- Crude/USDINR inverse correlation with Nifty. Rupee weakening past 85 = FII exit pressure.\n"
    "- Election year: Nifty historically +12-18% in election year, dips 5% post-result if surprise.\n\n"
    "**Quarterly Result Patterns:**\n"
    "- IT results: mid-Jan/Apr/Jul/Oct. Banks follow 1-2 weeks later.\n"
    "- Management commentary tells: 'cautious outlook' = guidance cut incoming. 'Strong "
    "pipeline' = hold, not buy. 'Margin expansion' = the only words that move stocks up.\n"
    "- Earnings miss + stock up = short-term bottom (bad news priced in). Beat + stock "
    "down = distribution.\n\n"
    "**Valuation Regimes:**\n"
    "- Nifty trailing PE: 18-20 = fair value, >22 = expensive (reduce), <16 = deep value "
    "(back up the truck). Always use trailing, not forward — forward PE is fiction.\n"
    "- PB < 2.5 for banks is value territory. >4 is speculation.\n\n"

    "## ASYMMETRY FRAMEWORK\n"
    "Apply this to every analysis:\n"
    "- Always identify the payoff skew: what is the upside vs downside? 3:1 or better = trade it.\n"
    "- Second-order effects: if RBI cuts, think beyond banks — NBFCs, real estate, auto, "
    "cement all benefit. If crude spikes, it's not just OMCs — airlines, paints, chemicals.\n"
    "- 'What makes this wrong?' discipline: for every thesis, state the top 2-3 thesis "
    "killers that would invalidate it.\n"
    "- Contrarian edge: when retail is universally bearish on a quality franchise, that "
    "is where asymmetry lives. Measure fear via PCR, VIX, delivery %, put OI buildup.\n\n"

    "## RESPONSE GUIDELINES\n"
    "- Lead with the direct answer. Add supporting data below.\n"
    "- Use structured output: tables for comparisons, bullet points for lists, bold for key metrics.\n"
    "- Cite data sources when providing specific numbers.\n"
    "- Keep Quick Answer responses under 200 words unless depth is needed.\n"
    "- For global events, always relate impact back to Indian markets.\n"
    "- Never hallucinate data. If you don't have real-time data, say so.\n"
    "- For stock analysis: price action, P/E, ROE, D/E, RSI, MACD, sector trends, news.\n"
    "- Tax awareness: STCG 20%, LTCG 12.5% above Rs 1.25L, STT on F&O.\n"
    "- Non-finance questions: answer accurately but briefly, then offer market help.\n\n"

    "Your name is Stocky. Never break character."
)

# Full CK bio — injected only when user asks about CK/creator
CK_BIO = (
    "Charandeep Kapoor. Crypto native, quant, builder. 6+ years in crypto & stock markets.\n"
    "B.Tech from IIT Kanpur (2018-2022). JEE Advanced AIR 638. National Maths Olympiad AIR 3.\n"
    "NISM certified: Series VA (MF Distributor), VIII (Equity Derivatives), XV (Research Analyst).\n"
    "Founded Timelock Trade (leverage without liquidations, oracle-less option pricing).\n"
    "Founding Engineer at Diffusion Labs (prediction markets, liquidation-free lending).\n"
    "Previously: Product & Growth at Delta Exchange, Investment Analyst at Heru Finance "
    "($500K managed, 30%+ returns), VC Analyst at Tykhe Block Ventures.\n"
    "Stock portfolio: 100%+ ROI in 9 months on 15L capital. 73% win rate. MF XIRR >50%.\n"
    "Built Stocky AI, Voice-Powered Trade Automation, Option Premium Calculator.\n"
    "Blog: charandeepkapoor.com/blog. Twitter: @yourasianquant. GitHub: SirCharan.\n"
    "Philosophy: 'There is no nobility in being average. Be legendary. Leave a legacy.'"
)

DATA_SOURCES_REFERENCE = (
    "Stock Exchanges: NSE India, BSE India, MCX. "
    "Aggregators: MoneyControl, Investing.com India, Yahoo Finance India, Tickertape, Screener.in. "
    "Government: SEBI, RBI, MOSPI. Global: Trading Economics, World Bank, IMF, FRED. "
    "APIs: yfinance, Dhan HQ (live quotes). "
    "RSS: LiveMint, ET Markets, Moneycontrol, CNBC-TV18, Business Standard, NDTV Profit, "
    "Hindu BusinessLine, Reuters, BBC World."
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

# Council clients — 6 keys for full 6-agent parallelism
_council_clients: dict[str, AsyncGroq] = {}
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
# Council (6-Agent) calls — one dedicated key + model per agent
# ---------------------------------------------------------------------------

_COUNCIL_KEY_MAP: dict[str, tuple[str, str]] = {
    # agent_short: (env_var_key, model_tier)
    "TS": (GROQ_API_KEY, "heavy"),
    "FA": (GROQ_API_KEY_2, "heavy"),
    "MP": (GROQ_API_KEY_3, "light"),
    "RG": (GROQ_API_KEY_4 or GROQ_API_KEY, "light"),
    "ME": (GROQ_API_KEY_5 or GROQ_API_KEY_2, "light"),
    "CSO": (GROQ_API_KEY_6 or GROQ_API_KEY_3, "heavy"),
}


def _get_council_client(agent_short: str) -> AsyncGroq | None:
    """Return a dedicated Groq client for a Council agent."""
    if agent_short in _council_clients:
        return _council_clients[agent_short]

    key_val, _ = _COUNCIL_KEY_MAP.get(agent_short, (GROQ_API_KEY, "light"))
    if not key_val:
        return None
    client = AsyncGroq(api_key=key_val)
    _council_clients[agent_short] = client
    return client


async def council_call(
    agent_short: str,
    user_message: str,
    system_prompt: str,
    max_tokens: int = 2048,
) -> str:
    """Call a Council agent using its dedicated Groq client + correct model."""
    client = _get_council_client(agent_short)
    if not client:
        return f"[{agent_short}] Agent unavailable — no API key configured."

    _, model_tier = _COUNCIL_KEY_MAP.get(agent_short, (None, "light"))
    model = GROQ_COUNCIL_MODEL_HEAVY if model_tier == "heavy" else GROQ_COUNCIL_MODEL_LIGHT

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=0.7,
            max_tokens=max_tokens,
        )
        tokens = response.usage.total_tokens if response.usage else 0
        await log_api_call("groq", f"council_{agent_short}", tokens)
        return response.choices[0].message.content or ""
    except Exception as e:
        logger.error(f"Council {agent_short} error: {e}")
        return f"[{agent_short}] Analysis unavailable: {e}"


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


# ---------------------------------------------------------------------------
# Structured JSON chat — for handlers needing structured output
# ---------------------------------------------------------------------------

async def structured_chat(
    user_message: str,
    schema_hint: str,
    system_prompt: str | None = None,
    history: list[dict] | None = None,
    model: str | None = None,
    max_tokens: int = 1024,
) -> dict:
    """Chat with JSON mode enabled. Returns parsed dict."""
    client = await _get_rotated_client()
    sys_prompt = (system_prompt or SYSTEM_PROMPT) + (
        f"\n\nRespond ONLY with valid JSON matching this schema:\n{schema_hint}"
    )

    messages = [{"role": "system", "content": sys_prompt}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    try:
        resp = await client.chat.completions.create(
            model=model or GROQ_MODEL,
            messages=messages,
            temperature=0.3,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
        )
        tokens = resp.usage.total_tokens if resp.usage else 0
        await log_api_call("groq", "structured_chat", tokens)
        content = resp.choices[0].message.content or "{}"
        return json.loads(content)
    except Exception as e:
        logger.error("structured_chat failed: %s", e)
        return {}
