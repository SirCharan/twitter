import asyncio
import logging

import yfinance as yf

from app.handlers.analyse import (
    _get_fundamental_data,
    _get_technical_data,
    _resolve_symbol,
    _validate_yf_ticker,
)

logger = logging.getLogger(__name__)


async def compare_stocks(stocks_input: str) -> dict:
    """Compare 2-3 stocks side-by-side."""
    names = [s.strip() for s in stocks_input.split(",") if s.strip()]
    if len(names) < 2:
        raise ValueError("Need at least 2 stocks to compare")
    names = names[:3]

    loop = asyncio.get_event_loop()

    async def _fetch(name: str) -> dict | None:
        try:
            yf_sym, nse_sym, _ = _resolve_symbol(name)
            valid = await loop.run_in_executor(None, _validate_yf_ticker, yf_sym)
            if valid:
                yf_sym = valid
            ticker = yf.Ticker(yf_sym)
            fund, fund_score = await loop.run_in_executor(None, _get_fundamental_data, ticker)
            tech, tech_score = await loop.run_in_executor(None, _get_technical_data, yf_sym)
            try:
                display = ticker.info.get("shortName") or nse_sym
            except Exception:
                display = nse_sym
            return {
                "name": display,
                "symbol": nse_sym,
                "fundamental_score": fund_score,
                "technical_score": tech_score,
                "overall_score": round(fund_score + tech_score, 1),
                "pe": fund.get("pe"),
                "roe": fund.get("roe"),
                "debt_to_equity": fund.get("debt_to_equity"),
                "earnings_growth": fund.get("earnings_growth"),
                "revenue_growth": fund.get("revenue_growth"),
                "profit_margin": fund.get("profit_margin"),
                "market_cap": fund.get("market_cap"),
                "dividend_yield": fund.get("dividend_yield"),
                "rsi": tech.get("rsi"),
                "rsi_label": tech.get("rsi_label"),
                "macd_signal": tech.get("macd_signal"),
                "sma_signal": tech.get("sma_signal"),
                "price": tech.get("price"),
                "volume_ratio": tech.get("volume_ratio"),
                "changes": tech.get("changes", []),
            }
        except Exception as e:
            logger.error(f"Compare fetch error for {name}: {e}")
            return None

    results = await asyncio.gather(*[_fetch(n) for n in names])
    stocks = [r for r in results if r is not None]

    if not stocks:
        raise ValueError("Could not fetch data for any of the stocks")

    winner = max(stocks, key=lambda s: s.get("overall_score", 0)) if len(stocks) > 1 else None
    return {"stocks": stocks, "winner": winner["symbol"] if winner else None}
