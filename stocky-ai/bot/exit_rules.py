import logging
from datetime import datetime, timezone, timedelta

from bot import database
from bot.kite_client import KiteClient

logger = logging.getLogger(__name__)
IST = timezone(timedelta(hours=5, minutes=30))


def _is_market_hours() -> bool:
    now = datetime.now(IST)
    if now.weekday() >= 5:
        return False
    market_open = now.replace(hour=9, minute=15, second=0, microsecond=0)
    market_close = now.replace(hour=15, minute=30, second=0, microsecond=0)
    return market_open <= now <= market_close


async def check_exit_rules(kite_client: KiteClient, bot, chat_id: int):
    """Called periodically. Monitors underlying prices and auto-exits options."""
    if not _is_market_hours():
        return

    rules = await database.get_active_exit_rules()
    if not rules:
        return

    # Batch-fetch underlying LTPs
    underlyings = list(set(
        f"{r['underlying_exchange']}:{r['underlying_symbol']}" for r in rules
    ))
    try:
        ltps = await kite_client.get_ltp(*underlyings)
    except Exception as e:
        logger.error(f"Exit rule LTP fetch failed: {e}")
        return

    for rule in rules:
        key = f"{rule['underlying_exchange']}:{rule['underlying_symbol']}"
        ltp_data = ltps.get(key)
        if not ltp_data:
            continue
        ltp = ltp_data["last_price"]

        triggered = False
        if rule["direction"] == "exitabove" and ltp >= rule["trigger_price"]:
            triggered = True
        elif rule["direction"] == "exitbelow" and ltp <= rule["trigger_price"]:
            triggered = True

        if triggered:
            # Auto-sell the option position
            try:
                order_id = await kite_client.place_order(
                    symbol=rule["option_symbol"],
                    exchange=rule["option_exchange"],
                    txn_type="SELL",
                    quantity=rule["qty"],
                    order_type="MARKET",
                    product=rule["product"],
                )
                await database.mark_exit_rule_executed(rule["id"])
                await database.log_trade(
                    order_id=str(order_id),
                    symbol=rule["option_symbol"],
                    exchange=rule["option_exchange"],
                    transaction_type="SELL",
                    order_type="MARKET",
                    quantity=rule["qty"],
                    price=None,
                    trigger_price=None,
                    product=rule["product"],
                    status="EXIT_RULE",
                )
                direction_word = "above" if rule["direction"] == "exitabove" else "below"
                await bot.send_message(
                    chat_id,
                    f"EXIT TRIGGERED: Sold {rule['qty']}x {rule['option_symbol']}\n"
                    f"{rule['underlying_symbol']} hit {ltp:,.2f} "
                    f"(trigger: {direction_word} {rule['trigger_price']:,.2f})\n"
                    f"Order ID: {order_id}",
                )
                logger.info(
                    f"Exit rule #{rule['id']} triggered: sold {rule['qty']}x "
                    f"{rule['option_symbol']}, underlying {key}={ltp}"
                )
            except Exception as e:
                logger.error(f"Exit rule #{rule['id']} order failed: {e}")
                try:
                    await bot.send_message(
                        chat_id,
                        f"EXIT RULE FAILED: Could not sell {rule['qty']}x "
                        f"{rule['option_symbol']}\n"
                        f"{rule['underlying_symbol']} hit {ltp:,.2f} but order failed: {e}",
                    )
                except Exception:
                    pass
