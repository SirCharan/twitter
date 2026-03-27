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

# Dhan security IDs for indices (IDX_I segment)
DHAN_INDEX_MAP = {
    "NIFTY": 13,
    "BANKNIFTY": 25,
    "NIFTY IT": 10,
    "FINNIFTY": 27,
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


async def _fetch_indices_dhan() -> list[dict]:
    """Fetch Indian index prices from Dhan HQ API (fast, reliable)."""
    try:
        from app.dhan_client import dhan
        if not dhan.enabled:
            return []

        import httpx
        payload = {"IDX_I": list(DHAN_INDEX_MAP.values())}
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.post(
                f"{dhan.BASE}/marketfeed/ltp",
                headers=await dhan._headers(),
                json=payload,
            )
            if resp.status_code != 200:
                logger.warning("Dhan index LTP error %d", resp.status_code)
                return []

            data = resp.json()
            id_to_name = {v: k for k, v in DHAN_INDEX_MAP.items()}
            indices = []
            for item in data.get("data", {}).get("IDX_I", []):
                sec_id = item.get("security_id")
                name = id_to_name.get(sec_id)
                if name and item.get("LTP"):
                    ltp = float(item["LTP"])
                    prev = float(item.get("prev_close", 0) or 0)
                    change = round(ltp - prev, 2) if prev else 0
                    pct = round((change / prev) * 100, 2) if prev else 0
                    indices.append({
                        "name": name,
                        "value": round(ltp, 2),
                        "change": change,
                        "pct_change": pct,
                        "open": round(float(item.get("open", 0) or 0), 2),
                        "high": round(float(item.get("high", 0) or 0), 2),
                        "low": round(float(item.get("low", 0) or 0), 2),
                    })
            return indices
    except Exception as e:
        logger.warning("Dhan index fetch failed: %s", e)
        return []


def _fetch_indices_yfinance() -> list[dict]:
    """Fetch all major indices via yfinance (fallback)."""
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
                "change": round(float(vix_info.get("regularMarketChange", 0) or 0), 2),
                "pct_change": round(float(vix_info.get("regularMarketChangePercent", 0) or 0), 2),
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


async def get_overview(deep: bool = False) -> dict:
    """Market overview — indices, gainers/losers, breadth."""
    loop = asyncio.get_event_loop()
    await log_api_call("nse", "overview")
    data = await loop.run_in_executor(None, _fetch_nse_overview)

    # Overlay Dhan live prices on top of yfinance (more accurate, faster refresh)
    try:
        dhan_indices = await _fetch_indices_dhan()
        if dhan_indices:
            existing_names = {idx["name"] for idx in data.get("indices", [])}
            dhan_by_name = {idx["name"]: idx for idx in dhan_indices}
            # Replace yfinance values with Dhan where available
            updated = []
            for idx in data.get("indices", []):
                if idx["name"] in dhan_by_name:
                    dhan_val = dhan_by_name[idx["name"]]
                    # Only replace if Dhan has a real price (non-zero)
                    if dhan_val.get("value", 0) > 0:
                        updated.append(dhan_val)
                    else:
                        updated.append(idx)
                else:
                    updated.append(idx)
            # Add any Dhan indices not in yfinance
            for idx in dhan_indices:
                if idx["name"] not in existing_names and idx.get("value", 0) > 0:
                    updated.append(idx)
            data["indices"] = updated
    except Exception:
        pass  # Dhan overlay failed, keep yfinance data

    # AI market mood
    try:
        from app.prompts import OVERVIEW_MOOD_PROMPT
        indices = data.get("indices", [])
        ad = data.get("advances_declines")
        gainers = data.get("gainers", [])
        losers = data.get("losers", [])

        from app.llm_orchestrator import enhance
        ai_result = await enhance(
            button_type="overview",
            raw_data={
                "indices": indices,
                "advances_declines": ad,
                "vix": data.get("vix"),
                "gainers": gainers[:5] if gainers else [],
                "losers": losers[:5] if losers else [],
            },
            deep=deep,
        )
        if ai_result.get("ai_analysis"):
            data["ai_mood"] = ai_result["ai_analysis"]
        if ai_result.get("ai_metadata"):
            data["ai_metadata"] = ai_result["ai_metadata"]
    except Exception:
        pass

    # Options chain overlay (Nifty + BankNifty)
    try:
        from app.options_data import get_options_summary
        nifty_opts = await get_options_summary("NIFTY")
        bn_opts = await get_options_summary("BANKNIFTY")
        if nifty_opts or bn_opts:
            data["options"] = {}
            if nifty_opts:
                data["options"]["nifty"] = nifty_opts
            if bn_opts:
                data["options"]["banknifty"] = bn_opts
    except Exception:
        pass

    # Freshness check
    from app.freshness import check_freshness
    data = check_freshness(data, max_age_seconds=300)

    return data
