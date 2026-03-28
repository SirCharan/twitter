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
    """Compute IV skew: ATM vs OTM call (+5%) and OTM put (-5%).

    Dhan format: chain_data["data"]["oc"] = {"23000.0": {"ce": {"implied_volatility": X}, "pe": {...}}, ...}
    """
    if not spot:
        return None

    # Parse Dhan dict-keyed format
    inner = chain_data.get("data", {})
    if not isinstance(inner, dict):
        return None
    oc = inner.get("oc", {})
    if not oc or not isinstance(oc, dict):
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

    for strike_str, sides in oc.items():
        if not isinstance(sides, dict):
            continue
        try:
            strike = float(strike_str)
        except (ValueError, TypeError):
            continue

        ce = sides.get("ce", {}) or {}
        pe = sides.get("pe", {}) or {}
        ce_iv = float(ce.get("implied_volatility", 0) or 0)
        pe_iv = float(pe.get("implied_volatility", 0) or 0)

        # ATM
        d = abs(strike - atm_target)
        if d < best_atm_dist and ce_iv > 0:
            best_atm_dist = d
            atm_iv = ce_iv

        # OTM Call
        d = abs(strike - otm_call_target)
        if d < best_call_dist and ce_iv > 0:
            best_call_dist = d
            otm_call_iv = ce_iv

        # OTM Put
        d = abs(strike - otm_put_target)
        if d < best_put_dist and pe_iv > 0:
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
    """Find top 5 strikes by volume (call + put combined).

    Dhan format: chain_data["data"]["oc"] = {"23000.0": {"ce": {"volume": X}, "pe": {"volume": X}}, ...}
    """
    inner = chain_data.get("data", {})
    if not isinstance(inner, dict):
        return []
    oc = inner.get("oc", {})
    if not oc or not isinstance(oc, dict):
        return []

    volumes = []
    for strike_str, sides in oc.items():
        if not isinstance(sides, dict):
            continue
        try:
            strike = float(strike_str)
        except (ValueError, TypeError):
            continue

        ce = sides.get("ce", {}) or {}
        pe = sides.get("pe", {}) or {}
        ce_vol = int(ce.get("volume", 0) or 0)
        pe_vol = int(pe.get("volume", 0) or 0)
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


def _compute_expected_move(chain_data: dict, spot: float) -> dict | None:
    """Compute expected move from ATM straddle premium.

    Finds the ATM call + put LTP, sums them for straddle premium.
    Expected range = [spot - premium, spot + premium].
    """
    if not spot:
        return None

    inner = chain_data.get("data", {})
    if not isinstance(inner, dict):
        return None
    oc = inner.get("oc", {})
    if not oc or not isinstance(oc, dict):
        return None

    best_dist = float("inf")
    atm_call_ltp = 0
    atm_put_ltp = 0

    for strike_str, sides in oc.items():
        if not isinstance(sides, dict):
            continue
        try:
            strike = float(strike_str)
        except (ValueError, TypeError):
            continue

        dist = abs(strike - spot)
        if dist < best_dist:
            best_dist = dist
            ce = sides.get("ce", {}) or {}
            pe = sides.get("pe", {}) or {}
            atm_call_ltp = float(ce.get("ltp", 0) or ce.get("last_price", 0) or 0)
            atm_put_ltp = float(pe.get("ltp", 0) or pe.get("last_price", 0) or 0)

    if atm_call_ltp <= 0 and atm_put_ltp <= 0:
        return None

    straddle = round(atm_call_ltp + atm_put_ltp, 2)
    lower = round(spot - straddle, 2)
    upper = round(spot + straddle, 2)
    pct = round((straddle / spot) * 100, 2) if spot else 0

    return {
        "straddle_premium": straddle,
        "atm_call_ltp": round(atm_call_ltp, 2),
        "atm_put_ltp": round(atm_put_ltp, 2),
        "lower": lower,
        "upper": upper,
        "pct": pct,
    }


