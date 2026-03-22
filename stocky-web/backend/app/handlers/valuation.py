"""Valuation handler — market PE/PB, most/least expensive stocks."""

import asyncio
import logging

import yfinance as yf

from app import ai_client
from app.cache import cached
from app.database import log_api_call
from app.prompts import DISCLAIMER, VALUATION_ANALYSIS_PROMPT

logger = logging.getLogger(__name__)

NIFTY_50 = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "BHARTIARTL.NS", "ICICIBANK.NS",
    "INFOSYS.NS", "SBIN.NS", "WIPRO.NS", "HINDUNILVR.NS", "ITC.NS",
    "BAJFINANCE.NS", "KOTAKBANK.NS", "LT.NS", "AXISBANK.NS", "ASIANPAINT.NS",
    "MARUTI.NS", "SUNPHARMA.NS", "TITAN.NS", "NESTLEIND.NS", "ULTRACEMCO.NS",
    "ONGC.NS", "NTPC.NS", "POWERGRID.NS", "TECHM.NS", "HCLTECH.NS",
    "BAJAJFINSV.NS", "TATAMOTORS.NS", "TATASTEEL.NS", "ADANIPORTS.NS", "COALINDIA.NS",
    "DRREDDY.NS", "CIPLA.NS", "EICHERMOT.NS", "HEROMOTOCO.NS", "JSWSTEEL.NS",
    "INDUSINDBK.NS", "BAJAJ-AUTO.NS", "GRASIM.NS", "DIVISLAB.NS", "BPCL.NS",
    "SBILIFE.NS", "BRITANNIA.NS", "APOLLOHOSP.NS", "TATACONSUM.NS", "HDFCLIFE.NS",
    "HINDALCO.NS", "ZOMATO.NS", "TRENT.NS", "SHRIRAMFIN.NS", "JIOFIN.NS",
]


@cached(ttl=300)
async def get_valuation(deep: bool = False) -> dict:
    """Fetch Nifty valuation metrics — PE, PB, most/least expensive stocks."""
    loop = asyncio.get_event_loop()
    await log_api_call("yfinance", "valuation")

    data = await loop.run_in_executor(None, _fetch_valuation_data)

    # AI analysis via orchestrator
    try:
        from app.llm_orchestrator import enhance
        ai_result = await enhance(button_type="valuation", raw_data=data, deep=deep)
        if ai_result.get("ai_analysis"):
            data["ai_analysis"] = ai_result["ai_analysis"]
        if ai_result.get("ai_metadata"):
            data["ai_metadata"] = ai_result["ai_metadata"]
    except Exception:
        pass

    data["disclaimer"] = DISCLAIMER
    return data


def _fetch_valuation_data() -> dict:
    """Fetch PE/PB for Nifty 50 constituents, compute market averages."""
    stocks_data = []

    for sym in NIFTY_50:
        try:
            ticker = yf.Ticker(sym)
            info = ticker.info or {}
            pe = info.get("trailingPE")
            pb = info.get("priceToBook")
            if pe is None and pb is None:
                continue

            display = sym.replace(".NS", "")
            entry = {
                "symbol": display,
                "pe": _safe_float(pe),
                "pb": _safe_float(pb),
                "market_cap": _safe_float(info.get("marketCap")),
                "roe": _safe_float(info.get("returnOnEquity")),
            }
            if entry["roe"]:
                entry["roe"] = round(entry["roe"] * 100, 2)
            stocks_data.append(entry)
        except Exception:
            continue

    # Compute market-wide averages
    pe_values = [s["pe"] for s in stocks_data if s.get("pe") and s["pe"] > 0]
    pb_values = [s["pb"] for s in stocks_data if s.get("pb") and s["pb"] > 0]

    market_pe = round(sum(pe_values) / len(pe_values), 2) if pe_values else None
    market_pb = round(sum(pb_values) / len(pb_values), 2) if pb_values else None

    # Sort for most/least expensive
    with_pe = [s for s in stocks_data if s.get("pe") and s["pe"] > 0]
    with_pe.sort(key=lambda x: x["pe"], reverse=True)

    most_expensive = with_pe[:5]
    least_expensive = with_pe[-5:] if len(with_pe) >= 5 else with_pe
    least_expensive = list(reversed(least_expensive))

    # Nifty PE from index (try to get from yfinance)
    nifty_pe = None
    try:
        nifty = yf.Ticker("^NSEI")
        nifty_info = nifty.info or {}
        nifty_pe = _safe_float(nifty_info.get("trailingPE"))
    except Exception:
        pass

    return {
        "market_pe": nifty_pe or market_pe,
        "market_pb": market_pb,
        "avg_pe": market_pe,
        "avg_pb": market_pb,
        "most_expensive": most_expensive,
        "least_expensive": least_expensive,
        "total_stocks_scanned": len(stocks_data),
    }


def _format_for_ai(data: dict) -> str:
    text = f"Market PE: {data.get('market_pe', 'N/A')}, Market PB: {data.get('market_pb', 'N/A')}\n"
    text += f"Avg PE across {data.get('total_stocks_scanned', 0)} Nifty stocks: {data.get('avg_pe', 'N/A')}\n\n"
    text += "Most expensive by PE:\n"
    for s in data.get("most_expensive", []):
        text += f"  {s['symbol']}: PE {s['pe']}, PB {s.get('pb', 'N/A')}\n"
    text += "\nLeast expensive by PE:\n"
    for s in data.get("least_expensive", []):
        text += f"  {s['symbol']}: PE {s['pe']}, PB {s.get('pb', 'N/A')}\n"
    return text


def _safe_float(val) -> float | None:
    if val is None:
        return None
    try:
        import math
        f = float(val)
        return round(f, 2) if not math.isnan(f) else None
    except (ValueError, TypeError):
        return None
