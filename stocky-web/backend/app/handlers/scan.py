import asyncio
import logging

import yfinance as yf

logger = logging.getLogger(__name__)

# Nifty 100 scan universe (excluding M&M due to symbol complexity)
SCAN_UNIVERSE = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "BHARTIARTL.NS", "ICICIBANK.NS",
    "INFOSYS.NS", "SBIN.NS", "WIPRO.NS", "HINDUNILVR.NS", "ITC.NS",
    "BAJFINANCE.NS", "KOTAKBANK.NS", "LT.NS", "AXISBANK.NS", "ASIANPAINT.NS",
    "MARUTI.NS", "SUNPHARMA.NS", "TITAN.NS", "NESTLEIND.NS", "ULTRACEMCO.NS",
    "ONGC.NS", "NTPC.NS", "POWERGRID.NS", "TECHM.NS", "HCLTECH.NS",
    "BAJAJFINSV.NS", "TATAMOTORS.NS", "TATASTEEL.NS", "ADANIPORTS.NS", "ADANIENT.NS",
    "COALINDIA.NS", "DRREDDY.NS", "CIPLA.NS", "EICHERMOT.NS", "HEROMOTOCO.NS",
    "JSWSTEEL.NS", "INDUSINDBK.NS", "BAJAJ-AUTO.NS", "GRASIM.NS", "DIVISLAB.NS",
    "BPCL.NS", "SBILIFE.NS", "BRITANNIA.NS", "APOLLOHOSP.NS", "TATACONSUM.NS",
    "VEDL.NS", "HDFCLIFE.NS", "HINDALCO.NS", "BANKBARODA.NS", "ZOMATO.NS",
    "TRENT.NS", "SHRIRAMFIN.NS", "JIOFIN.NS", "PIDILITIND.NS", "HAVELLS.NS",
    "DLF.NS", "ABB.NS", "GODREJCP.NS", "DABUR.NS", "SIEMENS.NS",
    "TORNTPHARM.NS", "AMBUJACEM.NS", "ICICIPRULI.NS", "PFC.NS", "RECLTD.NS",
    "TATAPOWER.NS", "IOC.NS", "INDIGO.NS", "CHOLAFIN.NS", "CANBK.NS",
    "HAL.NS", "BEL.NS", "IRFC.NS", "MANKIND.NS", "PERSISTENT.NS",
    "LTIM.NS", "MPHASIS.NS", "COFORGE.NS", "MAXHEALTH.NS", "POLYCAB.NS",
    "ADANIGREEN.NS", "ADANIPOWER.NS", "ATGL.NS", "AWL.NS", "SBICARD.NS",
    "UNIONBANK.NS", "PNB.NS", "INDIANB.NS", "FEDERALBNK.NS", "BANDHANBNK.NS",
    "JUBLFOOD.NS", "PAGEIND.NS", "MUTHOOTFIN.NS", "LICI.NS", "IRCTC.NS",
    "PAYTM.NS", "NYKAA.NS", "DELHIVERY.NS", "LODHA.NS", "MOTHERSON.NS",
]

SECTOR_INDICES = {
    "Nifty IT": "^CNXIT",
    "Nifty Bank": "^NSEBANK",
    "Nifty Auto": "^CNXAUTO",
    "Nifty Pharma": "^CNXPHARMA",
    "Nifty FMCG": "^CNXFMCG",
    "Nifty Metal": "^CNXMETAL",
    "Nifty Realty": "^CNXREALTY",
    "Nifty Energy": "^CNXENERGY",
}


