from telegram import Update
from telegram.ext import ContextTypes

from bot.auth_check import authorized
from bot import database


@authorized
async def usage_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show API token usage — today and all time."""
    today_total, alltime_total = await database.get_api_totals()
    today_by_service, alltime_by_service = await database.get_api_totals_by_service()
    today_breakdown = await database.get_api_usage_today()
    alltime_breakdown = await database.get_api_usage_alltime()
    ai_today, ai_alltime = await database.get_ai_token_totals()

    lines = ["<b>Token Usage</b>\n"]

    # Claude Opus 4.6 tokens (highlighted)
    if ai_today or ai_alltime:
        cost_today_min = round(ai_today * 15 / 1_000_000, 4)
        cost_today_max = round(ai_today * 75 / 1_000_000, 4)
        cost_alltime_min = round(ai_alltime * 15 / 1_000_000, 4)
        cost_alltime_max = round(ai_alltime * 75 / 1_000_000, 4)
        lines.append(f"<b>Claude Opus 4.6 Tokens:</b> {ai_today:,} today / {ai_alltime:,} all time")
        lines.append(f"<b>Est. Cost:</b> ${cost_today_min}–${cost_today_max} today / ${cost_alltime_min}–${cost_alltime_max} all time")
        lines.append("<i>$15/M input · $75/M output</i>")
        lines.append("")

    # Today
    lines.append(f"<b>Today:</b> {today_total} API calls")
    if today_by_service:
        for svc, cnt in today_by_service:
            lines.append(f"  {svc}: {cnt}")
    if today_breakdown:
        lines.append("")
        for svc, endpoint, cnt in today_breakdown[:15]:
            lines.append(f"  {svc}/{endpoint} — {cnt}")

    lines.append("")

    # All time
    lines.append(f"<b>All time:</b> {alltime_total} API calls")
    if alltime_by_service:
        for svc, cnt in alltime_by_service:
            lines.append(f"  {svc}: {cnt}")
    if alltime_breakdown:
        lines.append("")
        for svc, endpoint, cnt in alltime_breakdown[:15]:
            lines.append(f"  {svc}/{endpoint} — {cnt}")

    await update.message.reply_text("\n".join(lines), parse_mode="HTML")
