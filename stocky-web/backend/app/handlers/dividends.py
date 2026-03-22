"""Dividends handler — dividend history, yields, sustainability scores."""

import asyncio
import logging

import yfinance as yf

from app import ai_client
from app.cache import cached
from app.database import log_api_call
from app.prompts import DISCLAIMER, DIVIDENDS_ANALYSIS_PROMPT

logger = logging.getLogger(__name__)

NIFTY_50 = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "BHARTIARTL.NS", "ICICIBANK.NS",
    "INFOSYS.NS", "SBIN.NS", "WIPRO.NS", "HINDUNILVR.NS", "ITC.NS",
    "BAJFINANCE.NS", "KOTAKBANK.NS", "LT.NS", "AXISBANK.NS", "ASIANPAINT.NS",
    "MARUTI.NS", "SUNPHARMA.NS", "TITAN.NS", "NESTLEIND.NS", "ULTRACEMCO.NS",
    "COALINDIA.NS", "ONGC.NS", "NTPC.NS", "POWERGRID.NS", "BPCL.NS",
    "DRREDDY.NS", "CIPLA.NS", "DIVISLAB.NS", "BRITANNIA.NS", "TATACONSUM.NS",
    "HDFCLIFE.NS", "SBILIFE.NS", "TATASTEEL.NS", "JSWSTEEL.NS", "HINDALCO.NS",
    "BAJAJ-AUTO.NS", "HEROMOTOCO.NS", "EICHERMOT.NS", "TECHM.NS", "HCLTECH.NS",
]


@cached(ttl=300)
async def get_dividends(symbol: str | None = None, deep: bool = False) -> dict:
    """Fetch dividend data for a stock or top Nifty-50 yielders."""
    loop = asyncio.get_event_loop()
    await log_api_call("yfinance", "dividends")

    if symbol:
        data = await loop.run_in_executor(None, _fetch_stock_dividends, symbol)
    else:
        data = await loop.run_in_executor(None, _fetch_top_yielders)

    # AI analysis via orchestrator
    try:
        from app.llm_orchestrator import enhance
        ai_result = await enhance(button_type="dividends", raw_data=data, deep=deep)
        if ai_result.get("ai_analysis"):
            data["ai_analysis"] = ai_result["ai_analysis"]
        if ai_result.get("ai_metadata"):
            data["ai_metadata"] = ai_result["ai_metadata"]
    except Exception:
        pass

    data["disclaimer"] = DISCLAIMER
    return data


def _fetch_stock_dividends(symbol: str) -> dict:
    """Fetch dividend history for a specific stock."""
    sym = symbol.upper().strip()
    if not sym.endswith(".NS"):
        sym += ".NS"

    ticker = yf.Ticker(sym)
    display_name = sym.replace(".NS", "")
    info = ticker.info or {}

    # Dividend history (last 5 years)
    history = []
    try:
        divs = ticker.dividends
        if divs is not None and not divs.empty:
            for date, amount in divs.items():
                try:
                    history.append({
                        "date": date.strftime("%Y-%m-%d"),
                        "amount": round(float(amount), 2),
                        "type": "Dividend",
                    })
                except Exception:
                    continue
            history = history[-20:]  # Last 20 entries max
    except Exception as e:
        logger.warning("Dividend history failed for %s: %s", sym, e)

    # Yield and payout data
    yield_pct = _safe_float(info.get("dividendYield"))
    if yield_pct:
        yield_pct = round(yield_pct * 100, 2)  # Convert to percentage
    payout_ratio = _safe_float(info.get("payoutRatio"))
    if payout_ratio:
        payout_ratio = round(payout_ratio * 100, 2)

    # Simple sustainability score (0-100)
    sustainability = _calc_sustainability(yield_pct, payout_ratio, len(history))

    return {
        "symbol": display_name,
        "history": history,
        "yield_pct": yield_pct,
        "payout_ratio": payout_ratio,
        "sustainability_score": sustainability,
        "current_price": _safe_float(info.get("regularMarketPrice") or info.get("currentPrice")),
        "annual_dividend": _safe_float(info.get("dividendRate")),
    }


def _fetch_top_yielders() -> dict:
    """Scan Nifty-50 for top dividend yielders."""
    yielders = []
    for sym in NIFTY_50:
        try:
            ticker = yf.Ticker(sym)
            info = ticker.info or {}
            yield_pct = info.get("dividendYield")
            if yield_pct and float(yield_pct) > 0:
                display = sym.replace(".NS", "")
                y = round(float(yield_pct) * 100, 2)
                payout = info.get("payoutRatio")
                p = round(float(payout) * 100, 2) if payout else None
                yielders.append({
                    "symbol": display,
                    "yield_pct": y,
                    "payout_ratio": p,
                    "current_price": _safe_float(info.get("regularMarketPrice") or info.get("currentPrice")),
                    "annual_dividend": _safe_float(info.get("dividendRate")),
                    "sustainability_score": _calc_sustainability(y, p, 5),
                })
        except Exception:
            continue

    yielders.sort(key=lambda x: x.get("yield_pct", 0), reverse=True)
    return {
        "top_yielders": yielders[:10],
        "history": [],
    }


def _calc_sustainability(yield_pct: float | None, payout_ratio: float | None, history_count: int) -> int:
    """Simple sustainability score 0-100."""
    score = 50  # Base
    if yield_pct:
        if yield_pct > 8:
            score -= 15  # Suspiciously high
        elif yield_pct > 3:
            score += 10
        elif yield_pct > 1:
            score += 5
    if payout_ratio:
        if payout_ratio < 40:
            score += 15
        elif payout_ratio < 60:
            score += 5
        elif payout_ratio > 80:
            score -= 20
    if history_count > 10:
        score += 15
    elif history_count > 5:
        score += 10
    elif history_count < 3:
        score -= 10
    return max(0, min(100, score))


def _format_for_ai(data: dict) -> str:
    text = ""
    if data.get("symbol"):
        text += f"Stock: {data['symbol']}\n"
        text += f"Yield: {data.get('yield_pct', 'N/A')}%, Payout Ratio: {data.get('payout_ratio', 'N/A')}%\n"
        text += f"Sustainability Score: {data.get('sustainability_score', 'N/A')}/100\n"
        for d in data.get("history", [])[-5:]:
            text += f"  {d['date']}: Rs {d['amount']}\n"
    for y in data.get("top_yielders", []):
        text += f"{y['symbol']}: Yield {y['yield_pct']}%, Payout {y.get('payout_ratio', 'N/A')}%\n"
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
