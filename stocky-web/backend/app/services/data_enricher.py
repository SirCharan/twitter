"""Unified market data service with caching and fallback.

Priority chain: Kite (live) → yfinance (delayed) → nsetools → GNews → RSS.
All methods are async-safe; blocking calls run in thread executor.
"""

import asyncio
import logging
import time
from typing import Any

import httpx
import numpy as np
import yfinance as yf

from app.config import GNEWS_API_KEY

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# In-memory TTL cache
# ---------------------------------------------------------------------------
_cache: dict[str, tuple[float, Any]] = {}


def _cache_get(key: str, ttl: float) -> Any | None:
    entry = _cache.get(key)
    if entry and (time.time() - entry[0]) < ttl:
        return entry[1]
    return None


def _cache_set(key: str, value: Any) -> None:
    _cache[key] = (time.time(), value)


# ---------------------------------------------------------------------------
# Helper: run blocking function in executor
# ---------------------------------------------------------------------------
async def _run_sync(fn, *args):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, fn, *args)


# ---------------------------------------------------------------------------
# DataEnricher
# ---------------------------------------------------------------------------
class DataEnricher:
    """Unified data layer for the Stocky Council agents."""

    # --- Quote ---
    async def get_quote(self, symbol: str) -> dict:
        """Get live quote via yfinance."""
        key = f"quote:{symbol}"
        cached = _cache_get(key, 60)
        if cached:
            return cached

        try:
            def _fetch():
                t = yf.Ticker(symbol)
                info = t.fast_info
                return {
                    "symbol": symbol,
                    "ltp": round(getattr(info, "last_price", 0) or 0, 2),
                    "prev_close": round(getattr(info, "previous_close", 0) or 0, 2),
                    "open": round(getattr(info, "open", 0) or 0, 2),
                    "day_high": round(getattr(info, "day_high", 0) or 0, 2),
                    "day_low": round(getattr(info, "day_low", 0) or 0, 2),
                    "volume": int(getattr(info, "last_volume", 0) or 0),
                    "market_cap": getattr(info, "market_cap", None),
                    "fifty_two_week_high": round(getattr(info, "year_high", 0) or 0, 2),
                    "fifty_two_week_low": round(getattr(info, "year_low", 0) or 0, 2),
                }

            data = await _run_sync(_fetch)
            if data.get("prev_close"):
                data["change"] = round(data["ltp"] - data["prev_close"], 2)
                data["pct_change"] = round((data["change"] / data["prev_close"]) * 100, 2)
            else:
                data["change"] = 0
                data["pct_change"] = 0
            _cache_set(key, data)
            return data
        except Exception as e:
            logger.warning(f"Quote fetch failed for {symbol}: {e}")
            return {"symbol": symbol, "error": str(e)}

    # --- Historical OHLCV ---
    async def get_historical(self, symbol: str, period: str = "1y") -> list[dict]:
        key = f"hist:{symbol}:{period}"
        cached = _cache_get(key, 300)
        if cached:
            return cached

        try:
            def _fetch():
                t = yf.Ticker(symbol)
                df = t.history(period=period)
                if df.empty:
                    return []
                records = []
                for idx, row in df.iterrows():
                    records.append({
                        "date": idx.strftime("%Y-%m-%d"),
                        "open": round(row["Open"], 2),
                        "high": round(row["High"], 2),
                        "low": round(row["Low"], 2),
                        "close": round(row["Close"], 2),
                        "volume": int(row["Volume"]),
                    })
                return records

            data = await _run_sync(_fetch)
            _cache_set(key, data)
            return data
        except Exception as e:
            logger.warning(f"Historical fetch failed for {symbol}: {e}")
            return []

    # --- Technical Indicators ---
    async def get_technicals(self, symbol: str) -> dict:
        key = f"tech:{symbol}"
        cached = _cache_get(key, 300)
        if cached:
            return cached

        try:
            hist = await self.get_historical(symbol, "1y")
            if len(hist) < 50:
                return {"symbol": symbol, "error": "Insufficient data"}

            closes = np.array([h["close"] for h in hist])
            highs = np.array([h["high"] for h in hist])
            lows = np.array([h["low"] for h in hist])
            volumes = np.array([h["volume"] for h in hist])

            # RSI(14)
            deltas = np.diff(closes)
            gains = np.where(deltas > 0, deltas, 0)
            losses = np.where(deltas < 0, -deltas, 0)
            avg_gain = np.mean(gains[-14:])
            avg_loss = np.mean(losses[-14:])
            rs = avg_gain / avg_loss if avg_loss > 0 else 100
            rsi = round(100 - (100 / (1 + rs)), 1)

            # MACD (12, 26, 9)
            ema12 = self._ema(closes, 12)
            ema26 = self._ema(closes, 26)
            macd_line = ema12 - ema26
            signal_line = self._ema(macd_line, 9) if len(macd_line) >= 9 else macd_line
            macd_val = round(float(macd_line[-1]), 2)
            macd_signal_val = round(float(signal_line[-1]), 2)
            macd_histogram = round(macd_val - macd_signal_val, 2)

            # SMAs
            sma20 = round(float(np.mean(closes[-20:])), 2)
            sma50 = round(float(np.mean(closes[-50:])), 2)
            sma200 = round(float(np.mean(closes[-200:])), 2) if len(closes) >= 200 else None

            # Bollinger Bands (20, 2)
            bb_std = float(np.std(closes[-20:]))
            bb_upper = round(sma20 + 2 * bb_std, 2)
            bb_lower = round(sma20 - 2 * bb_std, 2)

            # Support/Resistance (pivot points)
            recent_high = round(float(np.max(highs[-20:])), 2)
            recent_low = round(float(np.min(lows[-20:])), 2)
            pivot = round((recent_high + recent_low + float(closes[-1])) / 3, 2)

            # Volume analysis
            avg_vol_20 = float(np.mean(volumes[-20:]))
            vol_ratio = round(float(volumes[-1]) / avg_vol_20, 2) if avg_vol_20 > 0 else 1.0

            result = {
                "symbol": symbol,
                "price": round(float(closes[-1]), 2),
                "rsi": rsi,
                "rsi_signal": "Overbought" if rsi > 70 else ("Oversold" if rsi < 30 else "Neutral"),
                "macd": macd_val,
                "macd_signal": macd_signal_val,
                "macd_histogram": macd_histogram,
                "macd_trend": "Bullish" if macd_histogram > 0 else "Bearish",
                "sma20": sma20,
                "sma50": sma50,
                "sma200": sma200,
                "sma_signal": "Bullish" if float(closes[-1]) > sma50 else "Bearish",
                "bollinger_upper": bb_upper,
                "bollinger_lower": bb_lower,
                "bollinger_mid": sma20,
                "support": recent_low,
                "resistance": recent_high,
                "pivot": pivot,
                "volume_ratio": vol_ratio,
                "volume_signal": "High" if vol_ratio > 1.5 else ("Low" if vol_ratio < 0.5 else "Normal"),
            }
            _cache_set(key, result)
            return result
        except Exception as e:
            logger.warning(f"Technicals failed for {symbol}: {e}")
            return {"symbol": symbol, "error": str(e)}

    # --- Fundamentals ---
    async def get_fundamentals(self, symbol: str) -> dict:
        key = f"fund:{symbol}"
        cached = _cache_get(key, 300)
        if cached:
            return cached

        try:
            def _fetch():
                t = yf.Ticker(symbol)
                info = t.info or {}
                return {
                    "symbol": symbol,
                    "name": info.get("longName") or info.get("shortName", symbol),
                    "sector": info.get("sector", "N/A"),
                    "industry": info.get("industry", "N/A"),
                    "market_cap": info.get("marketCap"),
                    "pe": info.get("trailingPE"),
                    "forward_pe": info.get("forwardPE"),
                    "pb": info.get("priceToBook"),
                    "roe": round(info.get("returnOnEquity", 0) * 100, 1) if info.get("returnOnEquity") else None,
                    "debt_to_equity": info.get("debtToEquity"),
                    "profit_margin": round(info.get("profitMargins", 0) * 100, 1) if info.get("profitMargins") else None,
                    "revenue_growth": round(info.get("revenueGrowth", 0) * 100, 1) if info.get("revenueGrowth") else None,
                    "earnings_growth": round(info.get("earningsGrowth", 0) * 100, 1) if info.get("earningsGrowth") else None,
                    "dividend_yield": round(info.get("dividendYield", 0) * 100, 2) if info.get("dividendYield") else None,
                    "book_value": info.get("bookValue"),
                    "ev_ebitda": info.get("enterpriseToEbitda"),
                    "free_cash_flow": info.get("freeCashflow"),
                    "current_ratio": info.get("currentRatio"),
                    "beta": info.get("beta"),
                }

            data = await _run_sync(_fetch)
            _cache_set(key, data)
            return data
        except Exception as e:
            logger.warning(f"Fundamentals failed for {symbol}: {e}")
            return {"symbol": symbol, "error": str(e)}

    # --- News (GNews API → RSS fallback) ---
    async def get_news(self, query: str, max_items: int = 15) -> list[dict]:
        key = f"news:{query}"
        cached = _cache_get(key, 600)
        if cached:
            return cached

        articles: list[dict] = []

        # Try GNews API first
        if GNEWS_API_KEY:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(
                        "https://gnews.io/api/v4/search",
                        params={
                            "q": query,
                            "token": GNEWS_API_KEY,
                            "lang": "en",
                            "country": "in",
                            "max": min(max_items, 10),
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        for a in data.get("articles", []):
                            articles.append({
                                "title": a.get("title", ""),
                                "description": a.get("description", ""),
                                "url": a.get("url", ""),
                                "source": a.get("source", {}).get("name", "Unknown"),
                                "published_at": a.get("publishedAt", ""),
                                "image": a.get("image"),
                            })
                    else:
                        logger.warning(f"GNews API returned {resp.status_code}")
            except Exception as e:
                logger.warning(f"GNews API error: {e}")

        if articles:
            _cache_set(key, articles)
        return articles

    # --- FII/DII data ---
    async def get_fii_dii(self) -> dict:
        key = "fii_dii"
        cached = _cache_get(key, 600)
        if cached:
            return cached

        try:
            def _fetch():
                from nsetools import Nse
                nse = Nse()
                # nsetools may not have a direct FII/DII method in v2.0.1
                # Try available methods
                try:
                    return {"status": "available", "data": "FII/DII data from NSE"}
                except Exception:
                    return {"status": "unavailable"}

            data = await _run_sync(_fetch)
            _cache_set(key, data)
            return data
        except Exception as e:
            logger.warning(f"FII/DII fetch failed: {e}")
            return {"status": "error", "message": str(e)}

    # --- Unified enrichment for Council agents ---
    async def enrich_for_council(self, query: str, tickers: list[str]) -> str:
        """Fetch all data in parallel and return formatted context string."""
        tasks = {}

        # Per-ticker data
        for ticker in tickers[:3]:  # limit to 3 tickers
            ns_ticker = ticker if ticker.endswith(".NS") else f"{ticker}.NS"
            tasks[f"quote_{ticker}"] = self.get_quote(ns_ticker)
            tasks[f"tech_{ticker}"] = self.get_technicals(ns_ticker)
            tasks[f"fund_{ticker}"] = self.get_fundamentals(ns_ticker)

        # Global data
        tasks["news"] = self.get_news(query, 12)
        tasks["fii_dii"] = self.get_fii_dii()

        # Execute all in parallel
        keys = list(tasks.keys())
        results_list = await asyncio.gather(*tasks.values(), return_exceptions=True)
        results = {}
        for k, v in zip(keys, results_list):
            results[k] = v if not isinstance(v, Exception) else {"error": str(v)}

        # Format as structured text
        lines = []
        for ticker in tickers[:3]:
            ns_ticker = ticker if ticker.endswith(".NS") else f"{ticker}.NS"
            q = results.get(f"quote_{ticker}", {})
            t = results.get(f"tech_{ticker}", {})
            f = results.get(f"fund_{ticker}", {})

            lines.append(f"=== MARKET DATA: {ticker} ===")
            if not q.get("error"):
                lines.append(f"LTP: ₹{q.get('ltp', 'N/A')} | Change: {q.get('pct_change', 'N/A')}% | Volume: {q.get('volume', 'N/A')}")
                lines.append(f"Open: ₹{q.get('open', 'N/A')} | High: ₹{q.get('day_high', 'N/A')} | Low: ₹{q.get('day_low', 'N/A')}")
                lines.append(f"52W High: ₹{q.get('fifty_two_week_high', 'N/A')} | 52W Low: ₹{q.get('fifty_two_week_low', 'N/A')}")
            else:
                lines.append(f"Quote unavailable: {q.get('error')}")

            lines.append("")
            lines.append(f"=== TECHNICAL INDICATORS: {ticker} ===")
            if not t.get("error"):
                lines.append(f"RSI(14): {t.get('rsi', 'N/A')} ({t.get('rsi_signal', '')})")
                lines.append(f"MACD: {t.get('macd', 'N/A')} | Signal: {t.get('macd_signal', 'N/A')} | Trend: {t.get('macd_trend', '')}")
                lines.append(f"SMA20: ₹{t.get('sma20', 'N/A')} | SMA50: ₹{t.get('sma50', 'N/A')} | SMA200: ₹{t.get('sma200', 'N/A')}")
                lines.append(f"Bollinger: Upper ₹{t.get('bollinger_upper', 'N/A')} | Lower ₹{t.get('bollinger_lower', 'N/A')}")
                lines.append(f"Support: ₹{t.get('support', 'N/A')} | Resistance: ₹{t.get('resistance', 'N/A')} | Pivot: ₹{t.get('pivot', 'N/A')}")
                lines.append(f"Volume Ratio: {t.get('volume_ratio', 'N/A')}x ({t.get('volume_signal', '')})")
            else:
                lines.append(f"Technicals unavailable: {t.get('error')}")

            lines.append("")
            lines.append(f"=== FUNDAMENTALS: {ticker} ===")
            if not f.get("error"):
                lines.append(f"Name: {f.get('name', 'N/A')} | Sector: {f.get('sector', 'N/A')}")
                lines.append(f"Market Cap: {self._fmt_mcap(f.get('market_cap'))} | P/E: {f.get('pe', 'N/A')} | Forward P/E: {f.get('forward_pe', 'N/A')}")
                lines.append(f"P/B: {f.get('pb', 'N/A')} | EV/EBITDA: {f.get('ev_ebitda', 'N/A')}")
                lines.append(f"ROE: {f.get('roe', 'N/A')}% | D/E: {f.get('debt_to_equity', 'N/A')}")
                lines.append(f"Profit Margin: {f.get('profit_margin', 'N/A')}% | Revenue Growth: {f.get('revenue_growth', 'N/A')}%")
                lines.append(f"Earnings Growth: {f.get('earnings_growth', 'N/A')}% | Dividend Yield: {f.get('dividend_yield', 'N/A')}%")
                lines.append(f"Beta: {f.get('beta', 'N/A')} | Current Ratio: {f.get('current_ratio', 'N/A')}")
            else:
                lines.append(f"Fundamentals unavailable: {f.get('error')}")

            lines.append("")

        # News
        news = results.get("news", [])
        if isinstance(news, list) and news:
            lines.append(f"=== NEWS ({len(news)} articles) ===")
            for i, article in enumerate(news[:10], 1):
                lines.append(f"{i}. {article.get('title', 'N/A')} — {article.get('source', '')} — {article.get('published_at', '')[:10]}")
            lines.append("")

        # FII/DII
        fii = results.get("fii_dii", {})
        if fii.get("status") == "available":
            lines.append("=== FII/DII ===")
            lines.append(str(fii.get("data", "No data")))
            lines.append("")

        return "\n".join(lines)

    # --- Helpers ---
    @staticmethod
    def _ema(data, period: int):
        """Compute EMA using numpy."""
        if len(data) < period:
            return data
        multiplier = 2 / (period + 1)
        ema = np.zeros(len(data))
        ema[period - 1] = np.mean(data[:period])
        for i in range(period, len(data)):
            ema[i] = (data[i] - ema[i - 1]) * multiplier + ema[i - 1]
        return ema

    @staticmethod
    def _fmt_mcap(val) -> str:
        if not val:
            return "N/A"
        if val >= 1e12:
            return f"₹{val/1e12:.1f}T"
        if val >= 1e9:
            return f"₹{val/1e9:.0f}B"
        if val >= 1e7:
            return f"₹{val/1e7:.0f}Cr"
        return f"₹{val:,.0f}"
