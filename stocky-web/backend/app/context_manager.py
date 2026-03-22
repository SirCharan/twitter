"""
Smart conversation context manager for Stocky AI web.
Provides rolling conversation summaries and user fact extraction.
"""

import re
import logging
from app import database
from app.cache import cached

logger = logging.getLogger(__name__)

# Regex patterns for extracting user facts from messages
_FACT_PATTERNS = [
    (r"(?:i\s+hold|i\s+have|i\s+own|holding)\s+(\d+)?\s*(?:shares?\s+(?:of|in)\s+)?([A-Z][A-Z0-9&]+)", "holds"),
    (r"(?:i\s+bought|i\s+purchased|added)\s+([A-Z][A-Z0-9&]+)", "bought"),
    (r"(?:i(?:'m|\s+am)\s+(?:bullish|positive|optimistic)\s+(?:on|about)\s+)([A-Z][A-Z0-9&]+|\w+\s*sector)", "bullish_on"),
    (r"(?:i(?:'m|\s+am)\s+(?:bearish|negative|pessimistic)\s+(?:on|about)\s+)([A-Z][A-Z0-9&]+|\w+\s*sector)", "bearish_on"),
    (r"(?:my\s+risk\s+(?:tolerance|appetite)\s+is\s+)(low|moderate|medium|high|aggressive|conservative)", "risk_tolerance"),
    (r"(?:my\s+(?:portfolio|capital|investment)\s+(?:is|of)\s+(?:about\s+)?)([\d,.]+\s*(?:L|lakh|lakhs|Cr|crore|crores|K)?)", "portfolio_size"),
    (r"(?:i(?:'m|\s+am)\s+(?:a\s+)?)(swing\s+trader|day\s+trader|long\s+term\s+investor|positional\s+trader|scalper|intraday\s+trader)", "trading_style"),
    (r"(?:watching|tracking|monitoring|interested\s+in)\s+([A-Z][A-Z0-9&]+)", "watching"),
    (r"(?:i\s+sold|i\s+exited|booked\s+(?:profit|loss)\s+(?:on|in))\s+([A-Z][A-Z0-9&]+)", "sold"),
]

# Common English words to exclude from stock symbol extraction
_STOP_WORDS = frozenset({
    "THE", "AND", "FOR", "NOT", "BUT", "ARE", "WAS", "HAS", "HAD", "CAN",
    "WILL", "MAY", "ALL", "ANY", "WHO", "HOW", "WHY", "WHAT", "THIS", "THAT",
    "FROM", "WITH", "HAVE", "BEEN", "DOES", "SHOULD", "WOULD", "COULD",
    "WHICH", "THEIR", "ABOUT", "AFTER", "BEFORE", "WHERE", "WHEN", "THAN",
    "THEN", "ALSO", "JUST", "LIKE", "MORE", "ONLY", "OVER", "SUCH", "TAKE",
    "VERY", "YOUR", "INTO", "SOME", "THEM", "EACH", "MAKE", "MADE", "WELL",
    "BACK", "MUCH", "EVEN", "MOST", "BOTH", "FIND", "HERE", "KNOW", "WANT",
    "GIVE", "TOLD", "USER", "YES", "BUY", "SELL", "HOLD", "NIFTY", "BSE",
    "NSE", "IPO", "RBI", "GDP", "CPI", "STT", "SEBI", "MIS", "CNC",
})


