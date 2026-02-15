import json
import logging

from groq import AsyncGroq

from bot.config import GROQ_API_KEY, GROQ_MODEL
from bot.database import log_api_call

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are Stocky — a personal stock trading assistant on Telegram.\n"
    "Personality: Direct, no-fluff, game-theoretic. You think in payoffs and asymmetry.\n"
    "You don't sugarcoat. You don't hedge with 'it depends.' You give a clear take.\n"
    "Keep responses SHORT — 2-3 sentences max for chat, 1-2 sentences for verdicts.\n"
    "Never use emojis. Never say 'I think' — just state it.\n"
    "You work with Indian markets (NSE/BSE) via Zerodha Kite.\n"
    "Your name is Stocky. Never break character. Never pretend to be anything else."
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
    "- alerts, exitrules: args=[]\n"
    "- sl: args=[symbol, qty, trigger, limit?]\n"
    "- maxloss: args=[daily|overall|off, amount?]\n"
    "- login, status, help, usage: args=[]\n"
    "- chat: for greetings, thanks, questions, or anything not a command. Put your reply in 'reply'.\n\n"
    "Rules:\n"
    "- You are Stocky. Stay in character in all replies.\n"
    "- For chat replies: be direct, no-fluff, game-theoretic. 2-3 sentences max.\n"
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


async def chat(user_message: str, user_name: str = "boss") -> str | None:
    """General conversational response. Returns None if Groq unavailable."""
    client = _get_client()
    if not client:
        return None

    try:
        response = await client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"[User: {user_name}] {user_message}"},
            ],
            temperature=0.7,
            max_tokens=256,
        )
        tokens = response.usage.total_tokens if response.usage else 0
        await log_api_call("groq", "chat", tokens)
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Groq chat error: {e}")
        raise


async def interpret_intent(text: str, user_name: str = "boss") -> dict | None:
    """Parse user text into intent + args. Returns None if Groq unavailable."""
    client = _get_client()
    if not client:
        return None

    try:
        response = await client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": INTENT_PROMPT},
                {"role": "user", "content": f"[User: {user_name}] {text}"},
            ],
            temperature=0.1,
            max_tokens=256,
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
    """AI-generated analysis verdict. Returns None if Groq unavailable."""
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
