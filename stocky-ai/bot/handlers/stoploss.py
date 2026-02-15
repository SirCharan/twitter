from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import ContextTypes

from bot.auth_check import authorized
from bot import database
from bot.kite_client import KiteClient
from bot.max_loss import is_trading_blocked


@authorized
async def sl_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Place a stop-loss order.

    Usage:
        /sl <symbol> <qty> <trigger_price>           — SL-M (stop-loss market)
        /sl <symbol> <qty> <trigger_price> <limit>    — SL (stop-loss limit)
    """
    args = context.args or []
    if len(args) < 3:
        await update.message.reply_text(
            "Usage: /sl <symbol> <qty> <trigger_price> [limit_price]"
        )
        return

    symbol = args[0].upper()
    try:
        qty = int(args[1])
        trigger_price = float(args[2])
        limit_price = float(args[3]) if len(args) > 3 else None
    except ValueError:
        await update.message.reply_text("Invalid numbers.")
        return

    # Auto-detect exchange
    if ":" in symbol:
        exchange, symbol = symbol.split(":", 1)
    elif any(x in symbol for x in ["NIFTY", "BANKNIFTY", "FIN", "SENSEX"]):
        exchange = "NFO"
    else:
        exchange = "NSE"

    product = "NRML" if exchange == "NFO" else "CNC"
    # Optional product override
    if len(args) > 4:
        product = args[4].upper()

    order_type = "SL" if limit_price else "SL-M"

    if await is_trading_blocked():
        await update.message.reply_text("Trading BLOCKED — max loss limit reached.")
        return

    order_data = {
        "symbol": symbol,
        "exchange": exchange,
        "qty": qty,
        "trigger_price": trigger_price,
        "limit_price": limit_price,
        "order_type": order_type,
        "product": product,
    }
    context.user_data["pending_sl"] = order_data

    price_str = f"trigger {trigger_price}"
    if limit_price:
        price_str += f" / limit {limit_price}"

    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("Confirm", callback_data="confirm_sl"),
            InlineKeyboardButton("Cancel", callback_data="cancel_sl"),
        ]
    ])
    await update.message.reply_text(
        f"SELL {qty} {exchange}:{symbol} ({order_type})\n"
        f"{price_str} ({product})\nConfirm?",
        reply_markup=keyboard,
    )


async def sl_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    from bot.config import ALLOWED_USER_IDS
    if update.effective_user.id not in ALLOWED_USER_IDS:
        return

    if query.data == "cancel_sl":
        context.user_data.pop("pending_sl", None)
        await query.edit_message_text("SL order cancelled.")
        return

    if query.data == "confirm_sl":
        order = context.user_data.pop("pending_sl", None)
        if not order:
            await query.edit_message_text("No pending SL order found.")
            return

        kite: KiteClient = context.bot_data["kite"]
        try:
            order_id = await kite.place_order(
                symbol=order["symbol"],
                exchange=order["exchange"],
                txn_type="SELL",
                quantity=order["qty"],
                order_type=order["order_type"],
                product=order["product"],
                trigger_price=order["trigger_price"],
                price=order["limit_price"],
            )
            await database.log_trade(
                order_id=str(order_id),
                symbol=order["symbol"],
                exchange=order["exchange"],
                transaction_type="SELL",
                order_type=order["order_type"],
                quantity=order["qty"],
                price=order["limit_price"],
                trigger_price=order["trigger_price"],
                product=order["product"],
                status="PLACED",
            )
            await query.edit_message_text(
                f"SL order placed!\n"
                f"SELL {order['qty']} {order['exchange']}:{order['symbol']} "
                f"({order['order_type']})\nOrder ID: {order_id}"
            )
        except Exception as e:
            await query.edit_message_text(f"SL order failed: {e}")
