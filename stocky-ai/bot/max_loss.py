import logging

from bot import database
from bot.kite_client import KiteClient

logger = logging.getLogger(__name__)


async def get_current_pnl(kite_client: KiteClient) -> float:
    """Get today's realized + unrealized P&L from positions."""
    positions = await kite_client.get_positions()
    total_pnl = 0
    for pos in positions.get("day", []):
        total_pnl += pos.get("pnl", 0)
    return total_pnl


async def is_trading_blocked() -> bool:
    """Check if trading is currently blocked."""
    config = await database.get_max_loss_config()
    return bool(config["trades_blocked"])


async def check_and_enforce_max_loss(kite_client: KiteClient, bot, chat_id: int):
    """Called periodically. Blocks trading if max loss limits are breached."""
    config = await database.get_max_loss_config()

    # No limits set
    if config["daily_limit"] <= 0 and config["overall_limit"] <= 0:
        return

    # Already blocked
    if config["trades_blocked"]:
        return

    try:
        pnl = await get_current_pnl(kite_client)
    except Exception as e:
        logger.error(f"Max loss P&L check failed: {e}")
        return

    # Only block on losses (negative P&L)
    if pnl >= 0:
        return

    loss = abs(pnl)
    blocked = False
    reason = ""

    if config["daily_limit"] > 0 and loss >= config["daily_limit"]:
        blocked = True
        reason = f"Daily loss ({loss:,.2f}) exceeds limit ({config['daily_limit']:,.2f})"

    if config["overall_limit"] > 0 and loss >= config["overall_limit"]:
        blocked = True
        reason = f"Overall loss ({loss:,.2f}) exceeds limit ({config['overall_limit']:,.2f})"

    if blocked:
        await database.set_trades_blocked(True)
        logger.warning(f"Trading blocked: {reason}")
        try:
            await bot.send_message(
                chat_id,
                f"MAX LOSS TRIGGERED\n{reason}\n\n"
                f"Trading is now BLOCKED.\nUse /maxloss off to reset.",
            )
        except Exception as e:
            logger.error(f"Failed to send max loss notification: {e}")


async def reset_daily_max_loss():
    """Reset the trades_blocked flag. Called at 9:00 AM IST daily."""
    await database.set_trades_blocked(False)
    logger.info("Daily max loss reset — trading unblocked")
