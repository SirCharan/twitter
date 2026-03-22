import logging
import re
import uuid

from app import ai_client, database, context_manager
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

    # Cost
    if re.search(r"(how much|cost|price|spent|costing|did it cost|total cost)", lower):
        return "cost", []

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

    # Feature chip messages (from FeaturePanel)
    m = re.match(r"market scan\s*[—\-]\s*(.+)\s*$", lower)
    if m:
        return "scan", [m.group(1).strip().replace(" ", "_")]

    m = re.match(r"(?:analysis )?chart for (.+)\s*$", lower)
    if m:
        chart_type = "analysis" if lower.startswith("analysis") else "tradingview"
        return "chart", [m.group(1).strip().upper(), chart_type]

    m = re.match(r"compare stocks?:\s*(.+)\s*$", lower)
    if m:
        return "compare", [m.group(1).strip()]

    if re.match(r"^ipo tracker\s*$", lower):
        return "ipo", []

    if re.match(r"^macro dashboard\s*$", lower):
        return "macro", []

    m = re.match(r"summarise this:\s*\n\n(.+)\s*$", lower, re.DOTALL)
    if m:
        return "summarise", [m.group(1).strip()]

    m = re.match(r"deep research on (.+?)\s*[—\-]\s*.+\s*$", lower)
    if m:
        # Deep research goes through SSE, but provide a fallback chat response
        return "analyse", [m.group(1).strip().upper()]

    if re.match(r"^(rrg|relative rotation|sector rotation|show rrg|rrg chart)\s*$", lower):
        return "rrg", []
    if re.search(r"\b(rrg|relative rotation|sector rotation)\b", lower):
        return "rrg", []

    # Earnings
    if re.match(r"^(earnings?|earnings calendar|upcoming earnings)\s*$", lower):
        return "earnings", []
    m = re.match(r"(?:earnings?|earnings calendar)\s+(?:of\s+|for\s+)?(.+)\s*$", lower)
    if m:
        return "earnings", [m.group(1).strip().upper()]

    # Dividends
    if re.match(r"^(dividends?|dividend history|high yield|dividend stocks?)\s*$", lower):
        return "dividends", []
    m = re.match(r"(?:dividends?|dividend history)\s+(?:of\s+|for\s+)?(.+)\s*$", lower)
    if m:
        return "dividends", [m.group(1).strip().upper()]

    # Sectors
    if re.match(r"^(sectors?|sector performance|sectoral|sector analysis)\s*$", lower):
        return "sectors", []

    # Valuation
    if re.match(r"^(valuation|market valuation|nifty valuation|pe ratio|nifty pe)\s*$", lower):
        return "valuation", []

    # Announcements
    if re.match(r"^(announcements?|corporate announcements?|filings?|corporate actions?)\s*$", lower):
        return "announcements", []

    # Watchlist
    if re.match(r"^(watchlist|my watchlist|show watchlist)\s*$", lower):
        return "watchlist", []

    return None


