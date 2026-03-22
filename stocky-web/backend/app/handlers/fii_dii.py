"""
FII/DII Institutional Flows handler.

Data sources (all free, no auth):
  - NSE Cash FII/DII: https://www.nseindia.com/api/fiidiiTradeReact
  - NSE F&O Participant OI: https://www.nseindia.com/api/participant-wise-open-interest
  - NSDL FPI Daily: https://www.fpi.nsdl.co.in/web/Reports/Latest.aspx
"""

import asyncio
import logging
import time
from typing import Any

import httpx
from bs4 import BeautifulSoup

from app.cache import cached

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# NSE session management — cookies required for API access
# ---------------------------------------------------------------------------

_nse_cookies: dict[str, str] = {}
_nse_cookie_ts: float = 0
_NSE_COOKIE_TTL = 240  # 4 minutes

NSE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com/reports-indices-fii-dii-trading-activity",
}

ALLORIGINS_PROXY = "https://api.allorigins.win/get?url="


async def _get_nse_client() -> httpx.AsyncClient:
    """Return an httpx client with valid NSE session cookies."""
    global _nse_cookies, _nse_cookie_ts

    if _nse_cookies and (time.time() - _nse_cookie_ts) < _NSE_COOKIE_TTL:
        client = httpx.AsyncClient(
            headers=NSE_HEADERS,
            cookies=_nse_cookies,
            timeout=25,
            follow_redirects=True,
        )
        return client

    # Refresh cookies by visiting NSE homepage
    client = httpx.AsyncClient(
        headers=NSE_HEADERS,
        timeout=15,
        follow_redirects=True,
    )
    try:
        resp = await client.get("https://www.nseindia.com")
        _nse_cookies = dict(resp.cookies)
        _nse_cookie_ts = time.time()
        # Rebuild client with fresh cookies
        await client.aclose()
        client = httpx.AsyncClient(
            headers=NSE_HEADERS,
            cookies=_nse_cookies,
            timeout=25,
            follow_redirects=True,
        )
        logger.info("NSE session cookies refreshed: %d cookies", len(_nse_cookies))
    except Exception as e:
        logger.warning("Failed to refresh NSE cookies: %s", e)

    return client


# ---------------------------------------------------------------------------
# Data fetchers
# ---------------------------------------------------------------------------


async def _fetch_cash_flows(client: httpx.AsyncClient) -> dict[str, Any] | None:
    """Fetch FII/DII cash market buy/sell/net from NSE."""
    try:
        resp = await client.get("https://www.nseindia.com/api/fiidiiTradeReact")
        resp.raise_for_status()
        raw = resp.json()

        # NSE returns a list of dicts with category, buyValue, sellValue, netValue
        result: dict[str, Any] = {"date": None, "fii": {}, "dii": {}}

        for entry in raw:
            cat = entry.get("category", "").upper()
            date_str = entry.get("date", "")
            if date_str and not result["date"]:
                result["date"] = date_str

            buy = _parse_cr(entry.get("buyValue"))
            sell = _parse_cr(entry.get("sellValue"))
            net = _parse_cr(entry.get("netValue"))

            if "FII" in cat or "FPI" in cat:
                result["fii"] = {"buy": buy, "sell": sell, "net": net}
            elif "DII" in cat:
                result["dii"] = {"buy": buy, "sell": sell, "net": net}

        return result if result["fii"] or result["dii"] else None

    except Exception as e:
        logger.warning("NSE cash flows fetch failed: %s", e)
        # Try fallback proxy
        return await _fetch_cash_flows_proxy()


async def _fetch_cash_flows_proxy() -> dict[str, Any] | None:
    """Fallback: fetch via allorigins proxy."""
    import urllib.parse

    url = urllib.parse.quote("https://www.nseindia.com/api/fiidiiTradeReact", safe="")
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{ALLORIGINS_PROXY}{url}")
            resp.raise_for_status()
            data = resp.json()
            contents = data.get("contents", "")
            if not contents:
                return None

            import json
            raw = json.loads(contents)
            result: dict[str, Any] = {"date": None, "fii": {}, "dii": {}}

            for entry in raw:
                cat = entry.get("category", "").upper()
                date_str = entry.get("date", "")
                if date_str and not result["date"]:
                    result["date"] = date_str

                buy = _parse_cr(entry.get("buyValue"))
                sell = _parse_cr(entry.get("sellValue"))
                net = _parse_cr(entry.get("netValue"))

                if "FII" in cat or "FPI" in cat:
                    result["fii"] = {"buy": buy, "sell": sell, "net": net}
                elif "DII" in cat:
                    result["dii"] = {"buy": buy, "sell": sell, "net": net}

            return result if result["fii"] or result["dii"] else None
    except Exception as e:
        logger.warning("Proxy cash flows fetch failed: %s", e)
        return None