def _compute_verdict(
    weekly_summary: dict | None,
    spot: float,
    signals: list[dict],
    iv_skew: dict | None,
) -> dict:
    """Compute overall BULLISH / BEARISH / NEUTRAL verdict with confidence."""
    score = 0  # positive = bullish, negative = bearish
    reasons = []

    if weekly_summary:
        pcr = weekly_summary.get("pcr")
        max_pain = weekly_summary.get("max_pain")

        if pcr is not None:
            # PCR is a CONTRARIAN indicator:
            # PCR < 1 = heavy call writing = retail bearish = smart money bullish → reversal UP
            # PCR > 1 = heavy put writing = retail bullish = smart money bearish → reversal DOWN
            if pcr < 0.7:
                score += 3
                reasons.append(f"PCR {pcr} (contrarian bullish — extreme call writing)")
            elif pcr < 0.9:
                score += 1
                reasons.append(f"PCR {pcr} (contrarian mildly bullish)")
            elif pcr > 1.3:
                score -= 3
                reasons.append(f"PCR {pcr} (contrarian bearish — extreme put writing)")
            elif pcr > 1.1:
                score -= 1
                reasons.append(f"PCR {pcr} (contrarian mildly bearish)")

        if max_pain and spot:
            dist_pct = ((max_pain - spot) / spot) * 100
            if dist_pct > 1:
                score += 1
                reasons.append(f"Max Pain {max_pain} above spot (bullish pull)")
            elif dist_pct < -1:
                score -= 1
                reasons.append(f"Max Pain {max_pain} below spot (bearish pull)")

    # Score from derived signals
    for sig in signals:
        name = sig.get("signal", "").lower()
        strength_val = 2 if sig.get("strength") == "Strong" else 1
        if any(w in name for w in ["bullish", "put wall", "support"]):
            score += strength_val
        elif any(w in name for w in ["bearish", "call wall", "resistance"]):
            score -= strength_val

    # IV skew
    if iv_skew and iv_skew.get("skew_ratio"):
        skew = iv_skew["skew_ratio"]
        if skew > 1.3:
            score -= 1
            reasons.append(f"Fear skew {skew}x")
        elif skew < 0.8:
            score += 1
            reasons.append(f"Complacent skew {skew}x")

    # Determine verdict
    if score >= 3:
        verdict = "BULLISH"
    elif score <= -3:
        verdict = "BEARISH"
    elif score >= 1:
        verdict = "MILDLY BULLISH"
    elif score <= -1:
        verdict = "MILDLY BEARISH"
    else:
        verdict = "NEUTRAL"

    # Confidence: map absolute score to 0-100 range
    confidence = min(95, max(25, 50 + abs(score) * 10))

    return {
        "verdict": verdict,
        "confidence": confidence,
        "score": score,
        "reasoning": "; ".join(reasons[:4]) if reasons else "Insufficient data for strong conviction",
    }


