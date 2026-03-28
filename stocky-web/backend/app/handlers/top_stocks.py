"""
Top Stocks handler — aggregates multiple scan types, gainers/losers,
and sector movers into a single tabbed dashboard response.
"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

from app.cache import cached

logger = logging.getLogger(__name__)

IST = timezone(timedelta(hours=5, minutes=30))
_pool = ThreadPoolExecutor(max_workers=2)


def _with_timeout(fn, timeout: int = 8):
    """Run fn in a thread; return None on timeout."""
    future = _pool.submit(fn)
    try:
        return future.result(timeout=timeout)
    except Exception:
        future.cancel()
        return None


def _fetch_gainers_losers() -> tuple[list[dict], list[dict]]:
    """Fetch top gainers/losers via nsetools."""
    try:
        from nsetools import Nse
        nse = Nse()

        gainers = []
        raw = _with_timeout(nse.get_top_gainers, timeout=8)
        if raw:
            for g in raw[:10]:
                try:
                    gainers.append({
                        "symbol": g.get("symbol", "?"),
                        "ltp": round(float(g.get("ltp", 0)), 2),
                        "change_pct": round(float(
                            g.get("net_price", g.get("netPrice", g.get("perChange", 0)))
                        ), 2),
                        "trigger": f"+{round(float(g.get('net_price', g.get('netPrice', g.get('perChange', 0)))), 2)}% today",
                    })
                except (ValueError, TypeError):
                    pass

        losers = []
        raw = _with_timeout(nse.get_top_losers, timeout=8)
        if raw:
            for l_item in raw[:10]:
                try:
                    chg = round(float(
                        l_item.get("net_price", l_item.get("netPrice", l_item.get("perChange", 0)))
                    ), 2)
                    losers.append({
                        "symbol": l_item.get("symbol", "?"),
                        "ltp": round(float(l_item.get("ltp", 0)), 2),
                        "change_pct": chg,
                        "trigger": f"{chg}% today",
                    })
                except (ValueError, TypeError):
                    pass

        return gainers, losers
    except Exception as e:
        logger.warning("Gainers/losers fetch failed: %s", e)
        return [], []


@cached(ttl=120)
async def get_top_stocks(deep: bool = False) -> dict:
    """Aggregate top stocks dashboard — gainers, losers, scans, sectors."""
    loop = asyncio.get_event_loop()

    from app.handlers.scan import _scan_stocks_multi, _get_sector_movers

    # Run all data fetches in parallel
    scan_future = loop.run_in_executor(
        None, _scan_stocks_multi,
        ["volume_pump", "breakout", "52w_high", "52w_low"],
    )
    sector_future = loop.run_in_executor(None, _get_sector_movers)
    gl_future = loop.run_in_executor(None, _fetch_gainers_losers)

    scan_results, sectors, (gainers, losers) = await asyncio.gather(
        scan_future, sector_future, gl_future,
    )

    tabs = {
        "gainers": gainers,
        "losers": losers,
        "volume_pump": scan_results.get("volume_pump", []),
        "breakout": scan_results.get("breakout", []),
        "52w_high": scan_results.get("52w_high", []),
        "52w_low": scan_results.get("52w_low", []),
        "sector_movers": sectors,
    }

    tab_counts = {k: len(v) for k, v in tabs.items()}

    data = {
        "tabs": tabs,
        "tab_counts": tab_counts,
        "default_tab": "gainers",
        "timestamp": datetime.now(IST).strftime("%Y-%m-%d %H:%M IST"),
    }

    # AI interpretation
    try:
        from app.llm_orchestrator import enhance

        # Build compact summary for AI (don't send all data — too large)
        summary = {
            "gainers_top3": gainers[:3],
            "losers_top3": losers[:3],
            "volume_pump_top3": scan_results.get("volume_pump", [])[:3],
            "breakout_top3": scan_results.get("breakout", [])[:3],
            "sector_movers": sectors[:5],
            "tab_counts": tab_counts,
        }
        ai_result = await enhance(
            button_type="top_stocks",
            raw_data=summary,
            deep=deep,
        )
        if ai_result.get("ai_analysis"):
            data["ai_analysis"] = ai_result["ai_analysis"]
        if ai_result.get("ai_metadata"):
            data["ai_metadata"] = ai_result["ai_metadata"]
    except Exception as e:
        logger.warning("Top stocks AI enhancement failed: %s", e)

    return data