async def _fetch_fo_participant_oi(client: httpx.AsyncClient) -> dict[str, Any] | None:
    """Fetch F&O participant-wise open interest from NSE."""
    try:
        resp = await client.get(
            "https://www.nseindia.com/api/participant-wise-open-interest"
        )
        resp.raise_for_status()
        raw = resp.json()

        # Structure: list of dicts with clientType, futIndexLong, futIndexShort, etc.
        participants: dict[str, dict] = {}
        date_str = None

        for entry in raw:
            ct = entry.get("clientType", "").strip()
            if not ct:
                continue

            if not date_str:
                date_str = entry.get("date", "")

            participants[ct] = {
                "index_futures": {
                    "long": _parse_num(entry.get("futIndexLong")),
                    "short": _parse_num(entry.get("futIndexShort")),
                },
                "index_options": {
                    "long": _parse_num(entry.get("optIndexCallLong", 0))
                    + _parse_num(entry.get("optIndexPutLong", 0)),
                    "short": _parse_num(entry.get("optIndexCallShort", 0))
                    + _parse_num(entry.get("optIndexPutShort", 0)),
                },
                "stock_futures": {
                    "long": _parse_num(entry.get("futStockLong")),
                    "short": _parse_num(entry.get("futStockShort")),
                },
                "stock_options": {
                    "long": _parse_num(entry.get("optStockCallLong", 0))
                    + _parse_num(entry.get("optStockPutLong", 0)),
                    "short": _parse_num(entry.get("optStockCallShort", 0))
                    + _parse_num(entry.get("optStockPutShort", 0)),
                },
            }

        return {"date": date_str, "participants": participants} if participants else None

    except Exception as e:
        logger.warning("NSE F&O participant OI fetch failed: %s", e)
        return None


async def _fetch_nsdl_fpi_daily() -> dict[str, Any] | None:
    """Scrape NSDL FPI daily flows (equity/debt/hybrid)."""
    try:
        async with httpx.AsyncClient(
            headers={
                "User-Agent": NSE_HEADERS["User-Agent"],
                "Accept": "text/html,application/xhtml+xml",
            },
            timeout=15,
        ) as client:
            resp = await client.get(
                "https://www.fpi.nsdl.co.in/web/Reports/Latest.aspx"
            )
            resp.raise_for_status()
            html = resp.text

        soup = BeautifulSoup(html, "html.parser")

        # Find the main data table
        tables = soup.find_all("table")
        if not tables:
            return None

        result: dict[str, Any] = {"date": None}

        # Look for rows with Equity, Debt, Hybrid
        for table in tables:
            rows = table.find_all("tr")
            for row in rows:
                cells = row.find_all(["td", "th"])
                if len(cells) < 2:
                    continue

                label = cells[0].get_text(strip=True).lower()

                if "equity" in label and "debt" not in label:
                    result["equity"] = _parse_nsdl_value(cells)
                elif "debt" in label and "equity" not in label:
                    result["debt"] = _parse_nsdl_value(cells)
                elif "hybrid" in label:
                    result["hybrid"] = _parse_nsdl_value(cells)
                elif "date" in label or "as on" in label:
                    result["date"] = cells[-1].get_text(strip=True) if len(cells) > 1 else None

        # Calculate total
        eq = result.get("equity", 0) or 0
        dt = result.get("debt", 0) or 0
        hy = result.get("hybrid", 0) or 0
        result["total"] = round(eq + dt + hy, 2)

        return result if any(result.get(k) for k in ("equity", "debt", "hybrid")) else None

    except Exception as e:
        logger.warning("NSDL FPI daily fetch failed: %s", e)
        return None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _parse_cr(value: Any) -> float | None:
    """Parse a value that might be a string with commas or a number (in crores)."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return round(float(value), 2)
    try:
        return round(float(str(value).replace(",", "").strip()), 2)
    except (ValueError, TypeError):
        return None


def _parse_num(value: Any) -> int:
    """Parse an integer value."""
    if value is None:
        return 0
    if isinstance(value, (int, float)):
        return int(value)
    try:
        return int(str(value).replace(",", "").strip())
    except (ValueError, TypeError):
        return 0


def _parse_nsdl_value(cells: list) -> float | None:
    """Extract the numeric net value from NSDL table cells."""
    # Usually the last cell has the net value
    for cell in reversed(cells[1:]):
        text = cell.get_text(strip=True).replace(",", "").replace("(", "-").replace(")", "")
        try:
            return round(float(text), 2)
        except (ValueError, TypeError):
            continue
    return None


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


@cached(ttl=300)
async def get_fii_dii_data(deep: bool = False) -> dict:
    """Fetch all FII/DII data and enhance with AI analysis."""

    # Fetch all data sources in parallel
    nse_client = await _get_nse_client()
    try:
        cash_task = _fetch_cash_flows(nse_client)
        fo_task = _fetch_fo_participant_oi(nse_client)
        nsdl_task = _fetch_nsdl_fpi_daily()

        cash, fo, nsdl = await asyncio.gather(
            cash_task, fo_task, nsdl_task,
            return_exceptions=True,
        )
    finally:
        await nse_client.aclose()

    # Handle exceptions from gather
    if isinstance(cash, Exception):
        logger.warning("Cash flows error: %s", cash)
        cash = None
    if isinstance(fo, Exception):
        logger.warning("F&O OI error: %s", fo)
        fo = None
    if isinstance(nsdl, Exception):
        logger.warning("NSDL FPI error: %s", nsdl)
        nsdl = None

    data: dict[str, Any] = {
        "cash": cash,
        "fo_participants": fo,
        "nsdl_fpi": nsdl,
    }

    # AI enhancement
    try:
        from app.llm_orchestrator import enhance

        ai_result = await enhance(
            button_type="fii_dii",
            raw_data=data,
            deep=deep,
        )
        if ai_result.get("ai_analysis"):
            data["ai_analysis"] = ai_result["ai_analysis"]
        if ai_result.get("ai_metadata"):
            data["ai_metadata"] = ai_result["ai_metadata"]
    except Exception as e:
        logger.warning("FII/DII AI enhancement failed: %s", e)

    return data
