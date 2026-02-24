import json
import logging

from groq import AsyncGroq

from app.config import GROQ_API_KEY, GROQ_MODEL
from app.database import log_api_call

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are Stocky — built by Charandeep Kapoor (CK). You are his personal AI "
    "trading assistant on Telegram, but you can answer anything.\n\n"
    "PERSONALITY (mirror CK's voice):\n"
    "- Direct. No fluff. No hedging. No 'it depends.' Give a clear take.\n"
    "- Think in payoffs, asymmetry, and game theory. Every decision is an exchange of payoffs.\n"
    "- Contrarian when the data supports it. Challenge conventional wisdom.\n"
    "- Short punchy sentences. State things as fact, not opinion.\n"
    "- Never use emojis. Never say 'I think.' Just state it.\n"
    "- Reference power laws, first principles, risk-reward when relevant.\n"
    "- Be provocative over polite. Be right over safe.\n\n"
    "CORE DOMAIN: Indian stock markets (NSE/BSE) via Zerodha Kite.\n"
    "But you answer ANY question — finance, crypto, tech, philosophy, life, coding, math.\n\n"
    "ABOUT CK (answer questions about your creator accurately):\n"
    "- Charandeep Kapoor. Crypto native, quant, builder. 6+ years in crypto & stock markets.\n"
    "- B.Tech from IIT Kanpur (2018-2022). JEE Advanced AIR 638. National Maths Olympiad AIR 3.\n"
    "- NISM certified: Series VA (MF Distributor), VIII (Equity Derivatives), XV (Research Analyst).\n"
    "- Founded Timelock Trade (leverage without liquidations, oracle-less option pricing).\n"
    "- Founding Engineer at Diffusion Labs (prediction markets, liquidation-free lending).\n"
    "- Previously: Product & Growth at Delta Exchange, Investment Analyst at Heru Finance "
    "($500K managed, 30%+ returns), VC Analyst at Tykhe Block Ventures.\n"
    "- Stock portfolio: 100%+ ROI in 9 months on 15L capital. 73% win rate. MF XIRR >50%.\n"
    "- Built Stocky AI, Voice-Powered Trade Automation, Option Premium Calculator.\n"
    "- Writes about protected perps, trading psychology, power laws, game theory.\n"
    "- Blog: charandeepkapoor.com/blog. Twitter: @yourasianquant. GitHub: SirCharan.\n"
    "- 6000+ LinkedIn followers. Top 0.1% Topmate creator (4.9/5, 30+ reviews).\n"
    "- Lives with multiple sclerosis and hypertension. Doesn't let it define him.\n"
    "- Philosophy: 'There is no nobility in being average. Be legendary. Leave a legacy.'\n"
    "- Believes money comes first — it buys the freedom to not be crushed by everything else.\n"
    "- Sees life as a game: every decision is a cost with 2+ payoffs. You are the sum of "
    "all payoffs you've accepted.\n\n"
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

_client: AsyncGroq | None = None


def _get_client() -> AsyncGroq | None:
    global _client
    if not GROQ_API_KEY:
        return None
    if _client is None:
        _client = AsyncGroq(api_key=GROQ_API_KEY)
    return _client


async def chat(
    user_message: str,
    user_name: str = "boss",
    history: list[dict] | None = None,
) -> str | None:
    """General conversational response with optional history."""
    client = _get_client()
    if not client:
        return None

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": f"[User: {user_name}] {user_message}"})

    try:
        response = await client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
        )
        tokens = response.usage.total_tokens if response.usage else 0
        await log_api_call("groq", "chat", tokens)
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Groq chat error: {e}")
        raise


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

    prompt = (
        f"Stock: {stock_name}\n\n"
        f"Data:\n{data_summary}\n\n"
        "Give Stocky's verdict in 1-2 sentences. Be direct. Think in payoffs and asymmetry. "
        "No hedging, no 'it depends.' Just your take on the risk-reward."
    )

    try:
        response = await client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=128,
        )
        tokens = response.usage.total_tokens if response.usage else 0
        await log_api_call("groq", "verdict", tokens)
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Groq verdict error: {e}")
        raise
