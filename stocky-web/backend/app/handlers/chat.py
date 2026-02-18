import logging
import re
import uuid

from app import ai_client, database
from app.handlers import analyse, alerts, market, news, overview, portfolio, trading

logger = logging.getLogger(__name__)

HELP_TEXT = (
    "I'm Stocky. Built by Charandeep Kapoor.\n\n"
    "Talk to me in plain English.\n\n"
    "Examples:\n"
    '  "how is reliance doing"\n'
    '  "price of INFY"\n'
    '  "buy 10 TCS at 3500"\n'
    '  "my portfolio"\n'
    '  "alert NIFTY above 24000"\n'
    '  "market news"\n'
    '  "how\'s the market"\n\n'
    "I analyse stocks, execute trades on Zerodha, "
    "track your portfolio, watch price levels, "
    "and pull live market data.\n\n"
    "I think in payoffs and asymmetry. No fluff. No hedging. "
    "Just data, execution, and a clear take."
)

WHOAMI_TEXT = (
    "I'm Stocky. Built by Charandeep Kapoor.\n\n"
    "I analyse stocks, execute trades on your Zerodha, "
    "track your portfolio, watch price levels, "
    "and pull live market news and data.\n\n"
    "I think in payoffs and asymmetry. No fluff. No hedging. "
    "Just data, execution, and a clear take."
)


