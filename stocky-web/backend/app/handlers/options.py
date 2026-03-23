"""
Options Analytics handler.

Fetches live option chain data via DhanHQ v2 API (weekly + monthly expiry),
computes PCR, Max Pain, IV skew, OI concentration, and derives signals.
Passes structured data to the LLM orchestrator for AI interpretation.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from app.cache import cached
from app.dhan_client import dhan, SECURITY_MAP, IDX

logger = logging.getLogger(__name__)

IST = timezone(timedelta(hours=5, minutes=30))

_INDEX_SYMBOLS = {"NIFTY", "NIFTY 50", "BANKNIFTY", "NIFTY BANK"}


def _classify_expiries(expiries: list[str]) -> tuple[str | None, str | None]:
    """
    Given sorted expiry date strings, identify nearest weekly and nearest monthly.
    Monthly = expiry that's the last Thursday of its month (or >5 days from weekly).
    Returns (weekly, monthly). If only 1 expiry, monthly = None.
    """
    if not expiries:
        return None, None

    sorted_exp = sorted(expiries)
    weekly = sorted_exp[0]

    if len(sorted_exp) < 2:
        return weekly, None

    # Find monthly: first expiry that's at least 6 days after weekly
    monthly = None
    for exp in sorted_exp[1:]:
        try:
            w_dt = datetime.strptime(weekly, "%Y-%m-%d")
            e_dt = datetime.strptime(exp, "%Y-%m-%d")
            if (e_dt - w_dt).days >= 6:
                monthly = exp
                break
        except ValueError:
            continue

    return weekly, monthly


def _compute_iv_skew(chain_data: dict, spot: float) -> dict | None:
    """Compute IV skew: ATM vs OTM call (+5%) and OTM put (-5%)."""
    strikes = chain_data.get("data", [])
    if not strikes or not spot:
        return None

    atm_iv = None
    otm_call_iv = None
    otm_put_iv = None

    atm_target = spot
    otm_call_target = spot * 1.05
    otm_put_target = spot * 0.95

    best_atm_dist = float("inf")
    best_call_dist = float("inf")
    best_put_dist = float("inf")

    for s in strikes:
        strike = s.get("strikePrice", 0) or s.get("strike_price", 0)
        if not strike:
            continue

        ce_iv = s.get("ce_iv", 0) or s.get("CE_IV", 0) or 0
        pe_iv = s.get("pe_iv", 0) or s.get("PE_IV", 0) or 0

        # ATM
        d = abs(strike - atm_target)
        if d < best_atm_dist and ce_iv:
            best_atm_dist = d
            atm_iv = ce_iv

        # OTM Call
        d = abs(strike - otm_call_target)
        if d < best_call_dist and ce_iv:
            best_call_dist = d
            otm_call_iv = ce_iv

        # OTM Put
        d = abs(strike - otm_put_target)
        if d < best_put_dist and pe_iv:
            best_put_dist = d
            otm_put_iv = pe_iv

    if atm_iv is None:
        return None

    return {
        "atm": round(atm_iv, 2),
        "otm_call_5pct": round(otm_call_iv, 2) if otm_call_iv else None,
        "otm_put_5pct": round(otm_put_iv, 2) if otm_put_iv else None,
        "skew_ratio": round(
            (otm_put_iv / atm_iv), 2
        ) if otm_put_iv and atm_iv else None,
    }


def _compute_volume_hotspots(chain_data: dict) -> list[dict]:
    """Find top 5 strikes by volume (call + put combined)."""
    strikes = chain_data.get("data", [])
    volumes = []

    for s in strikes:
        strike = s.get("strikePrice", 0) or s.get("strike_price", 0)
        ce_vol = s.get("ce_volume", 0) or s.get("CE_Volume", 0) or 0
        pe_vol = s.get("pe_volume", 0) or s.get("PE_Volume", 0) or 0
        total = ce_vol + pe_vol
        if strike and total > 0:
            volumes.append({
                "strike": strike,
                "call_volume": ce_vol,
                "put_volume": pe_vol,
                "total": total,
            })

    volumes.sort(key=lambda x: x["total"], reverse=True)
    return volumes[:5]


def _derive_signals(
    weekly_summary: dict | None,
    monthly_summary: dict | None,
    spot: float,
    iv_skew: dict | None,
) -> list[dict]:
    """Rules-based signal derivation from options data."""
    signals = []

    if weekly_summary:
        pcr = weekly_summary.get("pcr")
        max_pain = weekly_summary.get("max_pain")

        if pcr is not None:
            if pcr > 1.2:
                signals.append({
                    "signal": "Bullish PCR",
                    "strength": "Strong",
                    "detail": f"Weekly PCR {pcr} > 1.2 — heavy put writing indicates support",
                })
            elif pcr < 0.7:
                signals.append({
                    "signal": "Bearish PCR",
                    "strength": "Strong",
                    "detail": f"Weekly PCR {pcr} < 0.7 — heavy call writing indicates resistance",
                })
            elif 0.9 <= pcr <= 1.1:
                signals.append({
                    "signal": "Neutral PCR",
                    "strength": "Moderate",
                    "detail": f"Weekly PCR {pcr} near 1.0 — balanced positioning",
                })

        if max_pain and spot:
            dist_pct = round(((max_pain - spot) / spot) * 100, 2)
            if abs(dist_pct) < 1:
                signals.append({
                    "signal": "Max Pain Convergence",
                    "strength": "Strong",
                    "detail": f"Spot within 1% of Max Pain ({max_pain}) — pin risk for expiry",
                })
            elif dist_pct > 2:
                signals.append({
                    "signal": "Max Pain Above Spot",
                    "strength": "Moderate",
                    "detail": f"Max Pain {max_pain} is {dist_pct}% above spot — upward pull possible",
                })
            elif dist_pct < -2:
                signals.append({
                    "signal": "Max Pain Below Spot",
                    "strength": "Moderate",
                    "detail": f"Max Pain {max_pain} is {abs(dist_pct)}% below spot — downward pull possible",
                })

        # OI concentration signals
        top_calls = weekly_summary.get("top_call_oi", [])
        top_puts = weekly_summary.get("top_put_oi", [])
        if top_calls and spot:
            highest_call_oi_strike = top_calls[0].get("strike", 0)
            if highest_call_oi_strike > spot:
                signals.append({
                    "signal": f"Call Wall at {highest_call_oi_strike}",
                    "strength": "Strong",
                    "detail": f"Highest call OI at {highest_call_oi_strike} — strong resistance",
                })
        if top_puts and spot:
            highest_put_oi_strike = top_puts[0].get("strike", 0)
            if highest_put_oi_strike < spot:
                signals.append({
                    "signal": f"Put Wall at {highest_put_oi_strike}",
                    "strength": "Strong",
                    "detail": f"Highest put OI at {highest_put_oi_strike} — strong support",
                })

    # Monthly vs Weekly divergence
    if weekly_summary and monthly_summary:
        w_pcr = weekly_summary.get("pcr")
        m_pcr = monthly_summary.get("pcr")
        if w_pcr and m_pcr:
            if abs(w_pcr - m_pcr) > 0.3:
                signals.append({
                    "signal": "PCR Divergence",
                    "strength": "Moderate",
                    "detail": (
                        f"Weekly PCR {w_pcr} vs Monthly PCR {m_pcr} — "
                        f"{'short-term bullish, long-term cautious' if w_pcr > m_pcr else 'short-term cautious, long-term bullish'}"
                    ),
                })

    # IV Skew signal
    if iv_skew and iv_skew.get("skew_ratio"):
        skew = iv_skew["skew_ratio"]
        if skew > 1.2:
            signals.append({
                "signal": "Fear Skew",
                "strength": "Moderate",
                "detail": f"Put IV {skew}x ATM IV — market pricing tail risk / fear premium",
            })
        elif skew < 0.8:
            signals.append({
                "signal": "Complacency Skew",
                "strength": "Moderate",
                "detail": f"Put IV only {skew}x ATM IV — market too complacent on downside",
            })

    # Sort by strength
    strength_order = {"Strong": 0, "Moderate": 1, "Weak": 2}
    signals.sort(key=lambda x: strength_order.get(x["strength"], 3))
    return signals[:7]


@cached(ttl=300)
async def get_options_analytics(symbol: str = "NIFTY", deep: bool = False) -> dict:
    """
    Full options analytics for a symbol.
    Fetches weekly + monthly chains, computes analytics, passes to LLM orchestrator.
    """
    clean = symbol.upper().replace(".NS", "").strip()
    sec_id = SECURITY_MAP.get(clean)

    if sec_id is None:
        return {
            "symbol": clean,
            "error": f"{clean} not found in F&O security map",
            "timestamp": datetime.now(IST).strftime("%Y-%m-%d %H:%M IST"),
        }

    if not dhan.enabled:
        return {
            "symbol": clean,
            "error": "Dhan HQ credentials not configured",
            "timestamp": datetime.now(IST).strftime("%Y-%m-%d %H:%M IST"),
        }

    segment = IDX if clean in _INDEX_SYMBOLS else "NSE_FNO"

    # 1. Get expiry list
    expiries = await dhan.get_expiry_list(sec_id, segment)
    if not expiries:
        return {
            "symbol": clean,
            "error": "No expiry data available",
            "timestamp": datetime.now(IST).strftime("%Y-%m-%d %H:%M IST"),
        }

    weekly_exp, monthly_exp = _classify_expiries(expiries)

    # 2. Fetch chains + spot price in parallel
    tasks = [dhan.get_option_chain(sec_id, segment, weekly_exp)] if weekly_exp else []
    if monthly_exp:
        tasks.append(dhan.get_option_chain(sec_id, segment, monthly_exp))

    # Get spot via LTP for equity symbols, or from chain data for indices
    ltp_sym = clean if clean not in _INDEX_SYMBOLS else clean.replace(" ", "")
    tasks.append(dhan.get_ltp([ltp_sym]))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Parse results
    weekly_chain = results[0] if len(results) > 0 and not isinstance(results[0], Exception) else {}
    monthly_chain = None
    ltp_result = {}

    if monthly_exp and len(results) > 2:
        monthly_chain = results[1] if not isinstance(results[1], Exception) else {}
        ltp_result = results[2] if not isinstance(results[2], Exception) else {}
    elif monthly_exp and len(results) > 1:
        monthly_chain = results[1] if not isinstance(results[1], Exception) else {}
    elif len(results) > 1:
        ltp_result = results[1] if not isinstance(results[1], Exception) else {}

    # Spot price from chain or LTP
    spot = weekly_chain.get("last_price", 0) or 0
    if not spot and isinstance(ltp_result, dict):
        spot = ltp_result.get(ltp_sym, 0)

    # 3. Compute summaries using existing infrastructure
    weekly_summary = dhan.compute_chain_summary(weekly_chain) if weekly_chain else None
    monthly_summary = dhan.compute_chain_summary(monthly_chain) if monthly_chain else None

    # 4. Extended analytics
    iv_skew = _compute_iv_skew(weekly_chain, spot) if weekly_chain else None
    volume_hotspots = _compute_volume_hotspots(weekly_chain) if weekly_chain else []
    signals = _derive_signals(weekly_summary, monthly_summary, spot, iv_skew)

    # 5. Build data payload
    data: dict = {
        "symbol": clean,
        "spot": spot,
        "timestamp": datetime.now(IST).strftime("%Y-%m-%d %H:%M IST"),
    }

    if weekly_summary:
        data["weekly"] = {
            "expiry": weekly_exp,
            **weekly_summary,
        }

    if monthly_summary:
        data["monthly"] = {
            "expiry": monthly_exp,
            **monthly_summary,
        }

    if iv_skew:
        data["iv_skew"] = iv_skew

    if volume_hotspots:
        data["volume_hotspots"] = volume_hotspots

    if signals:
        data["signals"] = signals

    # 6. AI interpretation via orchestrator
    try:
        from app.llm_orchestrator import enhance
        ai_result = await enhance(
            button_type="options",
            raw_data=data,
            user_query=f"options analytics for {clean}",
            deep=deep,
        )
        if ai_result.get("ai_analysis"):
            data["ai_analysis"] = ai_result["ai_analysis"]
        if ai_result.get("ai_metadata"):
            data["ai_metadata"] = ai_result["ai_metadata"]
    except Exception as e:
        logger.warning("Options AI enhancement failed: %s", e)

    return data
