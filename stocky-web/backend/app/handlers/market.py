from app.kite_client import kite


async def get_price(symbol: str) -> dict:
    """Get current price for a symbol. Returns structured data."""
    if ":" not in symbol:
        symbol = f"NSE:{symbol}"

    data = await kite.get_quote(symbol)
    if symbol not in data:
        return {"error": f"Symbol not found: {symbol}"}

    q = data[symbol]
    ltp = q.get("last_price", 0)
    ohlc = q.get("ohlc", {})
    close = ohlc.get("close", ltp)
    change = ltp - close
    pct = (change / close * 100) if close else 0

    return {
        "symbol": symbol,
        "ltp": ltp,
        "change": round(change, 2),
        "pct_change": round(pct, 2),
        "open": ohlc.get("open", 0),
        "high": ohlc.get("high", 0),
        "low": ohlc.get("low", 0),
        "prev_close": close,
        "volume": q.get("volume", 0),
    }
