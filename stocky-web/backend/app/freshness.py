"""Data freshness checker — enforces staleness warnings."""

import logging
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

IST = timezone(timedelta(hours=5, minutes=30))


def check_freshness(data: dict, max_age_seconds: int = 300) -> dict:
    """Check data freshness and inject warning if stale.

    Looks for 'timestamp', 'date', or 'last_updated' in data.
    If data is older than max_age_seconds, adds 'freshness_warning' key.
    Returns the (possibly modified) data dict.
    """
    now = datetime.now(IST)
    ts_str = data.get("timestamp") or data.get("date") or data.get("last_updated")

    if not ts_str:
        return data

    try:
        ts = None
        for fmt in (
            "%Y-%m-%d %H:%M IST",
            "%Y-%m-%d %H:%M:%S",
            "%d-%b-%Y",
            "%d-%m-%Y",
            "%Y-%m-%d",
        ):
            try:
                ts = datetime.strptime(str(ts_str).strip(), fmt)
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=IST)
                break
            except ValueError:
                continue

        if ts is None:
            return data

        age = (now - ts).total_seconds()
        if age > max_age_seconds:
            minutes = int(age // 60)
            if minutes < 60:
                age_str = f"{minutes} minutes"
            else:
                hours = minutes // 60
                age_str = f"{hours} hour{'s' if hours > 1 else ''}"

            data["freshness_warning"] = (
                f"Data is {age_str} old. In free mode, data may not update in real-time."
            )
    except Exception:
        pass

    return data
