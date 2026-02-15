import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from bot.alerts import check_alerts
from bot.config import ALERT_CHECK_INTERVAL_SECONDS, ALLOWED_USER_IDS
from bot.exit_rules import check_exit_rules
from bot.kite_auth import auto_login
from bot.max_loss import check_and_enforce_max_loss, reset_daily_max_loss

logger = logging.getLogger(__name__)


async def _scheduled_auto_login():
    """Auto-login at 7:40 AM IST daily."""
    try:
        await auto_login()
        logger.info("Scheduled auto-login successful")
    except Exception as e:
        logger.error(f"Scheduled auto-login failed: {e}")


def setup_scheduler(app):
    """Set up all periodic jobs."""
    scheduler = AsyncIOScheduler()
    kite_client = app.bot_data["kite"]
    bot = app.bot
    chat_id = ALLOWED_USER_IDS[0] if ALLOWED_USER_IDS else 0

    if not chat_id:
        logger.warning("No ALLOWED_USER_IDS set — scheduler notifications disabled")
        return

    # Auto-login at 7:40 AM IST daily (tokens regenerate ~7:35 AM)
    scheduler.add_job(
        _scheduled_auto_login,
        "cron",
        hour=7,
        minute=40,
        timezone="Asia/Kolkata",
        id="auto_login",
        misfire_grace_time=300,
    )

    # Check price alerts every N seconds
    scheduler.add_job(
        check_alerts,
        "interval",
        seconds=ALERT_CHECK_INTERVAL_SECONDS,
        args=[kite_client, bot, chat_id],
        id="alert_check",
        misfire_grace_time=30,
    )

    # Check exit rules every N seconds (same interval as alerts)
    scheduler.add_job(
        check_exit_rules,
        "interval",
        seconds=ALERT_CHECK_INTERVAL_SECONDS,
        args=[kite_client, bot, chat_id],
        id="exit_rule_check",
        misfire_grace_time=30,
    )

    # Check max loss every 60 seconds
    scheduler.add_job(
        check_and_enforce_max_loss,
        "interval",
        seconds=60,
        args=[kite_client, bot, chat_id],
        id="max_loss_check",
        misfire_grace_time=30,
    )

    # Reset trades_blocked at 9:00 AM IST daily
    scheduler.add_job(
        reset_daily_max_loss,
        "cron",
        hour=9,
        minute=0,
        timezone="Asia/Kolkata",
        id="daily_reset",
        misfire_grace_time=300,
    )

    scheduler.start()
    app.bot_data["scheduler"] = scheduler
    logger.info("Scheduler started with %d jobs", len(scheduler.get_jobs()))