def _parse_natural(text: str) -> tuple[str, list[str]] | None:
    """Regex-based NLP. Returns (intent, args) or None."""
    t = text.strip()
    lower = t.lower()

    # Help
    if lower in ("help", "commands", "what can you do", "what can you do?",
                  "start", "menu", "what do you do"):
        return "help", []

    # Who are you
    if re.match(
        r"^(who are you|what are you|what.?s your name|your name|who built you|"
        r"who made you|who created you|who.?s your (creator|maker|builder|founder))",
        lower,
    ):
        return "whoami", []

    # Usage
    if re.match(r"^(usage|stats|statistics|my usage|token usage|api usage)$", lower):
        return "usage", []

    # Portfolio
    if re.search(r"\b(portfolio|summary)\b", lower):
        return "portfolio", []
    if re.search(r"\bpositions?\b", lower):
        return "positions", []
    if re.search(r"\bholdings?\b", lower):
        return "holdings", []
    if re.search(r"\b(orders?|today.?s orders?)\b", lower):
        return "orders", []
    if re.search(r"\b(margins?|funds?|balance)\b", lower):
        return "margins", []

    # Buy
    m = re.match(
        r"buy\s+(\d+)\s+(?:shares?\s+(?:of\s+)?)?(.+?)(?:\s+(?:at|@)\s+([\d.]+))?(?:\s+(mis|cnc|nrml))?\s*$",
        lower,
    )
    if m:
        symbol_raw = t[m.start(2):m.end(2)].strip()
        args = [symbol_raw, m.group(1)]
        if m.group(3):
            args.append(m.group(3))
        if m.group(4):
            args.append(m.group(4).upper())
        return "buy", args

    # Sell
    m = re.match(
        r"sell\s+(\d+)\s+(?:shares?\s+(?:of\s+)?)?(.+?)(?:\s+(?:at|@)\s+([\d.]+))?(?:\s+(mis|cnc|nrml))?\s*$",
        lower,
    )
    if m:
        symbol_raw = t[m.start(2):m.end(2)].strip()
        args = [symbol_raw, m.group(1)]
        if m.group(3):
            args.append(m.group(3))
        if m.group(4):
            args.append(m.group(4).upper())
        return "sell", args

    # Alert (natural)
    m = re.search(
        r"(?:alert|notify|tell|ping)\s+(?:me\s+)?(?:when|if|for)?\s*(.+?)\s+"
        r"(?:goes?\s+|crosses?\s+)?(above|below|over|under)\s+([\d.]+)",
        lower,
    )
    if m:
        symbol_raw = re.sub(r"^for\s+", "", m.group(1).strip())
        direction = "above" if m.group(2) in ("above", "over") else "below"
        return "alert", [symbol_raw.upper(), direction, m.group(3)]

    # Alert (simple)
    m = re.match(r"alert\s+(\S+)\s+(above|below)\s+([\d.]+)\s*$", lower)
    if m:
        return "alert", [m.group(1).upper(), m.group(2), m.group(3)]

    # Alerts list
    if re.match(r"^(alerts?|my alerts?|list alerts?|show alerts?)$", lower):
        return "alerts", []

    # Price
    m = re.match(r"(?:price|ltp|quote)\s+(?:of\s+|for\s+)?(.+)\s*$", lower)
    if m:
        return "price", [m.group(1).strip().upper()]
    m = re.match(
        r"(?:what.?s|whats|get|show|check)\s+(?:the\s+)?(?:price|ltp|quote)\s+(?:of\s+|for\s+)?(.+)",
        lower,
    )
    if m:
        return "price", [m.group(1).strip().upper()]
    m = re.match(r"how\s+much\s+is\s+(.+?)(?:\s+trading)?\s*\??$", lower)
    if m:
        return "price", [m.group(1).strip().upper()]
    m = re.match(r"(.+?)\s+(?:price|ltp|quote)\s*\??$", lower)
    if m:
        return "price", [m.group(1).strip().upper()]

    # Overview
    if re.match(
        r"^(overview|market overview|market summary|market status|"
        r"how.?s the market|how is the market|market today|markets?\s*$)",
        lower,
    ):
        return "overview", []

    # News
    if re.match(r"^(news|headlines|market news|latest news|morning digest)\s*$", lower):
        return "news", []
    m = re.match(r"(?:news|headlines)\s+(?:on\s+|for\s+|about\s+)?(.+)\s*$", lower)
    if m:
        return "news", [m.group(1).strip().upper()]
    m = re.search(r"(?:give\s+me\s+|show\s+|get\s+|fetch\s+|pull\s+)?news\s+(?:on\s+|for\s+|of\s+|about\s+)(.+)\s*$", lower)
    if m:
        return "news", [m.group(1).strip().upper()]
    # "tell me about X news", "any updates on X", "what's happening with X"
    m = re.search(r"(?:tell\s+me\s+about|any\s+updates?\s+on|what.?s\s+happening\s+with)\s+(.+?)(?:\s+news)?\s*\??$", lower)
    if m and "news" in lower:
        return "news", [m.group(1).strip().upper()]

    # Analyse
    m = re.match(r"(?:analy[sz]e|analysis(?:\s+of)?)\s+(.+)\s*$", lower)
    if m:
        return "analyse", [m.group(1).strip().upper()]

    m = re.match(r"(?:how(?:'s|\s+is)\s+)(.+?)(?:\s+doing|\s+looking|\s+performing)?\s*\??$", lower)
    if m:
        sym = m.group(1).strip()
        if sym and not re.match(r"(the market|market|nifty today)", sym):
            return "analyse", [sym.upper()]

    m = re.search(
        r"(?:what\s+(?:about|do you think (?:about|of))|tell\s+me\s+about|thoughts?\s+on)\s+(.+?)\s*\??$",
        lower,
    )
    if m:
        return "analyse", [m.group(1).strip().upper()]

    m = re.match(r"(.+?)\s+(?:analysis|outlook|review)\s*\??$", lower)
    if m:
        return "analyse", [m.group(1).strip().upper()]

    # Kite login/status
    if lower in ("login", "log in", "authenticate"):
        return "login", []
    if lower in ("status", "login status", "am i logged in", "am i logged in?"):
        return "status", []

    return None


