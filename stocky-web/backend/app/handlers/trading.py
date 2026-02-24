import logging

from app import database
from app.kite_client import kite

logger = logging.getLogger(__name__)


def parse_trade_args(args: list[str], txn_type: str) -> dict:
    """Parse: [symbol, qty, price?, product?]"""
    if len(args) < 2:
        raise ValueError(f"Need at least symbol and quantity for {txn_type}")

    symbol = args[0].upper()
    qty = int(args[1])
    price = float(args[2]) if len(args) > 2 else None
    product = args[3].upper() if len(args) > 3 else "CNC"
    order_type = "LIMIT" if price else "MARKET"

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


async def initiate_trade(
    username: str,
    conversation_id: str,
    symbol: str,
    qty: int,
    txn_type: str,
    price: float | None = None,
    product: str = "CNC",
) -> dict:
    """Creates a pending trade action. Returns confirmation data."""
    if ":" in symbol:
        exchange, symbol = symbol.split(":", 1)
    elif any(x in symbol.upper() for x in ["NIFTY", "BANKNIFTY", "FIN", "SENSEX"]):
        exchange = "NFO"
        if product == "CNC":
            product = "NRML"
    else:
        exchange = "NSE"

    symbol = symbol.upper()
    order_type = "LIMIT" if price else "MARKET"

    action_data = {
        "symbol": symbol,
        "exchange": exchange,
        "qty": qty,
        "price": price,
        "product": product,
        "order_type": order_type,
        "txn_type": txn_type,
    }

    action_id = await database.create_pending_action(
        username=username,
        conversation_id=conversation_id,
        action_type=txn_type.lower(),
        action_data=action_data,
    )

    return {
        "action_id": action_id,
        **action_data,
    }


async def confirm_trade(action_id: str, username: str) -> dict:
    """Execute the pending trade."""
    pending = await database.get_pending_action(action_id, username)
    if not pending:
        return {"error": "No pending action found or it has expired."}

    data = pending["action_data"]

    try:
        order_id = await kite.place_order(
            symbol=data["symbol"],
            exchange=data["exchange"],
            txn_type=data["txn_type"],
            quantity=data["qty"],
            order_type=data["order_type"],
            product=data["product"],
            price=data.get("price"),
        )

        await database.log_trade(
            order_id=str(order_id),
            symbol=data["symbol"],
            exchange=data["exchange"],
            transaction_type=data["txn_type"],
            order_type=data["order_type"],
            quantity=data["qty"],
            price=data.get("price"),
            trigger_price=None,
            product=data["product"],
            status="PLACED",
        )

        await database.resolve_pending_action(action_id, "confirmed")

        return {
            "order_id": str(order_id),
            "status": "PLACED",
            **data,
        }
    except Exception as e:
        await database.resolve_pending_action(action_id, "failed")
        return {"error": str(e), **data}


async def cancel_trade(action_id: str, username: str) -> dict:
    """Cancel a pending trade."""
    pending = await database.get_pending_action(action_id, username)
    if not pending:
        return {"error": "No pending action found."}

    await database.resolve_pending_action(action_id, "cancelled")
    return {"status": "cancelled", **pending["action_data"]}
