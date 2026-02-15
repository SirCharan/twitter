import logging
from datetime import datetime, timezone, timedelta

from bot import database
from bot.kite_client import KiteClient

logger = logging.getLogger(__name__)
IST = timezone(timedelta(hours=5, minutes=30))


def _is_market_hours() -> bool:
    now = datetime.now(IST)
    # Weekends
    if now.weekday() >= 5:
        return False
    # 9:15 AM to 3:30 PM IST
    market_open = now.replace(hour=9, minute=15, second=0, microsecond=0)
    market_close = now.replace(hour=15, minute=30, second=0, microsecond=0)
    return market_open <= now <= market_close


async def check_alerts(kite_client: KiteClient, bot, chat_id: int):
    """Called periodically by scheduler. Checks all active alerts."""
    if not _is_market_hours():
        return

    active = await database.get_active_alerts()
    if not active:
        return

    instruments = list(set(a["symbol"] for a in active))
    try:
        ltps = await kite_client.get_ltp(*instruments)
    except Exception as e:
        logger.error(f"Alert LTP fetch failed: {e}")
        return

    for alert in active:
        ltp_data = ltps.get(alert["symbol"])
        if not ltp_data:
            continue
        ltp = ltp_data["last_price"]

        triggered = False
        if alert["direction"] == "above" and ltp >= alert["target_price"]:
            triggered = True
        elif alert["direction"] == "below" and ltp <= alert["target_price"]:
            triggered = True

        if triggered:
            await database.mark_alert_triggered(alert["id"])
            try:
                await bot.send_message(
                    chat_id,
                    f"ALERT: {alert['symbol']} is now {ltp:,.2f} "
                    f"({alert['direction']} {alert['target_price']:,.2f})",
                )
            except Exception as e:
                logger.error(f"Failed to send alert notification: {e}")