async def handle_chat(
    message: str,
    username: str,
    conversation_id: str | None = None,
) -> dict:
    """Main chat handler — NLP dispatch + AI fallback. Returns structured response."""
    if not conversation_id:
        conversation_id = uuid.uuid4().hex[:16]

    # Save user message
    await database.save_message(conversation_id, username, "user", message)

    # Load conversation history for context
    history = await database.get_recent_history(conversation_id, limit=10)

    # Try regex NLP first
    result = _parse_natural(message)

    if result is None:
        # AI fallback
        try:
            parsed = await ai_client.interpret_intent(message, user_name=username, history=history)
        except Exception:
            parsed = None

        if parsed:
            intent = parsed.get("intent", "chat")
            args = [str(a) for a in parsed.get("args", [])]
            reply = parsed.get("reply", "")

            if intent == "chat":
                content = reply or "I didn't catch that. Try asking about a stock or your portfolio."
                response = {"type": "text", "content": content, "conversation_id": conversation_id}
                await database.save_message(conversation_id, username, "assistant", content, "text")
                await database.log_command(intent, "", source="ai")
                return response

            result = (intent, args)
        else:
            # Try direct chat
            try:
                ai_reply = await ai_client.chat(message, user_name=username, history=history)
                if ai_reply:
                    response = {"type": "text", "content": ai_reply, "conversation_id": conversation_id}
                    await database.save_message(conversation_id, username, "assistant", ai_reply, "text")
                    return response
            except Exception:
                pass
            content = "Didn't get that. Try something like 'analyse RELIANCE' or 'my portfolio'."
            response = {"type": "text", "content": content, "conversation_id": conversation_id}
            await database.save_message(conversation_id, username, "assistant", content, "text")
            return response

    intent, args = result
    await database.log_command(intent, " ".join(args), source="nlp")

    try:
        response = await _dispatch(intent, args, username, conversation_id, history)
    except Exception as e:
        logger.error(f"Handler error for {intent}: {e}")
        response = {
            "type": "error",
            "content": f"Error: {e}",
            "conversation_id": conversation_id,
        }

    # Save assistant response
    await database.save_message(
        conversation_id,
        username,
        "assistant",
        response.get("content", ""),
        response.get("type", "text"),
        response.get("data"),
    )

    response["conversation_id"] = conversation_id
    return response


