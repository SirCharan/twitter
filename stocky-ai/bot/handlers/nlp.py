import random
import re
import logging

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from bot.auth_check import authorized
from bot import ai_client, database
from bot.handlers import alert, analyse, auth, exitrule, help, market, maxloss, news, portfolio, stoploss, trading, usage

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Stocky's personality — direct, no-fluff, game-theoretic, confident
# ---------------------------------------------------------------------------

CONFUSED_RESPONSES = [
    "Didn't get that, {name}. Be specific.\n\n"
    "Try:\n"
    '  "how is reliance doing"\n'
    '  "price of INFY"\n'
    '  "buy 10 TCS at 3500"\n'
    '  "my portfolio"\n'
    '  "alert NIFTY above 24000"\n\n'
    "Or just type <b>help</b>.",

    "I'm good at markets, not mind-reading.\n\n"
    "Try something like:\n"
    '  "analyse HDFC BANK"\n'
    '  "sell 5 RELIANCE"\n'
    '  "show positions"\n\n'
    "<b>help</b> for the full list.",
]


def _get_name(update: Update) -> str:
    return update.effective_user.first_name or "boss"


# ---------------------------------------------------------------------------
# Pattern matching — first match wins
# ---------------------------------------------------------------------------

def _parse_natural(text: str) -> tuple[str, list[str]] | None:
    t = text.strip()
    lower = t.lower()

    # --- Help ---
    if lower in ("help", "commands", "what can you do", "what can you do?",
                  "start", "menu", "what do you do"):
        return "help", []

    # --- Who are you ---
    if re.match(r"^(who are you|what are you|what.?s your name|your name)", lower):
        return "whoami", []

    # --- Status ---
    if lower in ("status", "login status", "am i logged in", "am i logged in?",
                  "auth status", "check login"):
        return "status", []

    # --- Login ---
    if lower in ("login", "log in", "authenticate"):
        return "login", []

    # --- Usage ---
    if re.match(r"^(usage|stats|statistics|how much.+used|my usage|token usage|api usage|api calls)$", lower):
        return "usage", []

    # --- Portfolio commands ---
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

    # --- Buy ---
    m = re.match(
        r"buy\s+(\d+)\s+(?:shares?\s+(?:of\s+)?)?(.+?)(?:\s+(?:at|@)\s+([\d.]+))?(?:\s+(mis|cnc|nrml))?\s*$",
        lower,
    )
    if m:
        qty = m.group(1)
        symbol_raw = t[m.start(2):m.end(2)].strip()
        price, product = m.group(3), m.group(4)
        args = [symbol_raw, qty]
        if price:
            args.append(price)
        if product:
            args.append(product.upper())
        return "buy", args

    # --- Sell ---
    m = re.match(
        r"sell\s+(\d+)\s+(?:shares?\s+(?:of\s+)?)?(.+?)(?:\s+(?:at|@)\s+([\d.]+))?(?:\s+(mis|cnc|nrml))?\s*$",
        lower,
    )
    if m:
        qty = m.group(1)
        symbol_raw = t[m.start(2):m.end(2)].strip()
        price, product = m.group(3), m.group(4)
        args = [symbol_raw, qty]
        if price:
            args.append(price)
        if product:
            args.append(product.upper())
        return "sell", args

    # --- Stop Loss ---
    m = re.match(
        r"(?:sl|stop\s*loss)\s+(\S+)\s+(\d+)\s+([\d.]+)(?:\s+([\d.]+))?\s*$",
        lower,
    )
    if m:
        words = t.split()
        idx = 1 if lower.startswith("sl") else 2
        symbol_raw = words[idx] if idx < len(words) else m.group(1)
        args = [symbol_raw, m.group(2), m.group(3)]
        if m.group(4):
            args.append(m.group(4))
        return "sl", args

    # --- Alert (natural) ---
    m = re.search(
        r"(?:alert|notify|tell|ping)\s+(?:me\s+)?(?:when|if|for)?\s*(.+?)\s+(?:goes?\s+|crosses?\s+)?(above|below|over|under)\s+([\d.]+)",
        lower,
    )
    if m:
        symbol_raw = re.sub(r"^for\s+", "", m.group(1).strip())
        direction = "above" if m.group(2) in ("above", "over") else "below"
        return "alert", [symbol_raw.upper(), direction, m.group(3)]

    # --- Alert (simple) ---
    m = re.match(r"alert\s+(\S+)\s+(above|below)\s+([\d.]+)\s*$", lower)
    if m:
        return "alert", [m.group(1).upper(), m.group(2), m.group(3)]

    # --- List/Delete alerts ---
    if re.match(r"^(alerts?|my alerts?|list alerts?|show alerts?)$", lower):
        return "alerts", []
    m = re.match(r"(?:del(?:ete)?\s*alert|remove\s+alert)\s+(\d+)", lower)
    if m:
        return "delalert", [m.group(1)]

    # --- Exit rules ---
    if re.match(r"^(exit\s*rules?|my exit\s*rules?|list exit\s*rules?|show exit\s*rules?)$", lower):
        return "exitrules", []
    m = re.match(r"(?:del(?:ete)?\s*exit\s*rule|remove\s+exit\s*rule)\s+(\d+)", lower)
    if m:
        return "delexitrule", [m.group(1)]

    # --- Max Loss ---
    m = re.match(r"(?:max\s*loss|maxloss)\s+(daily|overall)\s+([\d.]+)", lower)
    if m:
        return "maxloss", [m.group(1), m.group(2)]
    if re.match(r"(?:max\s*loss|maxloss)\s+off", lower):
        return "maxloss", ["off"]
    if re.match(r"(?:max\s*loss|maxloss)\b", lower):
        return "maxloss", []

    # --- Price ---
    m = re.match(r"(?:price|ltp|quote)\s+(?:of\s+|for\s+)?(.+)\s*$", lower)
    if m:
        return "price", [m.group(1).strip().upper()]
    m = re.match(r"(?:what.?s|whats|get|show|check)\s+(?:the\s+)?(?:price|ltp|quote)\s+(?:of\s+|for\s+)?(.+)", lower)
    if m:
        return "price", [m.group(1).strip().upper()]
    m = re.match(r"how\s+much\s+is\s+(.+?)(?:\s+trading)?\s*\??$", lower)
    if m:
        return "price", [m.group(1).strip().upper()]
    m = re.match(r"(.+?)\s+(?:price|ltp|quote)\s*\??$", lower)
    if m:
        return "price", [m.group(1).strip().upper()]

    # --- News ---
    if re.match(r"^(news|headlines|market news|latest news|morning digest)\s*$", lower):
        return "news", []
    m = re.match(r"(?:news|headlines)\s+(?:on\s+|for\s+|about\s+)?(.+)\s*$", lower)
    if m:
        return "news", m.group(1).strip().upper().split()

    # --- Analyse ---
    m = re.match(r"(?:analy[sz]e|analysis(?:\s+of)?)\s+(.+)\s*$", lower)
    if m:
        return "analyse", m.group(1).strip().upper().split()

    m = re.match(r"(?:how(?:'s|\s+is)\s+)(.+?)(?:\s+doing|\s+looking|\s+performing)?\s*\??$", lower)
    if m:
        symbol = m.group(1).strip()
        if symbol and not re.match(r"(the market|market|nifty today)", symbol):
            return "analyse", symbol.upper().split()

    m = re.search(r"(?:what\s+(?:about|do you think (?:about|of))|tell\s+me\s+about|thoughts?\s+on)\s+(.+?)\s*\??$", lower)
    if m:
        return "analyse", m.group(1).strip().upper().split()

    m = re.match(r"(.+?)\s+(?:analysis|outlook|review|overview)\s*\??$", lower)
    if m:
        return "analyse", m.group(1).strip().upper().split()

    return None


