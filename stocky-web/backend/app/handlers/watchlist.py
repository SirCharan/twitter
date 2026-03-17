"""Watchlist handler — add, list, remove watched tickers with live prices."""

import asyncio
import logging

import yfinance as yf

from app.database import add_to_watchlist, get_watchlist, remove_from_watchlist

logger = logging.getLogger(__name__)


async def add_symbol(symbol: str) -> dict:
    """Add a symbol to watchlist after validation."""
    sym = symbol.upper().strip().replace(".NS", "")
    yf_sym = f"{sym}.NS"

    # Validate with yfinance
    loop = asyncio.get_event_loop()
    valid = await loop.run_in_executor(None, _validate_ticker, yf_sym)
    if not valid:
        return {"status": "error", "message": f"Invalid ticker: {sym}"}

    await add_to_watchlist(sym)
    return {"status": "ok", "symbol": sym, "message": f"{sym} added to watchlist"}


async def list_watchlist() -> dict:
    """Get watchlist with live prices."""
    items = await get_watchlist()
    if not items:
        return {"watchlist": [], "count": 0}

    loop = asyncio.get_event_loop()
    enriched = await loop.run_in_executor(None, _enrich_with_prices, items)

    return {"watchlist": enriched, "count": len(enriched)}


async def remove_symbol(symbol: str) -> dict:
    """Remove a symbol from watchlist."""
    sym = symbol.upper().strip().replace(".NS", "")
    removed = await remove_from_watchlist(sym)
    if removed:
        return {"status": "ok", "message": f"{sym} removed from watchlist"}
    return {"status": "error", "message": f"{sym} not found in watchlist"}


def _validate_ticker(symbol: str) -> bool:
    """Check if a yfinance ticker is valid."""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        return bool(info.get("regularMarketPrice") or info.get("currentPrice"))
    except Exception:
        return False


def _enrich_with_prices(items: list[dict]) -> list[dict]:
    """Add live price data to watchlist items."""
    enriched = []
    for item in items:
        sym = f"{item['symbol']}.NS"
        entry = {
            "symbol": item["symbol"],
            "added_at": item.get("added_at", ""),
            "price": None,
            "change_pct": None,
        }
        try:
            ticker = yf.Ticker(sym)
            info = ticker.info or {}
            price = info.get("regularMarketPrice") or info.get("currentPrice")
            prev = info.get("regularMarketPreviousClose") or info.get("previousClose")
            if price:
                entry["price"] = round(float(price), 2)
                if prev and float(prev) > 0:
                    entry["change_pct"] = round((float(price) - float(prev)) / float(prev) * 100, 2)
        except Exception:
            pass
        enriched.append(entry)
    return enriched
