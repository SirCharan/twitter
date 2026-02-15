from telegram import Update
from telegram.ext import ContextTypes

from bot.auth_check import authorized
from bot.kite_client import KiteClient


@authorized
async def price(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Get current price for a symbol. Usage: /price INFY or /price NSE:INFY"""
    if not context.args:
        await update.message.reply_text("Usage: /price <symbol>")
        return

    symbol = context.args[0].upper()
    if ":" not in symbol:
        symbol = f"NSE:{symbol}"

    kite: KiteClient = context.bot_data["kite"]
    try:
        data = await kite.get_quote(symbol)
        if symbol not in data:
            await update.message.reply_text(f"Symbol not found: {symbol}")
            return

        q = data[symbol]
        ltp = q.get("last_price", 0)
        ohlc = q.get("ohlc", {})
        change = ltp - ohlc.get("close", ltp)
        close = ohlc.get("close", ltp)
        pct = (change / close * 100) if close else 0
        sign = "+" if change >= 0 else ""
        volume = q.get("volume", 0)

        text = (
            f"<b>{symbol}</b>\n\n"
            f"LTP: {ltp:,.2f}\n"
            f"Change: {sign}{change:,.2f} ({sign}{pct:.2f}%)\n\n"
            f"Open: {ohlc.get('open', 0):,.2f}\n"
            f"High: {ohlc.get('high', 0):,.2f}\n"
            f"Low: {ohlc.get('low', 0):,.2f}\n"
            f"Prev Close: {close:,.2f}\n"
            f"Volume: {volume:,}"
        )
        await update.message.reply_text(text, parse_mode="HTML")
    except Exception as e:
        await update.message.reply_text(f"Error: {e}")
