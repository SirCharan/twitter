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
    data = await loop.run_in_executor(None, _fetch_macro)

    # AI macro analysis
    try:
        from app import ai_client
        from app.prompts import MACRO_ANALYSIS_PROMPT

        macro_text = f"RBI Repo Rate: {data['rbi']['repo_rate']}%\n"

        forex = data.get("forex", {})
        if forex.get("usd_inr"):
            macro_text += f"USD/INR: {forex['usd_inr']['price']} ({forex['usd_inr'].get('change_pct', 0):+.2f}%)\n"

        commod = data.get("commodities", {})
        if commod.get("gold"):
            macro_text += f"Gold (USD/oz): {commod['gold']['price']} ({commod['gold'].get('change_pct', 0):+.2f}%)\n"
        if commod.get("crude"):
            macro_text += f"Crude (USD/bbl): {commod['crude']['price']} ({commod['crude'].get('change_pct', 0):+.2f}%)\n"

        indices = data.get("indices", {})
        if indices.get("nifty"):
            macro_text += f"Nifty 50: {indices['nifty']['price']} ({indices['nifty'].get('change_pct', 0):+.2f}%)\n"
        if indices.get("vix"):
            macro_text += f"India VIX: {indices['vix']['price']} ({indices['vix'].get('change_pct', 0):+.2f}%)\n"
        for idx_name in ["dow", "nasdaq", "sp500"]:
            if indices.get(idx_name):
                macro_text += f"{idx_name.upper()}: {indices[idx_name]['price']} ({indices[idx_name].get('change_pct', 0):+.2f}%)\n"

        bonds = data.get("bonds", {})
        if bonds.get("india_10y"):
            macro_text += f"India 10Y Yield: {bonds['india_10y']['price']}\n"

        crypto = data.get("crypto", {})
        if crypto.get("btc"):
            macro_text += f"BTC: {crypto['btc']['price']:,.0f} ({crypto['btc'].get('change_pct', 0):+.2f}%)\n"

        analysis = await ai_client.feature_analysis(
            MACRO_ANALYSIS_PROMPT.format(data=macro_text), max_tokens=256
        )
        if analysis:
            data["ai_analysis"] = analysis
    except Exception:
        pass

    return data


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