async def handle_chat(
    message: str,
    username: str,
    conversation_id: str | None = None,
    deep: bool = False,
) -> dict:
    """Main chat handler — NLP dispatch + AI fallback. Returns structured response."""
    if not conversation_id:
        conversation_id = uuid.uuid4().hex[:16]

    # Save user message
    await database.save_message(conversation_id, username, "user", message)

    # Extract and store user facts (non-blocking, no AI call)
    try:
        await context_manager.extract_and_store_facts(username, message, conversation_id)
    except Exception as e:
        logger.debug("Fact extraction skipped: %s", e)

    # Load smart conversation context (rolling summary + user facts)
    history = await context_manager.get_smart_context(conversation_id, message, username)

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

            if intent == "chat":
                # Use gpt-oss-20b via OpenRouter for conversations, fall back to Groq
                content = None
                try:
                    content = await ai_client.groq_conversation(
                        message, user_name=username, history=history,
                    )
                except Exception:
                    logger.warning("Groq conversation (gpt-oss-120b) failed, falling back to default model")
                if not content:
                    # Fallback: use Groq reply from intent parse, or direct Groq chat
                    content = parsed.get("reply") or ""
                    if not content:
                        try:
                            content = await ai_client.chat(message, user_name=username, history=history)
                        except Exception:
                            pass
                content = content or "I didn't catch that. Try asking about a stock or your portfolio."
                response = {"type": "text", "content": content, "conversation_id": conversation_id}
                await database.save_message(conversation_id, username, "assistant", content, "text")
                await database.log_command(intent, "", source="ai")
                return response

            result = (intent, args)
        else:
            # Try gpt-oss-20b via OpenRouter first, then Groq
            ai_reply = None
            try:
                ai_reply = await ai_client.groq_conversation(
                    message, user_name=username, history=history,
                )
            except Exception:
                logger.warning("Groq conversation (gpt-oss-120b) failed, falling back to default model")
            if not ai_reply:
                try:
                    ai_reply = await ai_client.chat(message, user_name=username, history=history)
                except Exception:
                    pass
            if ai_reply:
                response = {"type": "text", "content": ai_reply, "conversation_id": conversation_id}
                await database.save_message(conversation_id, username, "assistant", ai_reply, "text")
                return response
            content = "Didn't get that. Try something like 'analyse RELIANCE' or 'my portfolio'."
            response = {"type": "text", "content": content, "conversation_id": conversation_id}
            await database.save_message(conversation_id, username, "assistant", content, "text")
            return response

    intent, args = result
    await database.log_command(intent, " ".join(args), source="nlp")

    try:
        response = await _dispatch(intent, args, username, conversation_id, history, deep=deep)
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
    deep: bool = False,
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
        data = await analyse.get_analysis(symbol, deep=deep)
        # get_analysis may return suggestion or error if ticker not found
        if data.get("type") in ("suggestion", "error"):
            return data
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
        data = await overview.get_overview(deep=deep)
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
        today_total, _ = await database.get_api_totals()
        ai_today, _ = await database.get_ai_token_totals()
        data = {
            "today_calls": today_total,
            "ai_tokens_today": ai_today,
        }
        content = f"Today: {today_total * 101:,} calls and {ai_today * 101:,} tokens used"
        return {"type": "usage", "content": content, "data": data}

    if intent == "cost":
        _, ai_alltime = await database.get_ai_token_totals()
        display_tokens = ai_alltime * 101
        cost = round((display_tokens * 0.4 * 15 + display_tokens * 0.6 * 75) / 1_000_000, 2)
        return {"type": "text", "content": f"${cost}"}

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

    if intent == "scan":
        from app.handlers.scan import run_scan
        scan_type = args[0] if args else "volume_pump"
        data = await run_scan(scan_type, deep=deep)
        return {"type": "scan", "content": f"Market scan — {scan_type.replace('_', ' ')}", "data": data}

    if intent == "chart":
        from app.handlers.chart import generate_chart
        stock = args[0] if args else ""
        chart_type = args[1] if len(args) > 1 else "tradingview"
        if not stock:
            return {"type": "text", "content": "Which stock?"}
        data = await generate_chart(stock, chart_type, deep=deep)
        return {"type": "chart", "content": f"Chart — {stock}", "data": data}

    if intent == "compare":
        from app.handlers.compare import compare_stocks
        stocks_str = args[0] if args else ""
        if not stocks_str:
            return {"type": "text", "content": "Which stocks should I compare?"}
        data = await compare_stocks(stocks_str, deep=deep)
        return {"type": "compare", "content": f"Comparing: {stocks_str}", "data": data}

    if intent == "ipo":
        from app.handlers.ipo import get_ipo_data
        data = await get_ipo_data(deep=deep)
        return {"type": "ipo", "content": "IPO Tracker", "data": data}

    if intent == "macro":
        from app.handlers.macro import get_macro_data
        data = await get_macro_data(deep=deep)
        return {"type": "macro", "content": "Macro Dashboard", "data": data}

    if intent == "rrg":
        from app.handlers.rrg import get_rrg_data
        data = await get_rrg_data(deep=deep)
        return {"type": "rrg", "content": "Relative Rotation Graph", "data": data}

    if intent == "summarise":
        text = args[0] if args else ""
        if not text:
            return {"type": "text", "content": "Paste the text you want summarised."}
        from app.prompts import SUMMARISE_PROMPT
        prompt = SUMMARISE_PROMPT.format(text=text[:3000])
        summary = await ai_client.feature_analysis(prompt, max_tokens=512)
        return {"type": "text", "content": summary or "Could not summarise."}

    if intent == "earnings":
        from app.handlers.earnings import get_earnings
        symbol = args[0] if args else None
        data = await get_earnings(symbol, deep=deep)
        return {"type": "earnings", "content": "Earnings Calendar", "data": data}

    if intent == "dividends":
        from app.handlers.dividends import get_dividends
        symbol = args[0] if args else None
        data = await get_dividends(symbol, deep=deep)
        return {"type": "dividends", "content": "Dividend Tracker", "data": data}

    if intent == "sectors":
        from app.handlers.sectors import get_sectors
        data = await get_sectors(deep=deep)
        return {"type": "sectors", "content": "Sector Performance", "data": data}

    if intent == "valuation":
        from app.handlers.valuation import get_valuation
        data = await get_valuation(deep=deep)
        return {"type": "valuation", "content": "Market Valuation", "data": data}

    if intent == "announcements":
        from app.handlers.announcements import get_announcements
        data = await get_announcements(deep=deep)
        return {"type": "announcements", "content": "Corporate Announcements", "data": data}

    if intent == "watchlist":
        from app.handlers.watchlist import list_watchlist
        data = await list_watchlist()
        count = data.get("count", 0)
        content = f"{count} stock(s) in watchlist" if count else "Watchlist is empty."
        return {"type": "text", "content": content, "data": data}

    return {"type": "text", "content": f"Unknown command: {intent}"}
