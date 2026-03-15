import asyncio
import logging
import time
from concurrent.futures import ThreadPoolExecutor

import yfinance as yf

from app import ai_client
from app.database import log_api_call

logger = logging.getLogger(__name__)

# ── yfinance symbol map for Indian indices ──────────────────────────
YF_INDEX_MAP = {
    "NIFTY": "^NSEI",
    "BANKNIFTY": "^NSEBANK",
    "NIFTY IT": "^CNXIT",
    "FINNIFTY": "NIFTY_FIN_SERVICE.NS",
    "MIDCAP 100": "^NSEMDCP100",
    "SMALLCAP 100": "^CNXSC",
}

# ── 60-second in-memory cache ───────────────────────────────────────
_overview_cache: dict = {"data": None, "ts": 0.0}

_timeout_pool = ThreadPoolExecutor(max_workers=4)


def _with_timeout(fn, timeout: int = 8):
    """Run *fn* in a thread; return None if it exceeds *timeout* seconds."""
    future = _timeout_pool.submit(fn)
    try:
        return future.result(timeout=timeout)
    except Exception:
        future.cancel()
        return None


def _fetch_indices_yfinance() -> list[dict]:
    """Fetch all major indices via yfinance (no NSE dependency)."""
    indices: list[dict] = []
    for display_name, yf_symbol in YF_INDEX_MAP.items():
        try:
            ticker = yf.Ticker(yf_symbol)
            info = ticker.info
            price = info.get("regularMarketPrice") or info.get("currentPrice")
            if not price:
                continue
            prev_close = info.get("regularMarketPreviousClose") or info.get("previousClose") or 0
            change = round(float(price) - float(prev_close), 2) if prev_close else 0
            pct = round((change / float(prev_close)) * 100, 2) if prev_close else 0
            indices.append({
                "name": display_name,
                "value": round(float(price), 2),
                "change": change,
                "pct_change": pct,
                "open": round(float(info.get("regularMarketOpen") or info.get("open") or 0), 2),
                "high": round(float(info.get("regularMarketDayHigh") or info.get("dayHigh") or 0), 2),
                "low": round(float(info.get("regularMarketDayLow") or info.get("dayLow") or 0), 2),
            })
        except Exception as exc:
            logger.warning("yfinance index %s failed: %s", yf_symbol, exc)
    return indices


def _fetch_nse_overview() -> dict:
    # ── cache check ─────────────────────────────────────────────────
    if _overview_cache["data"] and (time.time() - _overview_cache["ts"]) < 60:
        logger.debug("Returning cached overview (age %.1fs)", time.time() - _overview_cache["ts"])
        return _overview_cache["data"]

    result: dict = {
        "indices": [],
        "gainers": [],
        "losers": [],
        "advances_declines": None,
    }

    # ── 1. Indices via yfinance (primary, reliable) ─────────────────
    result["indices"] = _fetch_indices_yfinance()

    # ── 2. VIX via yfinance ─────────────────────────────────────────
    try:
        vix_ticker = yf.Ticker("^INDIAVIX")
        vix_info = vix_ticker.info
        vix_price = vix_info.get("regularMarketPrice") or vix_info.get("currentPrice")
        if vix_price:
            result["vix"] = {
                "value": round(float(vix_price), 2),
                "change_pct": round(float(vix_info.get("regularMarketChangePercent", 0) or 0), 2),
            }
    except Exception:
        pass

    # ── 3. Gainers / losers / breadth via nsetools (8s timeout) ─────
    try:
        from nsetools import Nse
        nse = Nse()

        gainers_raw = _with_timeout(nse.get_top_gainers, timeout=8)
        if gainers_raw:
            for g in gainers_raw[:5]:
                try:
                    result["gainers"].append({
                        "symbol": g.get("symbol", "?"),
                        "ltp": float(g.get("ltp", 0)),
                        "pct_change": float(g.get("net_price", g.get("netPrice", g.get("perChange", 0)))),
                    })
                except (ValueError, TypeError):
                    pass

        losers_raw = _with_timeout(nse.get_top_losers, timeout=8)
        if losers_raw:
            for l_item in losers_raw[:5]:
                try:
                    result["losers"].append({
                        "symbol": l_item.get("symbol", "?"),
                        "ltp": float(l_item.get("ltp", 0)),
                        "pct_change": float(l_item.get("net_price", l_item.get("netPrice", l_item.get("perChange", 0)))),
                    })
                except (ValueError, TypeError):
                    pass

        ad_raw = _with_timeout(nse.get_advances_declines, timeout=8)
        if ad_raw:
            total_adv = sum(int(x.get("advances", 0)) for x in ad_raw)
            total_dec = sum(int(x.get("declines", 0)) for x in ad_raw)
            total_unch = sum(int(x.get("unchanged", 0)) for x in ad_raw)
            result["advances_declines"] = {
                "advances": total_adv,
                "declines": total_dec,
                "unchanged": total_unch,
            }
    except Exception as exc:
        logger.warning("nsetools gainers/losers/breadth failed: %s", exc)

    # ── 4. Derive one-line market summary ───────────────────────────
    indices = result["indices"]
    nifty = next((idx for idx in indices if idx["name"] == "NIFTY"), None)
    if nifty:
        direction = "positive" if nifty["change"] > 0 else "negative" if nifty["change"] < 0 else "flat"
        others = [idx for idx in indices if idx["name"] != "NIFTY"]
        leading = max(others, key=lambda x: x["pct_change"], default=None) if others else None
        lagging = min(others, key=lambda x: x["pct_change"], default=None) if others else None
        summary = f"Nifty closed {direction} at {nifty['value']:,.2f} ({nifty['pct_change']:+.2f}%)"
        if leading and lagging and leading["name"] != lagging["name"]:
            summary += f"  ·  {leading['name']} led  ·  {lagging['name']} lagged"
        result["summary"] = summary

    # ── update cache ────────────────────────────────────────────────
    _overview_cache["data"] = result
    _overview_cache["ts"] = time.time()

    return result


async def get_overview() -> dict:
    """Market overview — indices, gainers/losers, breadth."""
    loop = asyncio.get_event_loop()
    await log_api_call("nse", "overview")
    data = await loop.run_in_executor(None, _fetch_nse_overview)

    # AI market mood
    try:
        indices = data.get("indices", [])
        ad = data.get("advances_declines")
        mood_prompt = "Indian market today: "
        for idx in indices[:3]:
            mood_prompt += f"{idx['name']} {idx['pct_change']:+.2f}%, "
        if ad:
            mood_prompt += f"Breadth: {ad['advances']} up / {ad['declines']} down. "
        if data.get("vix"):
            mood_prompt += f"VIX: {data['vix']['value']}. "
        mood_prompt += "Give a one-sentence market mood summary. Be specific and direct."
        mood = await ai_client.quick_chat(mood_prompt)
        if mood:
            data["ai_mood"] = mood
    except Exception:
        pass

    return data