# ---------------------------------------------------------------------------
# Dispatch — command handlers
# ---------------------------------------------------------------------------

DISPATCH = {
    "help": help.help_command,
    "status": auth.status,
    "login": auth.login,
    "portfolio": portfolio.portfolio,
    "positions": portfolio.positions,
    "holdings": portfolio.holdings,
    "orders": portfolio.orders,
    "margins": portfolio.margins_cmd,
    "buy": trading.buy_command,
    "sell": trading.sell_command,
    "sl": stoploss.sl_command,
    "alert": alert.add_alert,
    "alerts": alert.list_alerts,
    "delalert": alert.delete_alert_cmd,
    "exitrules": exitrule.list_exitrules,
    "delexitrule": exitrule.delete_exitrule,
    "maxloss": maxloss.maxloss_command,
    "price": market.price,
    "analyse": analyse.analyse,
    "news": news.news_command,
    "usage": usage.usage_command,
}


# ---------------------------------------------------------------------------
# Groq AI fallback
# ---------------------------------------------------------------------------

async def _ai_fallback(update: Update, context: ContextTypes.DEFAULT_TYPE, text: str, name: str):
    """Try Groq AI to interpret. On error, offer fixed responses or commands."""
    try:
        parsed = await ai_client.interpret_intent(text, user_name=name)
    except Exception as e:
        logger.error(f"AI fallback failed: {e}")
        await _offer_fallback_choices(update, name)
        return

    if not parsed:
        # AI unavailable (no API key)
        await update.message.reply_text(
            random.choice(CONFUSED_RESPONSES).format(name=name),
            parse_mode="HTML",
        )
        return

    intent = parsed.get("intent", "chat")
    args = parsed.get("args", [])
    reply = parsed.get("reply", "")

    # Chat intent — AI just wants to talk
    if intent == "chat":
        if reply:
            await update.message.reply_text(reply)
        else:
            # Shouldn't happen, but fallback
            try:
                ai_reply = await ai_client.chat(text, user_name=name)
                if ai_reply:
                    await update.message.reply_text(ai_reply)
                    return
            except Exception:
                pass
            await update.message.reply_text(
                random.choice(CONFUSED_RESPONSES).format(name=name),
                parse_mode="HTML",
            )
        return

    # AI recognized a command intent — dispatch it
    handler = DISPATCH.get(intent)
    if not handler:
        # Unknown intent from AI, just reply with whatever it said
        if reply:
            await update.message.reply_text(reply)
        else:
            await update.message.reply_text(
                random.choice(CONFUSED_RESPONSES).format(name=name),
                parse_mode="HTML",
            )
        return

    # Ensure args are strings
    context.args = [str(a) for a in args] if args else []
    logger.info(f"AI NLP: '{text}' -> /{intent} {' '.join(context.args)}")
    await database.log_command(intent, " ".join(context.args), source="ai")

    fn = handler.__wrapped__ if hasattr(handler, "__wrapped__") else handler
    await fn(update, context)


