import asyncio
import logging

from app.database import log_api_call

logger = logging.getLogger(__name__)


def _fetch_nse_overview() -> dict:
    from nsetools import Nse
    nse = Nse()

    result = {
        "indices": [],
        "gainers": [],
        "losers": [],
        "advances_declines": None,
    }

    INDEX_DISPLAY = {
        "NIFTY 50": "NIFTY",
        "NIFTY BANK": "BANKNIFTY",
        "NIFTY IT": "NIFTY IT",
        "NIFTY FIN SERVICE": "FINNIFTY",
        "NIFTY MIDCAP 100": "MIDCAP 100",
        "NIFTY SMLCAP 100": "SMALLCAP 100",
    }
    for idx_name, display_name in INDEX_DISPLAY.items():
        try:
            q = nse.get_index_quote(idx_name)
            if q:
                result["indices"].append({
                    "name": display_name,
                    "value": q.get("last", q.get("lastPrice", 0)),
                    "change": q.get("variation", q.get("change", 0)),
                    "pct_change": q.get("percentChange", q.get("pChange", 0)),
                    "open": q.get("open", q.get("openingIndex", 0)),
                    "high": q.get("high", q.get("highIndiaPe", 0)),
                    "low": q.get("low", q.get("lowIndiaPe", 0)),
                })
        except Exception:
            pass

    try:
        gainers = nse.get_top_gainers()
        if gainers:
            for g in gainers[:5]:
                try:
                    result["gainers"].append({
                        "symbol": g.get("symbol", "?"),
                        "ltp": float(g.get("ltp", 0)),
                        "pct_change": float(g.get("net_price", g.get("netPrice", g.get("perChange", 0)))),
                    })
                except (ValueError, TypeError):
                    pass
    except Exception:
        pass

    try:
        losers = nse.get_top_losers()
        if losers:
            for l_item in losers[:5]:
                try:
                    result["losers"].append({
                        "symbol": l_item.get("symbol", "?"),
                        "ltp": float(l_item.get("ltp", 0)),
                        "pct_change": float(l_item.get("net_price", l_item.get("netPrice", l_item.get("perChange", 0)))),
                    })
                except (ValueError, TypeError):
                    pass
    except Exception:
        pass

    try:
        ad = nse.get_advances_declines()
        if ad:
            total_adv = sum(int(x.get("advances", 0)) for x in ad)
            total_dec = sum(int(x.get("declines", 0)) for x in ad)
            total_unch = sum(int(x.get("unchanged", 0)) for x in ad)
            result["advances_declines"] = {
                "advances": total_adv,
                "declines": total_dec,
                "unchanged": total_unch,
            }
    except Exception:
        pass

    # Derive a one-line market summary from index data
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

    return result


async def get_overview() -> dict:
    """Market overview — indices, gainers/losers, breadth."""
    loop = asyncio.get_event_loop()
    await log_api_call("nse", "overview")
    return await loop.run_in_executor(None, _fetch_nse_overview)