async def _dispatch(
    intent: str,
    args: list[str],
    username: str,
    conversation_id: str,
    history: list[dict],
) -> dict:
    """Dispatch intent to the appropriate handler."""

    if intent == "help":
        return {"type": "text", "content": HELP_TEXT}

    if intent == "whoami":
        return {"type": "text", "content": WHOAMI_TEXT}

    if intent == "analyse":
        symbol = " ".join(args) if args else ""
        if not symbol:
            return {"type": "text", "content": "Give me a stock name. RELIANCE, INFY, TCS — anything."}
        data = await analyse.get_analysis(symbol)
        content = f"Analysis: {data.get('name', symbol)}"
        return {"type": "analysis", "content": content, "data": data}

    if intent == "price":
        symbol = args[0] if args else ""
        if not symbol:
            return {"type": "text", "content": "Which stock? Give me a symbol."}
        data = await market.get_price(symbol)
        if "error" in data:
            return {"type": "error", "content": data["error"]}
        sign = "+" if data["change"] >= 0 else ""
        content = f"{data['symbol']}: {data['ltp']:,.2f} ({sign}{data['pct_change']:.2f}%)"
        return {"type": "price", "content": content, "data": data}

    if intent == "portfolio":
        data = await portfolio.get_portfolio()
        inv = data["investments"]
        trd = data["trading"]
        sign = lambda x: "+" if x >= 0 else ""
        content = (
            f"Investments: {sign(inv['pnl'])}{inv['pnl']:,.2f} ({sign(inv['pct'])}{inv['pct']:.2f}%) | "
            f"Trading: {sign(trd['day_pnl'])}{trd['day_pnl']:,.2f} | "
            f"Day P&L: {sign(data['day_pnl'])}{data['day_pnl']:,.2f}"
        )
        return {"type": "portfolio", "content": content, "data": data}

    if intent == "positions":
        data = await portfolio.get_portfolio()
        inv = data["investments"]
        trd = data["trading"]
        sign = lambda x: "+" if x >= 0 else ""
        content = (
            f"Investments: {sign(inv['pnl'])}{inv['pnl']:,.2f} ({sign(inv['pct'])}{inv['pct']:.2f}%) | "
            f"Trading: {sign(trd['day_pnl'])}{trd['day_pnl']:,.2f} | "
            f"Day P&L: {sign(data['day_pnl'])}{data['day_pnl']:,.2f}"
        )
        return {"type": "portfolio", "content": content, "data": data}

    if intent == "holdings":
        data = await portfolio.get_holdings()
        content = f"{len(data)} holding(s)" if data else "No holdings."
        return {"type": "holdings", "content": content, "data": {"holdings": data}}

    if intent == "orders":
        data = await portfolio.get_orders()
        content = f"{len(data)} order(s) today" if data else "No orders today."
        return {"type": "orders", "content": content, "data": {"orders": data}}

    if intent == "margins":
        data = await portfolio.get_margins()
        content = "Margin summary"
        return {"type": "margins", "content": content, "data": data}

    if intent in ("buy", "sell"):
        txn_type = intent.upper()
        symbol = args[0] if args else ""
        qty = int(args[1]) if len(args) > 1 else 0
        price = float(args[2]) if len(args) > 2 else None
        product = args[3] if len(args) > 3 else "CNC"

        if not symbol or not qty:
            return {"type": "text", "content": f"Usage: {intent} <symbol> <qty> [price] [product]"}

        data = await trading.initiate_trade(
            username=username,
            conversation_id=conversation_id,
            symbol=symbol,
            qty=qty,
            txn_type=txn_type,
            price=price,
            product=product,
        )
        price_str = f"@ {data['price']}" if data.get("price") else "@ MARKET"
        content = f"{txn_type} {qty} {data['exchange']}:{data['symbol']} {price_str} ({data['product']})"
        return {
            "type": "trade_confirm",
            "content": content,
            "data": data,
            "action_id": data["action_id"],
        }

    if intent == "news":
        symbol = args[0] if args else None
        data = await news.get_news(symbol)
        content = data.get("headline", "News")
        return {"type": "news", "content": content, "data": data}

    if intent == "overview":
        data = await overview.get_overview()
        content = "Market Overview"
        return {"type": "overview", "content": content, "data": data}

    if intent == "alert":
        if len(args) < 3:
            return {"type": "text", "content": "Usage: alert <symbol> above|below <price>"}
        symbol, direction, price_str = args[0], args[1], args[2]
        data = await alerts.create_alert(symbol, direction, float(price_str))
        content = f"Alert set: {symbol} {direction} {price_str}"
        return {"type": "text", "content": content, "data": data}

    if intent == "alerts":
        data = await alerts.get_alerts()
        content = f"{len(data)} active alert(s)" if data else "No active alerts."
        return {"type": "alerts", "content": content, "data": {"alerts": data}}

    if intent == "usage":
        today_total, alltime_total = await database.get_api_totals()
        ai_today, ai_alltime = await database.get_ai_token_totals()
        # Claude Opus 4.6 pricing: $15/M input tokens, $75/M output tokens
        # Show range since input/output split is not tracked separately
        cost_today_min = round(ai_today * 15 / 1_000_000, 4)
        cost_today_max = round(ai_today * 75 / 1_000_000, 4)
        cost_alltime_min = round(ai_alltime * 15 / 1_000_000, 4)
        cost_alltime_max = round(ai_alltime * 75 / 1_000_000, 4)
        data = {
            "today_calls": today_total,
            "alltime_calls": alltime_total,
            "ai_tokens_today": ai_today,
            "ai_tokens_alltime": ai_alltime,
            "cost_today_min": cost_today_min,
            "cost_today_max": cost_today_max,
            "cost_alltime_min": cost_alltime_min,
            "cost_alltime_max": cost_alltime_max,
        }
        content = (
            f"Today: {today_total} calls, {ai_today:,} Claude Opus 4.6 tokens "
            f"(est. ${cost_today_min}–${cost_today_max})\n"
            f"All time: {alltime_total} calls, {ai_alltime:,} tokens "
            f"(est. ${cost_alltime_min}–${cost_alltime_max})\n"
            f"Pricing: $15/M input · $75/M output (Claude Opus 4.6)"
        )
        return {"type": "usage", "content": content, "data": data}

    if intent in ("login", "status"):
        from app.kite_auth import get_authenticated_kite, auto_login
        if intent == "login":
            try:
                await auto_login()
                return {"type": "text", "content": "Kite login successful."}
            except Exception as e:
                return {"type": "error", "content": f"Kite login failed: {e}"}
        else:
            kite_obj = await get_authenticated_kite()
            if kite_obj:
                return {"type": "text", "content": "Kite: Connected."}
            return {"type": "text", "content": "Kite: Not connected. Say 'login' to authenticate."}

    return {"type": "text", "content": f"Unknown command: {intent}"}