async def _offer_fallback_choices(update: Update, name: str):
    """When AI errors out, ask user to pick a quick action."""
    keyboard = [
        [
            InlineKeyboardButton("Portfolio", callback_data="fallback_portfolio"),
            InlineKeyboardButton("Positions", callback_data="fallback_positions"),
        ],
        [
            InlineKeyboardButton("Holdings", callback_data="fallback_holdings"),
            InlineKeyboardButton("Orders", callback_data="fallback_orders"),
        ],
        [
            InlineKeyboardButton("Help", callback_data="fallback_help"),
            InlineKeyboardButton("Usage", callback_data="fallback_usage"),
        ],
    ]
    await update.message.reply_text(
        f"Couldn't process that, {name}. Pick an action or use a /command directly.",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )


async def fallback_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle fallback button presses."""
    query = update.callback_query
    await query.answer()

    action = query.data.replace("fallback_", "")
    handler = DISPATCH.get(action)
    if handler:
        context.args = []
        fn = handler.__wrapped__ if hasattr(handler, "__wrapped__") else handler
        await fn(update, context)


# ---------------------------------------------------------------------------
# Main handler
# ---------------------------------------------------------------------------

@authorized
async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle natural language — Stocky's brain."""
    text = update.message.text
    if not text:
        return

    name = _get_name(update)
    result = _parse_natural(text)

    # --- Regex matched a command — dispatch directly ---
    if result is not None:
        intent, args = result

        # whoami is handled inline
        if intent == "whoami":
            await update.message.reply_text(
                f"I'm <b>Stocky</b>.\n\n"
                "I analyse stocks, execute trades on your Zerodha, "
                "track your portfolio, watch price levels, and enforce your risk limits.\n\n"
                "No fluff. No opinions you didn't ask for. Just data and execution.\n\n"
                "Type <b>help</b> to see what I can do.",
                parse_mode="HTML",
            )
            return

        handler = DISPATCH.get(intent)
        if not handler:
            return

        context.args = args
        logger.info(f"NLP: '{text}' -> /{intent} {' '.join(args)}")
        await database.log_command(intent, " ".join(args), source="nlp")

        fn = handler.__wrapped__ if hasattr(handler, "__wrapped__") else handler
        await fn(update, context)
        return

    # --- Regex didn't match — ask Groq AI ---
    await _ai_fallback(update, context, text, name)
