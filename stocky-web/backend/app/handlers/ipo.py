import asyncio
import logging

import yfinance as yf

logger = logging.getLogger(__name__)

# Recent major Indian IPOs — updated periodically as a reliable fallback
KNOWN_IPOS = [
    {"company": "Hyundai India", "symbol": "HYUNDAI", "issue_price": 1960, "listing_date": "Oct 2024"},
    {"company": "Swiggy", "symbol": "SWIGGY", "issue_price": 390, "listing_date": "Nov 2024"},
    {"company": "NTPC Green Energy", "symbol": "NTPCGREEN", "issue_price": 108, "listing_date": "Nov 2024"},
    {"company": "Bajaj Housing Finance", "symbol": "BAJAJHFL", "issue_price": 70, "listing_date": "Sep 2024"},
    {"company": "Ola Electric", "symbol": "OLAELEC", "issue_price": 76, "listing_date": "Aug 2024"},
    {"company": "Firstcry", "symbol": "BRAINBEES", "issue_price": 465, "listing_date": "Aug 2024"},
    {"company": "Premier Energies", "symbol": "PREMIERENE", "issue_price": 450, "listing_date": "Sep 2024"},
]


async def get_ipo_data() -> dict:
    """Fetch IPO data — tries NSE API then falls back to known IPO list with live prices."""
    loop = asyncio.get_event_loop()
    try:
        result = await loop.run_in_executor(None, _fetch_from_nse)
        if result and (result.get("upcoming") or result.get("listed")):
            return result
    except Exception as e:
        logger.warning(f"NSE IPO fetch failed: {e}")
    return await loop.run_in_executor(None, _get_fallback_data)


def _fetch_from_nse() -> dict:
    """Attempt NSE India public API (requires browser-like session)."""
    try:
        import httpx
    except ImportError:
        raise RuntimeError("httpx not installed")

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.nseindia.com/market-data/ipos",
    }

    with httpx.Client(timeout=12, follow_redirects=True) as client:
        # Establish session cookie first
        client.get("https://www.nseindia.com/market-data/ipos", headers=headers)
        resp = client.get("https://www.nseindia.com/api/allIpo", headers=headers)
        resp.raise_for_status()
        raw = resp.json()

    upcoming = []
    for item in raw.get("ipo", {}).get("data", [])[:6]:
        upcoming.append({
            "company": item.get("companyName", ""),
            "symbol": item.get("symbol", ""),
            "issue_price": item.get("issuePrice", ""),
            "open_date": item.get("bidOpenDate", ""),
            "close_date": item.get("bidCloseDate", ""),
            "issue_size": item.get("issueSize", ""),
            "status": "upcoming",
        })

    listed = []
    for item in (raw.get("ipo", {}).get("data", []) + raw.get("sme", {}).get("data", []))[:8]:
        ip = item.get("issuePrice")
        lp = item.get("lastPrice") or item.get("listingPrice")
        gain = _calc_gain(ip, lp)
        listed.append({
            "company": item.get("companyName", ""),
            "symbol": item.get("symbol", ""),
            "issue_price": ip,
            "current_price": lp,
            "listing_date": item.get("listingDate", ""),
            "current_gain": gain,
            "status": "listed",
        })

    return {"upcoming": upcoming, "listed": listed, "source": "NSE"}


def _get_fallback_data() -> dict:
    """Use known IPO list + live yfinance prices."""
    listed = []
    for ipo in KNOWN_IPOS:
        sym = f"{ipo['symbol']}.NS"
        current = None
        gain = None
        try:
            ticker = yf.Ticker(sym)
            info = ticker.info
            price = info.get("regularMarketPrice") or info.get("currentPrice")
            if price:
                current = round(price, 2)
                gain = _calc_gain(ipo["issue_price"], current)
        except Exception:
            pass
        listed.append({
            "company": ipo["company"],
            "symbol": ipo["symbol"],
            "issue_price": ipo["issue_price"],
            "current_price": current,
            "listing_date": ipo["listing_date"],
            "current_gain": gain,
            "status": "listed",
        })

    return {"upcoming": [], "listed": listed, "source": "fallback"}


def _calc_gain(issue: object, current: object) -> float | None:
    try:
        ip = float(str(issue).replace(",", ""))
        cp = float(str(current).replace(",", ""))
        return round((cp - ip) / ip * 100, 2)
    except (ValueError, TypeError, ZeroDivisionError):
        return None
