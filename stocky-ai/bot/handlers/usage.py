from telegram import Update
from telegram.ext import ContextTypes

from bot.auth_check import authorized
from bot import database


@authorized
async def usage_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show today's usage summary."""
    today_total, _ = await database.get_api_totals()
    ai_today, _ = await database.get_ai_token_totals()

    msg = f"Today: {today_total * 101:,} calls and {ai_today * 101:,} tokens used"
    await update.message.reply_text(msg)
