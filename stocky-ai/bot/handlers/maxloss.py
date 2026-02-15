from telegram import Update
from telegram.ext import ContextTypes

from bot.auth_check import authorized
from bot import database
from bot.kite_client import KiteClient
from bot.max_loss import get_current_pnl


@authorized
async def maxloss_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """View or configure max loss settings.

    Usage:
        /maxloss              — Show current settings + today's P&L
        /maxloss daily 5000   — Set daily loss limit to 5000
        /maxloss overall 25000 — Set overall loss limit
        /maxloss off          — Disable all limits and unblock trading
    """
    args = context.args or []

    # No args: show status
    if not args:
        config = await database.get_max_loss_config()
        kite: KiteClient = context.bot_data["kite"]
        try:
            pnl = await get_current_pnl(kite)
            pnl_str = f"{'+' if pnl >= 0 else ''}{pnl:,.2f}"
        except Exception:
            pnl_str = "N/A (not logged in?)"
            pnl = 0

        daily = config["daily_limit"]
        overall = config["overall_limit"]
        blocked = bool(config["trades_blocked"])

        lines = ["<b>Max Loss Settings</b>\n"]
        lines.append(f"Daily Limit: {daily:,.2f}" if daily > 0 else "Daily Limit: OFF")
        lines.append(f"Overall Limit: {overall:,.2f}" if overall > 0 else "Overall Limit: OFF")
        lines.append(f"Today's P&L: {pnl_str}")
        lines.append(f"Trading: {'BLOCKED' if blocked else 'ALLOWED'}")

        if not blocked and pnl < 0 and daily > 0:
            remaining = daily - abs(pnl)
            lines.append(f"Remaining before daily limit: {remaining:,.2f}")

        await update.message.reply_text("\n".join(lines), parse_mode="HTML")
        return

    subcmd = args[0].lower()

    if subcmd == "daily" and len(args) > 1:
        try:
            limit = float(args[1])
        except ValueError:
            await update.message.reply_text("Amount must be a number.")
            return
        await database.update_max_loss_config(daily_limit=limit)
        await update.message.reply_text(f"Daily loss limit set to {limit:,.2f}")

    elif subcmd == "overall" and len(args) > 1:
        try:
            limit = float(args[1])
        except ValueError:
            await update.message.reply_text("Amount must be a number.")
            return
        await database.update_max_loss_config(overall_limit=limit)
        await update.message.reply_text(f"Overall loss limit set to {limit:,.2f}")

    elif subcmd == "off":
        await database.update_max_loss_config(daily_limit=0, overall_limit=0)
        await database.set_trades_blocked(False)
        await update.message.reply_text("Max loss limits disabled. Trading unblocked.")

    else:
        await update.message.reply_text(
            "Usage:\n"
            "/maxloss — Show status\n"
            "/maxloss daily <amount>\n"
            "/maxloss overall <amount>\n"
            "/maxloss off"
        )
