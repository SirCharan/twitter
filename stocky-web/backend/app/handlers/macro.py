import asyncio
import logging

import yfinance as yf

logger = logging.getLogger(__name__)

# RBI Repo Rate — update when RBI changes it
RBI_REPO_RATE = 6.25  # As of Feb 2025 (cut from 6.5 to 6.25)

SYMBOLS = {
    "usd_inr": "USDINR=X",
    "eur_inr": "EURINR=X",
    "gbp_inr": "GBPINR=X",
    "gold_usd": "GC=F",
    "crude_usd": "CL=F",
    "silver_usd": "SI=F",
    "vix_india": "^INDIAVIX",
    "nifty": "^NSEI",
    "sensex": "^BSESN",
    "dow": "^DJI",
    "nasdaq": "^IXIC",
    "sp500": "^GSPC",
    "btc": "BTC-USD",
    "eth": "ETH-USD",
    "india_10y": "^IRX",
}


async def get_macro_data() -> dict:
    """Fetch macro dashboard data from yfinance."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _fetch_macro)


def _fetch_macro() -> dict:
    raw = {}
    for key, sym in SYMBOLS.items():
        try:
            ticker = yf.Ticker(sym)
            info = ticker.info
            price = info.get("regularMarketPrice") or info.get("currentPrice")
            chg = info.get("regularMarketChange", 0) or 0
            chg_pct = info.get("regularMarketChangePercent", 0) or 0
            if price:
                raw[key] = {
                    "price": round(float(price), 2),
                    "change": round(float(chg), 2),
                    "change_pct": round(float(chg_pct), 2),
                }
        except Exception:
            pass

    # Convert gold/crude/silver USD prices to approx INR
    usd_inr = raw.get("usd_inr", {}).get("price", 84)
    if raw.get("gold_usd"):
        raw["gold_inr"] = {
            "price": round(raw["gold_usd"]["price"] * usd_inr / 31.1, 0),  # per gram
            "change_pct": raw["gold_usd"]["change_pct"],
        }
    if raw.get("crude_usd"):
        raw["crude_inr"] = {
            "price": round(raw["crude_usd"]["price"] * usd_inr, 0),  # per barrel in INR
            "change_pct": raw["crude_usd"]["change_pct"],
        }

    return {
        "forex": {
            "usd_inr": raw.get("usd_inr"),
            "eur_inr": raw.get("eur_inr"),
            "gbp_inr": raw.get("gbp_inr"),
        },
        "commodities": {
            "gold": raw.get("gold_usd"),
            "gold_inr": raw.get("gold_inr"),
            "crude": raw.get("crude_usd"),
            "crude_inr": raw.get("crude_inr"),
            "silver": raw.get("silver_usd"),
        },
        "indices": {
            "nifty": raw.get("nifty"),
            "sensex": raw.get("sensex"),
            "vix": raw.get("vix_india"),
            "dow": raw.get("dow"),
            "nasdaq": raw.get("nasdaq"),
            "sp500": raw.get("sp500"),
        },
        "crypto": {
            "btc": raw.get("btc"),
            "eth": raw.get("eth"),
        },
        "bonds": {
            "india_10y": raw.get("india_10y"),
        },
        "rbi": {
            "repo_rate": RBI_REPO_RATE,
            "note": "RBI Repo Rate — updated Feb 2025",
        },
    }
