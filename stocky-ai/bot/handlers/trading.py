import logging

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import ContextTypes

from bot.auth_check import authorized
from bot import database
from bot.kite_client import KiteClient
from bot.max_loss import is_trading_blocked

logger = logging.getLogger(__name__)


def _parse_trade_args(args: list[str], txn_type: str) -> dict:
    """Parse: <symbol> <qty> [price] [product]"""
    if len(args) < 2:
        raise ValueError(f"Usage: /{txn_type.lower()} <symbol> <qty> [price] [product]")

    symbol = args[0].upper()
    qty = int(args[1])
    price = float(args[2]) if len(args) > 2 else None
    product = args[3].upper() if len(args) > 3 else "CNC"
    order_type = "LIMIT" if price else "MARKET"

    # Auto-detect exchange
    if ":" in symbol:
        exchange, symbol = symbol.split(":", 1)
    elif any(x in symbol for x in ["NIFTY", "BANKNIFTY", "FIN", "SENSEX"]):
        exchange = "NFO"
        if product == "CNC":
            product = "NRML"
    else:
        exchange = "NSE"

    return {
        "symbol": symbol,
        "exchange": exchange,
        "qty": qty,
        "price": price,
        "product": product,
        "order_type": order_type,
        "txn_type": txn_type,
    }


@authorized
async def buy_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        order = _parse_trade_args(context.args or [], "BUY")
    except ValueError as e:
        await update.message.reply_text(str(e))
        return

    if await is_trading_blocked():
        await update.message.reply_text("Trading BLOCKED — max loss limit reached. Use /maxloss off to reset.")
        return

    context.user_data["pending_order"] = order
    price_str = f"@ {order['price']}" if order["price"] else "@ MARKET"
    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("Confirm", callback_data="confirm_order"),
            InlineKeyboardButton("Cancel", callback_data="cancel_order"),
        ]
    ])
    await update.message.reply_text(
        f"BUY {order['qty']} {order['exchange']}:{order['symbol']} "
        f"{price_str} ({order['product']})\nConfirm?",
        reply_markup=keyboard,
    )


@authorized
async def sell_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        order = _parse_trade_args(context.args or [], "SELL")
    except ValueError as e:
        await update.message.reply_text(str(e))
        return

    if await is_trading_blocked():
        await update.message.reply_text("Trading BLOCKED — max loss limit reached. Use /maxloss off to reset.")
        return

    context.user_data["pending_order"] = order
    price_str = f"@ {order['price']}" if order["price"] else "@ MARKET"
    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("Confirm", callback_data="confirm_order"),
            InlineKeyboardButton("Cancel", callback_data="cancel_order"),
        ]
    ])
    await update.message.reply_text(
        f"SELL {order['qty']} {order['exchange']}:{order['symbol']} "
        f"{price_str} ({order['product']})\nConfirm?",
        reply_markup=keyboard,
    )


async def order_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    from bot.config import ALLOWED_USER_IDS
    if update.effective_user.id not in ALLOWED_USER_IDS:
        return

    if query.data == "cancel_order":
        context.user_data.pop("pending_order", None)
        await query.edit_message_text("Order cancelled.")
        return

    if query.data == "confirm_order":
        order = context.user_data.pop("pending_order", None)
        if not order:
            await query.edit_message_text("No pending order found.")
            return

        kite: KiteClient = context.bot_data["kite"]
        try:
            order_id = await kite.place_order(
                symbol=order["symbol"],
                exchange=order["exchange"],
                txn_type=order["txn_type"],
                quantity=order["qty"],
                order_type=order["order_type"],
                product=order["product"],
                price=order["price"],
            )
            await database.log_trade(
                order_id=str(order_id),
                symbol=order["symbol"],
                exchange=order["exchange"],
                transaction_type=order["txn_type"],
                order_type=order["order_type"],
                quantity=order["qty"],
                price=order["price"],
                trigger_price=None,
                product=order["product"],
                status="PLACED",
            )
            await query.edit_message_text(
                f"Order placed!\n"
                f"{order['txn_type']} {order['qty']} {order['exchange']}:{order['symbol']}\n"
                f"Order ID: {order_id}"
            )
        except Exception as e:
            await query.edit_message_text(f"Order failed: {e}")
