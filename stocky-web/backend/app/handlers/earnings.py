"""Earnings calendar handler — upcoming earnings dates + EPS surprise history."""

import asyncio
import logging
from datetime import datetime, timedelta

import yfinance as yf

from app import ai_client
from app.cache import cached
from app.database import log_api_call
from app.prompts import DISCLAIMER, EARNINGS_ANALYSIS_PROMPT

logger = logging.getLogger(__name__)

# Nifty 50 subset for scanning
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
async def get_earnings(symbol: str | None = None) -> dict:
    """Fetch earnings data for a specific stock or Nifty-50 upcoming."""
    loop = asyncio.get_event_loop()
    await log_api_call("yfinance", "earnings")

    if symbol:
        data = await loop.run_in_executor(None, _fetch_stock_earnings, symbol)
    else:
        data = await loop.run_in_executor(None, _fetch_upcoming_earnings)

    # AI analysis
    try:
        earnings_text = _format_for_ai(data)
        if earnings_text.strip():
            analysis = await ai_client.feature_analysis(
                EARNINGS_ANALYSIS_PROMPT.format(data=earnings_text), max_tokens=256
            )
            if analysis:
                data["ai_analysis"] = analysis
    except Exception:
        pass

    data["disclaimer"] = DISCLAIMER
    return data


def _fetch_stock_earnings(symbol: str) -> dict:
    """Fetch earnings for a specific stock."""
    sym = symbol.upper().strip()
    if not sym.endswith(".NS"):
        sym += ".NS"

    ticker = yf.Ticker(sym)
    display_name = sym.replace(".NS", "")

    # Upcoming earnings dates
    upcoming = []
    try:
        dates_df = ticker.get_earnings_dates(limit=12)
        if dates_df is not None and not dates_df.empty:
            now = datetime.now()
            for idx, row in dates_df.iterrows():
                try:
                    dt = idx.to_pydatetime().replace(tzinfo=None) if hasattr(idx, "to_pydatetime") else idx
                    entry = {
                        "symbol": display_name,
                        "company": display_name,
                        "date": dt.strftime("%Y-%m-%d") if hasattr(dt, "strftime") else str(dt),
                        "estimate_eps": _safe_float(row.get("EPS Estimate")),
                        "actual_eps": _safe_float(row.get("Reported EPS")),
                        "surprise_pct": _safe_float(row.get("Surprise(%)")),
                        "is_upcoming": dt > now if hasattr(dt, "__gt__") else False,
                    }
                    upcoming.append(entry)
                except Exception:
                    continue
    except Exception as e:
        logger.warning("Earnings dates failed for %s: %s", sym, e)

    # Split into upcoming and historical surprises
    future = [e for e in upcoming if e.get("is_upcoming")]
    historical = [e for e in upcoming if not e.get("is_upcoming") and e.get("actual_eps") is not None]

    return {
        "symbol": display_name,
        "upcoming": future[:5],
        "surprises": historical[:8],
    }


def _fetch_upcoming_earnings() -> dict:
    """Scan Nifty-50 for upcoming earnings in next 30 days."""
    upcoming = []
    surprises = []
    now = datetime.now()
    cutoff = now + timedelta(days=30)

    for sym in NIFTY_50[:30]:  # Limit to avoid timeout
        try:
            ticker = yf.Ticker(sym)
            dates_df = ticker.get_earnings_dates(limit=4)
            if dates_df is None or dates_df.empty:
                continue
            display = sym.replace(".NS", "")
            for idx, row in dates_df.iterrows():
                try:
                    dt = idx.to_pydatetime().replace(tzinfo=None) if hasattr(idx, "to_pydatetime") else idx
                    if now < dt < cutoff:
                        upcoming.append({
                            "symbol": display,
                            "company": display,
                            "date": dt.strftime("%Y-%m-%d"),
                            "estimate_eps": _safe_float(row.get("EPS Estimate")),
                        })
                    elif dt < now and row.get("Reported EPS") is not None:
                        surprises.append({
                            "symbol": display,
                            "quarter": dt.strftime("%Y-%m-%d"),
                            "estimated_eps": _safe_float(row.get("EPS Estimate")),
                            "actual_eps": _safe_float(row.get("Reported EPS")),
                            "surprise_pct": _safe_float(row.get("Surprise(%)")),
                        })
                except Exception:
                    continue
        except Exception:
            continue

    upcoming.sort(key=lambda x: x.get("date", ""))
    return {
        "upcoming": upcoming[:15],
        "surprises": surprises[:10],
    }


def _format_for_ai(data: dict) -> str:
    text = ""
    for e in data.get("upcoming", []):
        text += f"Upcoming: {e['symbol']} on {e.get('date', '?')}, EPS est: {e.get('estimate_eps', 'N/A')}\n"
    for s in data.get("surprises", []):
        text += (
            f"Past: {s.get('symbol', '?')} — Est EPS: {s.get('estimated_eps', '?')}, "
            f"Actual: {s.get('actual_eps', '?')}, Surprise: {s.get('surprise_pct', '?')}%\n"
        )
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
