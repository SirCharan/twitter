"""Options chain data wrapper with caching."""

import logging
from datetime import datetime, timedelta, timezone

from app.cache import cached
from app.dhan_client import dhan, SECURITY_MAP, IDX

logger = logging.getLogger(__name__)

IST = timezone(timedelta(hours=5, minutes=30))

# Symbols that use IDX_I segment (indices)
_INDEX_SYMBOLS = {"NIFTY", "NIFTY 50", "BANKNIFTY", "NIFTY BANK"}


@cached(ttl=300)
async def get_options_summary(symbol: str = "NIFTY") -> dict | None:
    """Get compact options chain summary for a symbol. Cached 5 min."""
    if not dhan.enabled:
        return None

    try:
        clean = symbol.upper().replace(".NS", "").strip()
        sec_id = SECURITY_MAP.get(clean)
        if sec_id is None:
            return None

        segment = IDX if clean in _INDEX_SYMBOLS else "NSE_FNO"

        # Get nearest expiry
        expiries = await dhan.get_expiry_list(sec_id, segment)
        if not expiries:
            return None

        nearest = sorted(expiries)[0]
        if not nearest:
            return None

        # Get chain
        chain = await dhan.get_option_chain(sec_id, segment, nearest)
        if not chain:
            return None

        # Compute summary
        summary = dhan.compute_chain_summary(chain)
        if summary:
            summary["symbol"] = clean
            summary["expiry"] = nearest
            summary["timestamp"] = datetime.now(IST).strftime("%Y-%m-%d %H:%M IST")

        return summary
    except Exception as e:
        logger.warning("Options summary failed for %s: %s", symbol, e)
        return None
