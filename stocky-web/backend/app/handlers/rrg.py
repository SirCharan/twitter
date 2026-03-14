import asyncio
import logging
from datetime import datetime

import numpy as np
import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)

BENCHMARK = "^NSEI"

SECTORS = {
    "Nifty IT": "^CNXIT",
    "Nifty Bank": "^NSEBANK",
    "Nifty Auto": "^CNXAUTO",
    "Nifty Pharma": "^CNXPHARMA",
    "Nifty FMCG": "^CNXFMCG",
    "Nifty Metal": "^CNXMETAL",
    "Nifty Realty": "^CNXREALTY",
    "Nifty Energy": "^CNXENERGY",
}


async def get_rrg_data() -> dict:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _compute_rrg)


def _ema(values: np.ndarray, period: int) -> np.ndarray:
    alpha = 2.0 / (period + 1)
    result = np.empty_like(values)
    result[0] = values[0]
    for i in range(1, len(values)):
        result[i] = alpha * values[i] + (1 - alpha) * result[i - 1]
    return result


def _compute_rrg() -> dict:
    all_symbols = [BENCHMARK] + list(SECTORS.values())
    try:
        data = yf.download(all_symbols, period="6mo", progress=False, auto_adjust=True)
    except Exception as e:
        logger.error(f"RRG download failed: {e}")
        return {"sectors": [], "error": str(e)}

    if data.empty:
        return {"sectors": [], "error": "No data returned from yfinance"}

    # Handle multi-level columns from yf.download
    if isinstance(data.columns, pd.MultiIndex):
        closes = data["Close"]
    else:
        closes = data

    if BENCHMARK not in closes.columns:
        return {"sectors": [], "error": "Benchmark data unavailable"}

    bench = closes[BENCHMARK].dropna()
    if len(bench) < 50:
        return {"sectors": [], "error": "Insufficient benchmark data"}

    sectors_result = []
    tail_weeks = 4

    for name, symbol in SECTORS.items():
        try:
            if symbol not in closes.columns:
                continue
            sector_close = closes[symbol].dropna()
            common = bench.index.intersection(sector_close.index)
            if len(common) < 50:
                continue

            b = bench.loc[common].values.astype(float)
            s = sector_close.loc[common].values.astype(float)

            # RS-Line: sector relative to benchmark, normalized to start at 100
            rs_line = (s / b) / (s[0] / b[0]) * 100

            # RS-Ratio: smoothed RS-Line, re-centered so mean ~ 100
            rs_ratio_raw = _ema(rs_line, 10)
            rs_ratio = rs_ratio_raw / np.mean(rs_ratio_raw) * 100

            # RS-Momentum: rate of change of RS-Ratio, smoothed and centered at 100
            lookback = 10
            if len(rs_ratio) <= lookback:
                continue
            roc = rs_ratio[lookback:] / rs_ratio[:-lookback] * 100
            rs_momentum_raw = _ema(roc, 10)
            rs_momentum = rs_momentum_raw / np.mean(rs_momentum_raw) * 100

            current_ratio = round(float(rs_ratio[-1]), 2)
            current_momentum = round(float(rs_momentum[-1]), 2)

            # Quadrant assignment
            if current_ratio >= 100 and current_momentum >= 100:
                quadrant = "Leading"
            elif current_ratio >= 100 and current_momentum < 100:
                quadrant = "Weakening"
            elif current_ratio < 100 and current_momentum < 100:
                quadrant = "Lagging"
            else:
                quadrant = "Improving"

            color_map = {
                "Leading": "green",
                "Weakening": "yellow",
                "Lagging": "red",
                "Improving": "blue",
            }
            rec_map = {
                "Leading": "Buy",
                "Weakening": "Hold",
                "Lagging": "Sell",
                "Improving": "Watch",
            }

            # Tail: last 4 weekly snapshots + current
            tail = []
            step = 5  # ~1 trading week
            for w in range(tail_weeks, 0, -1):
                idx_r = len(rs_ratio) - 1 - (w * step)
                idx_m = len(rs_momentum) - 1 - (w * step)
                if idx_r >= 0 and idx_m >= 0:
                    tail.append({
                        "rs_ratio": round(float(rs_ratio[idx_r]), 2),
                        "rs_momentum": round(float(rs_momentum[idx_m]), 2),
                    })
            tail.append({
                "rs_ratio": current_ratio,
                "rs_momentum": current_momentum,
            })

            sectors_result.append({
                "name": name,
                "rs_ratio": current_ratio,
                "rs_momentum": current_momentum,
                "quadrant": quadrant,
                "color": color_map[quadrant],
                "recommendation": rec_map[quadrant],
                "tail": tail,
            })

        except Exception as e:
            logger.warning(f"RRG compute failed for {name}: {e}")
            continue

    return {
        "sectors": sectors_result,
        "benchmark": "Nifty 50",
        "as_of": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }
