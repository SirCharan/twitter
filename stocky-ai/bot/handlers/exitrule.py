from telegram import Update
from telegram.ext import ContextTypes

from bot.auth_check import authorized
from bot import database


@authorized
async def add_exitrule(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Set an exit rule for an option based on underlying price.

    Usage: /exitrule <option_symbol> <qty> <exitabove|exitbelow> <trigger_price> <underlying>
    Examples:
        /exitrule NIFTY25200CE 50 exitbelow 24800 NIFTY
        /exitrule BANKNIFTY48000PE 25 exitabove 48500 BANKNIFTY
        /exitrule RELIANCE1300CE 100 exitbelow 1280 RELIANCE
    """
    args = context.args or []
    if len(args) < 5:
        await update.message.reply_text(
            "Usage: /exitrule <option> <qty> <exitabove|exitbelow> <price> <underlying>\n\n"
            "Example: /exitrule NIFTY25200CE 50 exitbelow 24800 NIFTY"
        )
        return

    option_symbol = args[0].upper()
    try:
        qty = int(args[1])
    except ValueError:
        await update.message.reply_text("Quantity must be a number.")
        return

    direction = args[2].lower()
    if direction not in ("exitabove", "exitbelow"):
        await update.message.reply_text("Direction must be 'exitabove' or 'exitbelow'.")
        return

    try:
        trigger_price = float(args[3])
    except ValueError:
        await update.message.reply_text("Trigger price must be a number.")
        return

    underlying = args[4].upper()

    # Optional: exchange and product overrides
    option_exchange = "NFO"
    underlying_exchange = "NSE"
    product = "NRML"

    # Auto-detect: if underlying has ":" prefix, use it
    if ":" in underlying:
        underlying_exchange, underlying = underlying.split(":", 1)
    if ":" in option_symbol:
        option_exchange, option_symbol = option_symbol.split(":", 1)

    # Optional 6th arg for product
    if len(args) > 5:
        product = args[5].upper()

    rule_id = await database.add_exit_rule(
        option_symbol=option_symbol,
        option_exchange=option_exchange,
        qty=qty,
        direction=direction,
        trigger_price=trigger_price,
        underlying_symbol=underlying,
        underlying_exchange=underlying_exchange,
        product=product,
    )

    direction_word = "goes above" if direction == "exitabove" else "drops below"
    await update.message.reply_text(
        f"Exit rule #{rule_id} set:\n"
        f"SELL {qty}x {option_exchange}:{option_symbol}\n"
        f"When {underlying_exchange}:{underlying} {direction_word} {trigger_price:,.2f}"
    )


@authorized
async def list_exitrules(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """List active exit rules."""
    rules = await database.get_active_exit_rules()
    if not rules:
        await update.message.reply_text("No active exit rules.")
        return

    lines = ["<b>Active Exit Rules</b>\n"]
    for r in rules:
        direction_word = "above" if r["direction"] == "exitabove" else "below"
        lines.append(
            f"#{r['id']}: SELL {r['qty']}x {r['option_exchange']}:{r['option_symbol']} "
            f"when {r['underlying_exchange']}:{r['underlying_symbol']} "
            f"{direction_word} {r['trigger_price']:,.2f} ({r['product']})"
        )
    await update.message.reply_text("\n".join(lines), parse_mode="HTML")


@authorized
async def delete_exitrule(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Delete an exit rule. Usage: /delexitrule <id>"""
    args = context.args or []
    if not args:
        await update.message.reply_text("Usage: /delexitrule <id>")
        return
    try:
        rule_id = int(args[0])
    except ValueError:
        await update.message.reply_text("ID must be a number.")
        return

    deleted = await database.delete_exit_rule(rule_id)
    if deleted:
        await update.message.reply_text(f"Exit rule #{rule_id} deleted.")
    else:
        await update.message.reply_text(f"Exit rule #{rule_id} not found.")
