"""Sectors handler — sectoral performance across timeframes."""

import asyncio
import logging

import yfinance as yf

from app import ai_client
from app.cache import cached
from app.database import log_api_call
from app.prompts import DISCLAIMER, SECTORS_ANALYSIS_PROMPT

logger = logging.getLogger(__name__)

SECTOR_INDICES = {
    "Nifty IT": "^CNXIT",
    "Nifty Bank": "^NSEBANK",
    "Nifty Auto": "^CNXAUTO",
    "Nifty Pharma": "^CNXPHARMA",
    "Nifty FMCG": "^CNXFMCG",
    "Nifty Metal": "^CNXMETAL",
    "Nifty Realty": "^CNXREALTY",
    "Nifty Energy": "^CNXENERGY",
    "Nifty PSE": "^CNXPSE",
    "Nifty Infra": "^CNXINFRA",
    "Nifty Media": "^CNXMEDIA",
}

# Top stock per sector for drill-down
SECTOR_TOP_STOCKS = {
    "Nifty IT": "TCS",
    "Nifty Bank": "HDFCBANK",
    "Nifty Auto": "MARUTI",
    "Nifty Pharma": "SUNPHARMA",
    "Nifty FMCG": "HINDUNILVR",
    "Nifty Metal": "TATASTEEL",
    "Nifty Realty": "DLF",
    "Nifty Energy": "RELIANCE",
    "Nifty PSE": "NTPC",
    "Nifty Infra": "LT",
    "Nifty Media": "ZEEL",
}


@cached(ttl=60)
async def get_sectors() -> dict:
    """Fetch sectoral performance across 1d, 1w, 1m timeframes."""
    loop = asyncio.get_event_loop()
    await log_api_call("yfinance", "sectors")

    data = await loop.run_in_executor(None, _fetch_sector_performance)

    # AI analysis
    try:
        sector_text = _format_for_ai(data)
        if sector_text.strip():
            analysis = await ai_client.feature_analysis(
                SECTORS_ANALYSIS_PROMPT.format(data=sector_text), max_tokens=256
            )
            if analysis:
                data["ai_analysis"] = analysis
    except Exception:
        pass

    data["disclaimer"] = DISCLAIMER
    return data


def _fetch_sector_performance() -> dict:
    """Fetch 1d, 1w, 1m returns for all sector indices."""
    sectors = []

    for name, symbol in SECTOR_INDICES.items():
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="1mo")
            if hist.empty or len(hist) < 2:
                continue

            current = float(hist["Close"].iloc[-1])
            prev_1d = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else current
            prev_1w = float(hist["Close"].iloc[-5]) if len(hist) >= 5 else prev_1d
            prev_1m = float(hist["Close"].iloc[0])

            change_1d = round((current - prev_1d) / prev_1d * 100, 2) if prev_1d else 0
            change_1w = round((current - prev_1w) / prev_1w * 100, 2) if prev_1w else 0
            change_1m = round((current - prev_1m) / prev_1m * 100, 2) if prev_1m else 0

            sectors.append({
                "name": name,
                "value": round(current, 2),
                "change_1d": change_1d,
                "change_1w": change_1w,
                "change_1m": change_1m,
                "top_stock": SECTOR_TOP_STOCKS.get(name, ""),
            })
        except Exception as e:
            logger.warning("Sector %s failed: %s", name, e)
            continue

    # Sort by 1d performance
    sectors.sort(key=lambda x: x["change_1d"], reverse=True)

    best = sectors[0]["name"] if sectors else ""
    worst = sectors[-1]["name"] if sectors else ""

    return {
        "sectors": sectors,
        "best_sector": best,
        "worst_sector": worst,
    }


def _format_for_ai(data: dict) -> str:
    text = ""
    for s in data.get("sectors", []):
        text += (
            f"{s['name']}: 1D {s['change_1d']:+.2f}%, "
            f"1W {s['change_1w']:+.2f}%, "
            f"1M {s['change_1m']:+.2f}%\n"
        )
    if data.get("best_sector"):
        text += f"\nBest: {data['best_sector']}, Worst: {data['worst_sector']}\n"
    return text
