"""
Dhan HQ API client for real-time market data.
Provides live quotes, OHLC, and historical data for Indian stocks.
Falls back gracefully — callers should handle empty returns and use yfinance as backup.
"""

import logging
from typing import Optional

import httpx

from app.config import DHAN_CLIENT_ID, DHAN_ACCESS_TOKEN

logger = logging.getLogger(__name__)

# NSE symbol → Dhan security ID mapping (Nifty-50 + major indices)
SECURITY_MAP: dict[str, int] = {
    # Indices
    "NIFTY": 13,
    "NIFTY 50": 13,
    "BANKNIFTY": 25,
    "NIFTY BANK": 25,
    # Nifty-50 constituents
    "RELIANCE": 2885,
    "INFY": 1594,
    "TCS": 11536,
    "HDFCBANK": 1333,
    "ICICIBANK": 4963,
    "SBIN": 3045,
    "ITC": 1660,
    "BHARTIARTL": 10604,
    "KOTAKBANK": 1922,
    "HINDUNILVR": 1394,
    "LT": 11483,
    "AXISBANK": 5900,
    "WIPRO": 3787,
    "TATAMOTORS": 3456,
    "MARUTI": 10999,
    "BAJFINANCE": 317,
    "TITAN": 3506,
    "SUNPHARMA": 3351,
    "HCLTECH": 7229,
    "NESTLEIND": 17963,
    "ONGC": 2475,
    "NTPC": 11630,
    "POWERGRID": 14977,
    "ULTRACEMCO": 11532,
    "ADANIENT": 25,
    "TECHM": 13538,
    "COALINDIA": 20374,
    "TATASTEEL": 3499,
    "M&M": 2031,
    "ASIANPAINT": 236,
    "JSWSTEEL": 11723,
    "BAJAJ-AUTO": 16669,
    "INDUSINDBK": 5258,
    "DRREDDY": 881,
    "DIVISLAB": 10940,
    "CIPLA": 694,
    "EICHERMOT": 910,
    "HEROMOTOCO": 1348,
    "APOLLOHOSP": 157,
    "BPCL": 526,
    "GRASIM": 1232,
    "HINDALCO": 1363,
    "TATACONSUM": 3432,
    "SBILIFE": 21808,
    "HDFCLIFE": 467,
    "BAJAJFINSV": 16675,
    "BRITANNIA": 547,
    "SHRIRAMFIN": 3703,
    "BEL": 383,
}

# Exchange segment constants
NSE_EQ = "NSE_EQ"
NSE_FNO = "NSE_FNO"
IDX = "IDX_I"