def _enrich_oi_with_interpretation(chain_data: dict, summary: dict | None, spot: float) -> dict | None:
    """Add OI change interpretation (Long Buildup / Short Covering / etc.) to top strikes.

    Uses `oi_day_change` + price direction from Dhan if available.
    Returns enriched summary with `oi_interpretation` per top strike.
    """
    if not summary or not spot:
        return summary

    inner = chain_data.get("data", {})
    if not isinstance(inner, dict):
        return summary
    oc = inner.get("oc", {})
    if not oc:
        return summary

    def _interpret(oi_change: float, ltp: float, prev: float) -> str:
        """Derive buildup type from OI change + price direction."""
        if oi_change == 0:
            return ""
        price_up = ltp > prev if prev else False
        if oi_change > 0 and price_up:
            return "Long Buildup"
        elif oi_change > 0 and not price_up:
            return "Short Buildup"
        elif oi_change < 0 and price_up:
            return "Short Covering"
        elif oi_change < 0 and not price_up:
            return "Long Unwinding"
        return ""

    # Enrich top call OI strikes
    for entry in summary.get("top_call_oi", []):
        strike_str = str(int(entry["strike"])) if entry["strike"] == int(entry["strike"]) else str(entry["strike"])
        # Try exact match or closest
        sides = oc.get(strike_str) or oc.get(f"{entry['strike']}")
        if isinstance(sides, dict):
            ce = sides.get("ce", {}) or {}
            oi_change = float(ce.get("oi_day_change", 0) or ce.get("oi_change", 0) or 0)
            ltp = float(ce.get("ltp", 0) or ce.get("last_price", 0) or 0)
            prev = float(ce.get("prev_close", 0) or 0)
            entry["oi_interpretation"] = _interpret(oi_change, ltp, prev)

    # Enrich top put OI strikes
    for entry in summary.get("top_put_oi", []):
        strike_str = str(int(entry["strike"])) if entry["strike"] == int(entry["strike"]) else str(entry["strike"])
        sides = oc.get(strike_str) or oc.get(f"{entry['strike']}")
        if isinstance(sides, dict):
            pe = sides.get("pe", {}) or {}
            oi_change = float(pe.get("oi_day_change", 0) or pe.get("oi_change", 0) or 0)
            ltp = float(pe.get("ltp", 0) or pe.get("last_price", 0) or 0)
            prev = float(pe.get("prev_close", 0) or 0)
            entry["oi_interpretation"] = _interpret(oi_change, ltp, prev)

    return summary


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
            # PCR is a CONTRARIAN indicator:
            # Low PCR = heavy call writing = retail bearish = smart money bullish
            # High PCR = heavy put writing = retail bullish = smart money bearish
            if pcr < 0.7:
                signals.append({
                    "signal": "Bullish PCR (Contrarian)",
                    "strength": "Strong",
                    "detail": f"Weekly PCR {pcr} < 0.7 — extreme call writing = retail bearish = reversal to bullish likely",
                })
            elif pcr < 0.9:
                signals.append({
                    "signal": "Mildly Bullish PCR",
                    "strength": "Moderate",
                    "detail": f"Weekly PCR {pcr} < 0.9 — moderate call bias = potential upside reversal",
                })
            elif pcr > 1.3:
                signals.append({
                    "signal": "Bearish PCR (Contrarian)",
                    "strength": "Strong",
                    "detail": f"Weekly PCR {pcr} > 1.3 — extreme put writing = retail bullish = reversal to bearish likely",
                })
            elif pcr > 1.1:
                signals.append({
                    "signal": "Mildly Bearish PCR",
                    "strength": "Moderate",
                    "detail": f"Weekly PCR {pcr} > 1.1 — moderate put bias = potential downside risk",
                })
            elif 0.9 <= pcr <= 1.1:
                signals.append({
                    "signal": "Neutral PCR",
                    "strength": "Moderate",
                    "detail": f"Weekly PCR {pcr} near 1.0 — balanced positioning, no contrarian signal",
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
    try:
        return await _get_options_analytics_impl(symbol, deep)
    except Exception as e:
        logger.exception("Options analytics failed for %s", symbol)
        return {
            "symbol": symbol.upper(),
            "error": f"Options analytics error: {type(e).__name__}: {e}",
            "timestamp": datetime.now(IST).strftime("%Y-%m-%d %H:%M IST"),
        }


async def _get_options_analytics_impl(symbol: str, deep: bool) -> dict:
    """Internal implementation — separated for clean error handling."""
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
    try:
        expiries = await dhan.get_expiry_list(sec_id, segment)
    except Exception as e:
        logger.warning("Expiry list failed for %s: %s", clean, e)
        expiries = []

    if not expiries:
        return {
            "symbol": clean,
            "error": "No expiry data available",
            "timestamp": datetime.now(IST).strftime("%Y-%m-%d %H:%M IST"),
        }

    weekly_exp, monthly_exp = _classify_expiries(expiries)
    logger.info("Options %s: weekly=%s monthly=%s expiries_sample=%s", clean, weekly_exp, monthly_exp, expiries[:3])

    # 2. Fetch chains sequentially for easier debugging
    weekly_chain: dict = {}
    monthly_chain: dict | None = None
    spot: float = 0

    if weekly_exp:
        try:
            raw = await dhan.get_option_chain(sec_id, segment, weekly_exp)
            logger.info("Options %s weekly chain type=%s keys=%s",
                        clean, type(raw).__name__,
                        list(raw.keys())[:5] if isinstance(raw, dict) else str(raw)[:100])
            if isinstance(raw, dict):
                weekly_chain = raw
        except Exception as e:
            logger.warning("Weekly chain failed for %s: %s", clean, e)

    if monthly_exp:
        try:
            raw = await dhan.get_option_chain(sec_id, segment, monthly_exp)
            if isinstance(raw, dict):
                monthly_chain = raw
        except Exception as e:
            logger.warning("Monthly chain failed for %s: %s", clean, e)

    # Get spot from chain data (Dhan nests it inside data.last_price)
    if weekly_chain:
        inner = weekly_chain.get("data", {})
        if isinstance(inner, dict):
            spot = inner.get("last_price", 0) or 0
        else:
            spot = weekly_chain.get("last_price", 0) or 0
        logger.info("Options %s spot from chain: %s", clean, spot)

    # Fallback: get spot from LTP (only for equity symbols)
    if not spot and clean not in _INDEX_SYMBOLS:
        try:
            ltp = await dhan.get_ltp([clean])
            if isinstance(ltp, dict):
                spot = ltp.get(clean, 0)
        except Exception:
            pass

    # 3. Compute summaries using existing infrastructure
    weekly_summary = None
    monthly_summary = None
    if isinstance(weekly_chain, dict) and weekly_chain:
        weekly_summary = dhan.compute_chain_summary(weekly_chain)
    if isinstance(monthly_chain, dict) and monthly_chain:
        monthly_summary = dhan.compute_chain_summary(monthly_chain)

    # 4. Extended analytics
    iv_skew = _compute_iv_skew(weekly_chain, spot) if isinstance(weekly_chain, dict) and weekly_chain else None
    volume_hotspots = _compute_volume_hotspots(weekly_chain) if isinstance(weekly_chain, dict) and weekly_chain else []
    expected_move = _compute_expected_move(weekly_chain, spot) if isinstance(weekly_chain, dict) and weekly_chain else None

    # Enrich OI data with buildup interpretation
    if weekly_summary:
        weekly_summary = _enrich_oi_with_interpretation(weekly_chain, weekly_summary, spot)

    signals = _derive_signals(weekly_summary, monthly_summary, spot, iv_skew)
    verdict = _compute_verdict(weekly_summary, spot, signals, iv_skew)

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

    if verdict:
        data["verdict"] = verdict

    if expected_move:
        data["expected_move"] = expected_move

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
