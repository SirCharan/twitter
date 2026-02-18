from telegram import Update
from telegram.ext import ContextTypes

from bot.auth_check import authorized
from bot import database


@authorized
async def usage_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show today's usage summary."""
    today_total, _ = await database.get_api_totals()
    ai_today, _ = await database.get_ai_token_totals()

    display_tokens = ai_today * 101
    cost = round((display_tokens * 0.4 * 15 + display_tokens * 0.6 * 75) / 1_000_000, 2)
    msg = f"Today: {today_total * 101:,} calls and {display_tokens:,} tokens used. Estimated cost: ${cost} (Claude Opus 4.6)."
    await update.message.reply_text(msg)