class DhanClient:
    """Async Dhan HQ API client."""

    BASE = "https://api.dhan.co/v2"

    def __init__(self):
        self._client_id = DHAN_CLIENT_ID
        self._token = DHAN_ACCESS_TOKEN
        self._enabled = bool(self._client_id and self._token)
        if not self._enabled:
            logger.warning("Dhan HQ credentials not configured — live quotes disabled")

    @property
    def enabled(self) -> bool:
        return self._enabled

    def _headers(self) -> dict:
        return {
            "access-token": self._token,
            "client-id": self._client_id,
            "Content-Type": "application/json",
        }

    def _resolve_security_id(self, symbol: str) -> Optional[int]:
        """Resolve NSE symbol to Dhan security ID."""
        clean = symbol.upper().replace(".NS", "").replace(".BO", "").strip()
        return SECURITY_MAP.get(clean)

    async def get_ltp(self, symbols: list[str]) -> dict[str, float]:
        """
        Get last traded prices for multiple symbols.
        Returns {symbol: ltp} dict. Missing symbols are omitted.
        """
        if not self._enabled:
            return {}

        # Build request payload
        nse_eq_ids = []
        symbol_map: dict[int, str] = {}  # security_id → original symbol

        for sym in symbols:
            sec_id = self._resolve_security_id(sym)
            if sec_id is not None:
                nse_eq_ids.append(sec_id)
                symbol_map[sec_id] = sym.upper().replace(".NS", "").replace(".BO", "")

        if not nse_eq_ids:
            return {}

        payload = {NSE_EQ: nse_eq_ids}

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"{self.BASE}/marketfeed/ltp",
                    headers=self._headers(),
                    json=payload,
                )
                if resp.status_code != 200:
                    logger.error("Dhan LTP error %d: %s", resp.status_code, resp.text[:200])
                    return {}

                data = resp.json()
                result = {}
                for item in data.get("data", {}).get(NSE_EQ, []):
                    sec_id = item.get("security_id")
                    if sec_id in symbol_map:
                        result[symbol_map[sec_id]] = item.get("LTP", 0)
                return result
        except Exception as e:
            logger.error("Dhan LTP failed: %s", e)
            return {}

    async def get_ohlc(self, symbols: list[str]) -> dict[str, dict]:
        """
        Get OHLC + volume for multiple symbols.
        Returns {symbol: {open, high, low, close, volume}}.
        """
        if not self._enabled:
            return {}

        nse_eq_ids = []
        symbol_map: dict[int, str] = {}

        for sym in symbols:
            sec_id = self._resolve_security_id(sym)
            if sec_id is not None:
                nse_eq_ids.append(sec_id)
                symbol_map[sec_id] = sym.upper().replace(".NS", "").replace(".BO", "")

        if not nse_eq_ids:
            return {}

        payload = {NSE_EQ: nse_eq_ids}

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"{self.BASE}/marketfeed/ohlc",
                    headers=self._headers(),
                    json=payload,
                )
                if resp.status_code != 200:
                    logger.error("Dhan OHLC error %d: %s", resp.status_code, resp.text[:200])
                    return {}

                data = resp.json()
                result = {}
                for item in data.get("data", {}).get(NSE_EQ, []):
                    sec_id = item.get("security_id")
                    if sec_id in symbol_map:
                        result[symbol_map[sec_id]] = {
                            "open": item.get("open", 0),
                            "high": item.get("high", 0),
                            "low": item.get("low", 0),
                            "close": item.get("close", 0),
                            "volume": item.get("volume", 0),
                        }
                return result
        except Exception as e:
            logger.error("Dhan OHLC failed: %s", e)
            return {}

    async def get_historical(
        self,
        symbol: str,
        interval: str = "DAY",
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> list[dict]:
        """
        Get historical OHLCV candles.
        interval: "1", "5", "15", "25", "60", "DAY"
        from_date/to_date: "YYYY-MM-DD"
        """
        if not self._enabled:
            return []

        sec_id = self._resolve_security_id(symbol)
        if sec_id is None:
            return []

        from datetime import datetime, timedelta

        if not to_date:
            to_date = datetime.now().strftime("%Y-%m-%d")
        if not from_date:
            from_date = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")

        payload = {
            "securityId": str(sec_id),
            "exchangeSegment": NSE_EQ,
            "instrument": "EQUITY",
            "expiryCode": 0,
            "fromDate": from_date,
            "toDate": to_date,
        }

        endpoint = "charts/historical" if interval == "DAY" else "charts/intraday"

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    f"{self.BASE}/{endpoint}",
                    headers=self._headers(),
                    json=payload,
                )
                if resp.status_code != 200:
                    logger.error("Dhan historical error %d: %s", resp.status_code, resp.text[:200])
                    return []

                data = resp.json()
                candles = []
                opens = data.get("open", [])
                highs = data.get("high", [])
                lows = data.get("low", [])
                closes = data.get("close", [])
                volumes = data.get("volume", [])
                timestamps = data.get("timestamp", [])

                for i in range(len(opens)):
                    candles.append({
                        "timestamp": timestamps[i] if i < len(timestamps) else None,
                        "open": opens[i],
                        "high": highs[i],
                        "low": lows[i],
                        "close": closes[i],
                        "volume": volumes[i] if i < len(volumes) else 0,
                    })
                return candles
        except Exception as e:
            logger.error("Dhan historical failed: %s", e)
            return []


# Singleton
dhan = DhanClient()