async def run_scan(scan_type: str) -> dict:
    """Run a market scan and return results."""
    loop = asyncio.get_event_loop()

    if scan_type in ("volume_pump", "breakout", "52w_high", "52w_low", "gap_up", "gap_down", "momentum"):
        results = await loop.run_in_executor(None, _scan_stocks, scan_type)
    elif scan_type == "sector_movers":
        results = await loop.run_in_executor(None, _get_sector_movers)
    elif scan_type == "fii_dii":
        results = await loop.run_in_executor(None, _get_sector_movers)  # fallback to sector
    else:
        results = []

    data = {
        "scan_type": scan_type,
        "results": results,
        "count": len(results),
    }

    # AI scan analysis
    if results:
        try:
            from app import ai_client
            from app.prompts import SCAN_ANALYSIS_PROMPT

            scan_label = scan_type.replace("_", " ").title()
            scan_text = ""
            for r in results[:8]:
                scan_text += (
                    f"{r['symbol']}: LTP {r['ltp']} ({r.get('change_pct', 0):+.2f}%) "
                    f"— {r.get('trigger', '')}\n"
                )

            analysis = await ai_client.feature_analysis(
                SCAN_ANALYSIS_PROMPT.format(scan_type=scan_label, data=scan_text),
                max_tokens=200,
            )
            if analysis:
                data["ai_analysis"] = analysis
        except Exception:
            pass

    return data


