import logging

from telegram.ext import ApplicationBuilder, CallbackQueryHandler, CommandHandler, MessageHandler, filters

from bot.config import TELEGRAM_BOT_TOKEN
from bot.database import init_db, log_command
from bot.kite_auth import ensure_authenticated
from bot.kite_client import KiteClient
from bot.scheduler import setup_scheduler

from bot.handlers import alert, analyse, auth, exitrule, help, market, maxloss, news, nlp, portfolio, stoploss, trading, usage

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


async def post_init(app):
    """Runs after Application init, before polling starts."""
    await init_db()
    app.bot_data["kite"] = KiteClient()

    # Try auto-login on startup
    try:
        await ensure_authenticated()
        logger.info("Startup auto-login successful")
    except Exception as e:
        logger.warning(f"Startup auto-login failed (use /login later): {e}")

    setup_scheduler(app)


async def track_command(update, context):
    """Log every slash command for usage stats. Runs in group -1 (before handlers)."""
    if update.message and update.message.text and update.message.text.startswith("/"):
        parts = update.message.text.split()
        cmd = parts[0].lstrip("/").split("@")[0]  # strip /  and @botname
        args = " ".join(parts[1:])
        try:
            await log_command(cmd, args, source="command")
        except Exception:
            pass  # don't block on logging failures


async def error_handler(update, context):
    """Global error handler."""
    logger.error("Exception while handling update:", exc_info=context.error)
    if update and update.effective_message:
        try:
            await update.effective_message.reply_text(f"Error: {context.error}")
        except Exception:
            pass


def main():
    app = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).post_init(post_init).build()

    # Command tracking (group -1 runs before all handlers)
    app.add_handler(MessageHandler(filters.COMMAND, track_command), group=-1)

    # Auth
    app.add_handler(CommandHandler("login", auth.login))
    app.add_handler(CommandHandler("auth", auth.auth_token))
    app.add_handler(CommandHandler("logout", auth.logout))
    app.add_handler(CommandHandler("status", auth.status))

    # Trading
    app.add_handler(CommandHandler("buy", trading.buy_command))
    app.add_handler(CommandHandler("sell", trading.sell_command))
    app.add_handler(CallbackQueryHandler(trading.order_callback, pattern="^(confirm|cancel)_order$"))

    # Portfolio
    app.add_handler(CommandHandler("portfolio", portfolio.portfolio))
    app.add_handler(CommandHandler("positions", portfolio.positions))
    app.add_handler(CommandHandler("holdings", portfolio.holdings))
    app.add_handler(CommandHandler("orders", portfolio.orders))
    app.add_handler(CommandHandler("margins", portfolio.margins_cmd))

    # Market & Analysis
    app.add_handler(CommandHandler("price", market.price))
    app.add_handler(CommandHandler("analyse", analyse.analyse))
    app.add_handler(CommandHandler("analyze", analyse.analyse))
    app.add_handler(CommandHandler("news", news.news_command))

    # Alerts
    app.add_handler(CommandHandler("alert", alert.add_alert))
    app.add_handler(CommandHandler("alerts", alert.list_alerts))
    app.add_handler(CommandHandler("delalert", alert.delete_alert_cmd))

    # Exit Rules (options based on underlying)
    app.add_handler(CommandHandler("exitrule", exitrule.add_exitrule))
    app.add_handler(CommandHandler("exitrules", exitrule.list_exitrules))
    app.add_handler(CommandHandler("delexitrule", exitrule.delete_exitrule))

    # Stop Loss
    app.add_handler(CommandHandler("sl", stoploss.sl_command))
    app.add_handler(CallbackQueryHandler(stoploss.sl_callback, pattern="^(confirm|cancel)_sl$"))

    # Max Loss
    app.add_handler(CommandHandler("maxloss", maxloss.maxloss_command))

    # Usage
    app.add_handler(CommandHandler("usage", usage.usage_command))

    # Help
    app.add_handler(CommandHandler("start", help.start))
    app.add_handler(CommandHandler("help", help.help_command))

    # Natural language fallback (must be last — catches all non-command text)
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, nlp.handle_text))

    # Fallback buttons (when Groq errors out)
    app.add_handler(CallbackQueryHandler(nlp.fallback_callback, pattern="^fallback_"))

    # Error handler
    app.add_error_handler(error_handler)

    logger.info("Starting Stocky AI bot...")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
