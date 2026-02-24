"""Standalone script to fetch Zerodha portfolio data via Kite Connect.

Run from stocky-web/backend/:
    python -m scripts.fetch_portfolio
"""

import asyncio
import json
import sys

from app.database import init_db
from app.kite_auth import ensure_authenticated
from app.handlers.portfolio import get_portfolio, get_positions, get_orders, get_margins


async def main():
    await init_db()

    try:
        await ensure_authenticated()
    except Exception as e:
        print(json.dumps({"error": f"Kite authentication failed: {e}"}))
        sys.exit(1)

    try:
        portfolio = await get_portfolio()
        positions = await get_positions()
        orders = await get_orders()
        margins = await get_margins()
    except Exception as e:
        print(json.dumps({"error": f"Failed to fetch data: {e}"}))
        sys.exit(1)

    result = {
        "portfolio": portfolio,
        "positions": positions,
        "orders": orders,
        "margins": margins,
    }
    print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    asyncio.run(main())