def _scan_stocks(scan_type: str) -> list[dict]:
    """Batch download and scan stocks."""
    results = []
    universe = SCAN_UNIVERSE

    try:
        data = yf.download(universe, period="3mo", progress=False, auto_adjust=True)
        if data.empty:
            return []

        # In yfinance with multiple tickers, columns are MultiIndex (field, ticker)
        closes = data["Close"] if "Close" in data.columns else data.xs("Close", axis=1, level=0)
        try:
            volumes = data["Volume"] if "Volume" in data.columns else data.xs("Volume", axis=1, level=0)
        except Exception:
            volumes = None

        for sym in universe:
            try:
                if sym not in closes.columns:
                    continue

                s_close = closes[sym].dropna()
                if len(s_close) < 20:
                    continue

                current = float(s_close.iloc[-1])
                high_52 = float(s_close.max())
                low_52 = float(s_close.min())
                chg_1d = 0.0
                if len(s_close) >= 2:
                    prev = float(s_close.iloc[-2])
                    chg_1d = round((current - prev) / prev * 100, 2) if prev else 0

                sparkline = [round(float(x), 2) for x in s_close.tail(5).tolist()]

                short = sym.replace(".NS", "")

                if scan_type == "volume_pump" and volumes is not None and sym in volumes.columns:
                    s_vol = volumes[sym].dropna()
                    if len(s_vol) >= 20:
                        vol_today = float(s_vol.iloc[-1])
                        vol_avg = float(s_vol.tail(20).mean())
                        ratio = vol_today / vol_avg if vol_avg else 0
                        if ratio >= 2.0:
                            results.append({
                                "symbol": short,
                                "ltp": round(current, 2),
                                "change_pct": chg_1d,
                                "sparkline": sparkline,
                                "volume_ratio": round(ratio, 1),
                                "trigger": f"{round(ratio, 1)}× avg volume",
                            })

                elif scan_type == "breakout":
                    if high_52 > 0 and current >= high_52 * 0.97:
                        pct = round((current / high_52 - 1) * 100, 1)
                        results.append({
                            "symbol": short,
                            "ltp": round(current, 2),
                            "change_pct": chg_1d,
                            "sparkline": sparkline,
                            "high_52w": round(high_52, 2),
                            "pct_from_high": pct,
                            "trigger": f"Near 52W high ({pct}%)",
                        })

                elif scan_type == "52w_high":
                    pct = round((current / high_52 - 1) * 100, 1) if high_52 else 0
                    results.append({
                        "symbol": short,
                        "ltp": round(current, 2),
                        "change_pct": chg_1d,
                        "sparkline": sparkline,
                        "high_52w": round(high_52, 2),
                        "pct_from_high": pct,
                        "trigger": f"{pct}% from 52W high",
                    })

                elif scan_type == "52w_low":
                    pct = round((current / low_52 - 1) * 100, 1) if low_52 else 0
                    results.append({
                        "symbol": short,
                        "ltp": round(current, 2),
                        "change_pct": chg_1d,
                        "sparkline": sparkline,
                        "low_52w": round(low_52, 2),
                        "pct_from_low": pct,
                        "trigger": f"{pct}% from 52W low",
                    })

                elif scan_type == "gap_up":
                    if len(s_close) >= 2:
                        try:
                            opens = data["Open"] if "Open" in data.columns else data.xs("Open", axis=1, level=0)
                            if sym in opens.columns:
                                today_open = float(opens[sym].dropna().iloc[-1])
                                prev_close = float(s_close.iloc[-2])
                                gap_pct = round((today_open - prev_close) / prev_close * 100, 2)
                                if gap_pct >= 1.0:
                                    results.append({
                                        "symbol": short,
                                        "ltp": round(current, 2),
                                        "change_pct": chg_1d,
                                        "sparkline": sparkline,
                                        "trigger": f"Gap up {gap_pct}%",
                                    })
                        except Exception:
                            pass

                elif scan_type == "gap_down":
                    if len(s_close) >= 2:
                        try:
                            opens = data["Open"] if "Open" in data.columns else data.xs("Open", axis=1, level=0)
                            if sym in opens.columns:
                                today_open = float(opens[sym].dropna().iloc[-1])
                                prev_close = float(s_close.iloc[-2])
                                gap_pct = round((today_open - prev_close) / prev_close * 100, 2)
                                if gap_pct <= -1.0:
                                    results.append({
                                        "symbol": short,
                                        "ltp": round(current, 2),
                                        "change_pct": chg_1d,
                                        "sparkline": sparkline,
                                        "trigger": f"Gap down {gap_pct}%",
                                    })
                        except Exception:
                            pass

                elif scan_type == "momentum":
                    if len(s_close) >= 20:
                        sma20 = float(s_close.tail(20).mean())
                        delta = s_close.diff()
                        gain = delta.clip(lower=0).ewm(span=14, adjust=False).mean()
                        loss_s = (-delta.clip(upper=0)).ewm(span=14, adjust=False).mean()
                        rsi_val = 100 - (100 / (1 + float(gain.iloc[-1]) / max(float(loss_s.iloc[-1]), 1e-9)))
                        if rsi_val > 60 and current > sma20:
                            results.append({
                                "symbol": short,
                                "ltp": round(current, 2),
                                "change_pct": chg_1d,
                                "sparkline": sparkline,
                                "trigger": f"RSI {rsi_val:.0f} + above SMA20",
                            })

            except Exception:
                continue

        if scan_type == "volume_pump":
            results.sort(key=lambda x: x.get("volume_ratio", 0), reverse=True)
        elif scan_type in ("breakout", "52w_high"):
            results.sort(key=lambda x: x.get("pct_from_high", -100), reverse=True)
        elif scan_type == "52w_low":
            results.sort(key=lambda x: x.get("pct_from_low", 9999))
        elif scan_type in ("gap_up",):
            results.sort(key=lambda x: float(x.get("trigger", "0").split()[2].replace("%", "")), reverse=True)
        elif scan_type in ("gap_down",):
            results.sort(key=lambda x: float(x.get("trigger", "0").split()[2].replace("%", "")))
        elif scan_type == "momentum":
            results.sort(key=lambda x: x.get("change_pct", 0), reverse=True)

        return results[:15]

    except Exception as e:
        logger.error(f"Scan error ({scan_type}): {e}")
        return []


def _get_sector_movers() -> list[dict]:
    """Sector performance via index tickers."""
    results = []
    for name, sym in SECTOR_INDICES.items():
        try:
            ticker = yf.Ticker(sym)
            hist = ticker.history(period="5d")
            if len(hist) >= 2:
                close = hist["Close"]
                chg = round((float(close.iloc[-1]) - float(close.iloc[-2])) / float(close.iloc[-2]) * 100, 2)
                results.append({
                    "symbol": name,
                    "ltp": round(float(close.iloc[-1]), 2),
                    "change_pct": chg,
                    "trigger": "Sector index",
                })
        except Exception:
            continue

    results.sort(key=lambda x: x["change_pct"], reverse=True)
    return results
