from telegram import Update
from telegram.ext import ContextTypes

from bot.auth_check import authorized
from bot import database


@authorized
async def add_alert(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Set a price alert. Usage: /alert INFY above 1500"""
    args = context.args or []
    if len(args) < 3:
        await update.message.reply_text("Usage: /alert <symbol> <above|below> <price>")
        return

    symbol = args[0].upper()
    if ":" not in symbol:
        symbol = f"NSE:{symbol}"
    direction = args[1].lower()
    if direction not in ("above", "below"):
        await update.message.reply_text("Direction must be 'above' or 'below'.")
        return
    try:
        target_price = float(args[2])
    except ValueError:
        await update.message.reply_text("Price must be a number.")
        return

    alert_id = await database.add_alert(symbol, target_price, direction)
    await update.message.reply_text(
        f"Alert #{alert_id} set: {symbol} {direction} {target_price:,.2f}"
    )


@authorized
async def list_alerts(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """List active alerts."""
    alerts = await database.get_active_alerts()
    if not alerts:
        await update.message.reply_text("No active alerts.")
        return

    lines = ["<b>Active Alerts</b>\n"]
    for a in alerts:
        lines.append(
            f"#{a['id']}: {a['symbol']} {a['direction']} {a['target_price']:,.2f}"
        )
    await update.message.reply_text("\n".join(lines), parse_mode="HTML")


@authorized
async def delete_alert_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Delete an alert. Usage: /delalert <id>"""
    args = context.args or []
    if not args:
        await update.message.reply_text("Usage: /delalert <id>")
        return
    try:
        alert_id = int(args[0])
    except ValueError:
        await update.message.reply_text("ID must be a number.")
        return

    deleted = await database.delete_alert(alert_id)
    if deleted:
        await update.message.reply_text(f"Alert #{alert_id} deleted.")
    else:
        await update.message.reply_text(f"Alert #{alert_id} not found.")
