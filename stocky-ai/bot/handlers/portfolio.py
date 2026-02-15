from telegram import Update
from telegram.ext import ContextTypes

from bot.auth_check import authorized
from bot.kite_client import KiteClient


@authorized
async def portfolio(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Combined portfolio summary."""
    kite: KiteClient = context.bot_data["kite"]
    try:
        positions = await kite.get_positions()
        holdings = await kite.get_holdings()

        # Positions P&L
        day_pnl = sum(p.get("pnl", 0) for p in positions.get("day", []))
        net_pnl = sum(p.get("pnl", 0) for p in positions.get("net", []))

        # Holdings value
        total_invested = sum(h.get("average_price", 0) * h.get("quantity", 0) for h in holdings)
        total_current = sum(h.get("last_price", 0) * h.get("quantity", 0) for h in holdings)
        holdings_pnl = total_current - total_invested

        sign = lambda x: "+" if x >= 0 else ""
        text = (
            f"<b>Portfolio Summary</b>\n\n"
            f"<b>Positions</b>\n"
            f"Day P&L: {sign(day_pnl)}{day_pnl:,.2f}\n"
            f"Net P&L: {sign(net_pnl)}{net_pnl:,.2f}\n\n"
            f"<b>Holdings</b>\n"
            f"Invested: {total_invested:,.2f}\n"
            f"Current: {total_current:,.2f}\n"
            f"P&L: {sign(holdings_pnl)}{holdings_pnl:,.2f}"
        )
        await update.message.reply_text(text, parse_mode="HTML")
    except Exception as e:
        await update.message.reply_text(f"Error: {e}")


@authorized
async def positions(update: Update, context: ContextTypes.DEFAULT_TYPE):
    kite: KiteClient = context.bot_data["kite"]
    try:
        data = await kite.get_positions()
        day_positions = data.get("day", [])
        if not day_positions:
            await update.message.reply_text("No positions today.")
            return

        lines = ["<b>Positions</b>\n"]
        total_pnl = 0
        for p in day_positions:
            if p.get("quantity", 0) == 0 and p.get("day_buy_quantity", 0) == 0:
                continue
            pnl = p.get("pnl", 0)
            total_pnl += pnl
            sign = "+" if pnl >= 0 else ""
            lines.append(
                f"{p['tradingsymbol']}: {p['quantity']} qty | "
                f"Avg: {p.get('average_price', 0):.2f} | "
                f"LTP: {p.get('last_price', 0):.2f} | "
                f"P&L: {sign}{pnl:,.2f}"
            )

        sign = "+" if total_pnl >= 0 else ""
        lines.append(f"\n<b>Total P&L: {sign}{total_pnl:,.2f}</b>")
        await update.message.reply_text("\n".join(lines), parse_mode="HTML")
    except Exception as e:
        await update.message.reply_text(f"Error: {e}")


@authorized
async def holdings(update: Update, context: ContextTypes.DEFAULT_TYPE):
    kite: KiteClient = context.bot_data["kite"]
    try:
        data = await kite.get_holdings()
        if not data:
            await update.message.reply_text("No holdings.")
            return

        lines = ["<b>Holdings</b>\n"]
        total_pnl = 0
        for h in data:
            avg = h.get("average_price", 0)
            ltp = h.get("last_price", 0)
            qty = h.get("quantity", 0)
            pnl = (ltp - avg) * qty
            total_pnl += pnl
            sign = "+" if pnl >= 0 else ""
            lines.append(
                f"{h['tradingsymbol']}: {qty} qty | "
                f"Avg: {avg:.2f} | LTP: {ltp:.2f} | "
                f"P&L: {sign}{pnl:,.2f}"
            )

        sign = "+" if total_pnl >= 0 else ""
        lines.append(f"\n<b>Total P&L: {sign}{total_pnl:,.2f}</b>")
        await update.message.reply_text("\n".join(lines), parse_mode="HTML")
    except Exception as e:
        await update.message.reply_text(f"Error: {e}")


@authorized
async def orders(update: Update, context: ContextTypes.DEFAULT_TYPE):
    kite: KiteClient = context.bot_data["kite"]
    try:
        data = await kite.get_orders()
        if not data:
            await update.message.reply_text("No orders today.")
            return

        lines = ["<b>Orders</b>\n"]
        for o in data[-15:]:  # last 15 orders
            status = o.get("status", "?")
            emoji = {"COMPLETE": "G", "REJECTED": "X", "CANCELLED": "C", "OPEN": "O"}.get(status, "?")
            lines.append(
                f"[{emoji}] {o.get('transaction_type', '?')} "
                f"{o.get('quantity', 0)} {o.get('tradingsymbol', '?')} "
                f"@ {o.get('average_price', o.get('price', 'MKT'))} "
                f"({status})"
            )
        await update.message.reply_text("\n".join(lines), parse_mode="HTML")
    except Exception as e:
        await update.message.reply_text(f"Error: {e}")


@authorized
async def margins_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    kite: KiteClient = context.bot_data["kite"]
    try:
        data = await kite.get_margins()
        lines = ["<b>Margins</b>\n"]
        for segment in ["equity", "commodity"]:
            if segment in data:
                m = data[segment]
                avail = m.get("available", {})
                lines.append(
                    f"<b>{segment.title()}</b>\n"
                    f"  Cash: {avail.get('cash', 0):,.2f}\n"
                    f"  Collateral: {avail.get('collateral', 0):,.2f}\n"
                    f"  Intraday payin: {avail.get('intraday_payin', 0):,.2f}\n"
                    f"  Used: {m.get('utilised', {}).get('debits', 0):,.2f}"
                )
        await update.message.reply_text("\n".join(lines), parse_mode="HTML")
    except Exception as e:
        await update.message.reply_text(f"Error: {e}")