async def extract_and_store_facts(username: str, message: str, conversation_id: str):
    """Extract user facts from a message using regex patterns. No AI call."""
    if not message or not username:
        return

    for pattern, fact_type in _FACT_PATTERNS:
        matches = re.finditer(pattern, message, re.IGNORECASE)
        for match in matches:
            groups = match.groups()
            try:
                if fact_type == "holds" and len(groups) >= 2:
                    qty = groups[0] or "?"
                    symbol = groups[1].upper()
                    await database.upsert_user_fact(username, f"holds_{symbol}", f"{qty} shares of {symbol}")
                elif fact_type in ("bought", "watching", "sold"):
                    symbol = groups[-1].upper() if groups else ""
                    if symbol and len(symbol) >= 2:
                        await database.upsert_user_fact(username, f"{fact_type}_{symbol}", symbol)
                elif fact_type in ("bullish_on", "bearish_on"):
                    target = groups[-1] if groups else ""
                    if target:
                        await database.upsert_user_fact(username, f"{fact_type}_{target}", target)
                elif fact_type in ("risk_tolerance", "portfolio_size", "trading_style"):
                    value = groups[-1] if groups else ""
                    if value:
                        await database.upsert_user_fact(username, fact_type, value.strip())
            except Exception as e:
                logger.debug("Fact extraction error for %s: %s", fact_type, e)


async def format_user_facts(username: str) -> str:
    """Get formatted user facts string for context injection."""
    facts = await database.get_user_facts(username)
    if not facts:
        return ""

    parts = []
    for f in facts:
        key, val = f["key"], f["value"]
        if key.startswith("holds_"):
            parts.append(f"Holds {val}")
        elif key.startswith("bought_"):
            parts.append(f"Recently bought {val}")
        elif key.startswith("sold_"):
            parts.append(f"Recently sold {val}")
        elif key.startswith("watching_"):
            parts.append(f"Watching {val}")
        elif key.startswith("bullish_on_"):
            parts.append(f"Bullish on {val}")
        elif key.startswith("bearish_on_"):
            parts.append(f"Bearish on {val}")
        elif key == "risk_tolerance":
            parts.append(f"Risk tolerance: {val}")
        elif key == "portfolio_size":
            parts.append(f"Portfolio size: {val}")
        elif key == "trading_style":
            parts.append(f"Style: {val}")
        else:
            parts.append(f"{key}: {val}")

    return "User context: " + ", ".join(parts[:10]) + "."


async def get_smart_context(
    conversation_id: str,
    current_message: str,
    username: str = "CK",
) -> list[dict]:
    """
    Build smart context for LLM calls.
    - If <=10 messages: return all as-is
    - If >10: extractive summary of older messages + keep last 5
    - Prepend user facts if available
    """
    if not conversation_id:
        return []

    history = await database.get_recent_history(conversation_id, limit=20)

    context: list[dict] = []

    # Add user facts
    facts_str = await format_user_facts(username)
    if facts_str:
        context.append({"role": "system", "content": facts_str})

    if len(history) <= 10:
        context.extend(history)
    else:
        older = history[:-5]
        recent = history[-5:]

        summary = _extractive_summary(older)
        if summary:
            context.append({"role": "system", "content": f"Previous conversation context: {summary}"})

        context.extend(recent)

    return context


def _extractive_summary(messages: list[dict]) -> str:
    """Generate a brief extractive summary — no AI call, pure regex."""
    if not messages:
        return ""

    stocks_mentioned: set[str] = set()
    topics: set[str] = set()

    for msg in messages:
        content = msg.get("content", "")
        symbols = re.findall(r"\b([A-Z]{2,10})\b", content)
        for s in symbols:
            if s not in _STOP_WORDS:
                stocks_mentioned.add(s)

        if msg.get("role") == "user":
            content_lower = content.lower()
            for topic in [
                "portfolio", "analysis", "market", "news", "chart", "compare",
                "earnings", "dividend", "sector", "valuation", "macro", "ipo",
                "trade", "buy", "sell", "technical", "fundamental",
            ]:
                if topic in content_lower:
                    topics.add(topic)

    parts = []
    if stocks_mentioned:
        parts.append(f"Stocks discussed: {', '.join(sorted(stocks_mentioned)[:8])}")
    if topics:
        parts.append(f"Topics: {', '.join(sorted(topics)[:6])}")
    parts.append(f"({len(messages)} earlier messages)")

    return ". ".join(parts)
