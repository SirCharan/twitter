"""
Dhan HQ token management with auto-renewal.

Dhan access tokens expire every 24 hours.
This module mirrors the Kite auto-login pattern:
  - Stores token in SQLite (persists across restarts)
  - In-memory cache avoids DB round-trip per request
  - Renews via POST /v2/RenewToken before expiry
  - Background loop renews every 20 hours
"""

import logging
from datetime import datetime, timedelta, timezone

import httpx

from app import database
from app.config import DHAN_CLIENT_ID, DHAN_ACCESS_TOKEN

logger = logging.getLogger(__name__)

IST = timezone(timedelta(hours=5, minutes=30))
RENEW_URL = "https://api.dhan.co/v2/RenewToken"
TOKEN_LIFETIME_HOURS = 24
RENEW_BEFORE_HOURS = 20  # Renew 4 hours before expiry

# In-memory state (avoids DB round-trip on every API call)
_current_token: str | None = None
_refreshed_at: datetime | None = None


def _token_is_fresh() -> bool:
    """Check if the in-memory token is less than 20 hours old."""
    if not _current_token or not _refreshed_at:
        return False
    age = (datetime.now(IST) - _refreshed_at).total_seconds()
    return age < RENEW_BEFORE_HOURS * 3600


async def get_valid_token() -> str | None:
    """Return a valid Dhan access token, renewing from DB or API if needed."""
    global _current_token, _refreshed_at

    # 1. Fast path: in-memory token is fresh
    if _token_is_fresh():
        return _current_token

    # 2. Check DB for a stored token
    try:
        session = await database.get_dhan_session()
        if session and session.get("access_token"):
            refreshed_str = session.get("refreshed_at", "")
            if refreshed_str:
                try:
                    dt = datetime.fromisoformat(refreshed_str)
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=IST)
                    age_seconds = (datetime.now(IST) - dt).total_seconds()
                    if age_seconds < RENEW_BEFORE_HOURS * 3600:
                        _current_token = session["access_token"]
                        _refreshed_at = dt
                        return _current_token
                except (ValueError, TypeError):
                    pass
            # Token in DB but age unknown or too old — try renewal
            _current_token = session["access_token"]
    except Exception as e:
        logger.warning("Failed to read Dhan session from DB: %s", e)

    # 3. Try to renew
    new_token = await renew_token()
    if new_token:
        return new_token

    # 4. Fallback: return whatever we have (even if expired — Dhan will reject it)
    return _current_token


async def renew_token() -> str | None:
    """Call Dhan RenewToken endpoint. Returns new token or None."""
    global _current_token, _refreshed_at

    # Find the best available token to renew with
    old_token = _current_token
    if not old_token:
        try:
            session = await database.get_dhan_session()
            old_token = session["access_token"] if session else None
        except Exception:
            pass
    if not old_token:
        old_token = DHAN_ACCESS_TOKEN  # Fallback to env var

    if not old_token or not DHAN_CLIENT_ID:
        logger.warning("No Dhan token or client ID available for renewal")
        return None

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                RENEW_URL,
                headers={
                    "access-token": old_token,
                    "client-id": DHAN_CLIENT_ID,
                    "Content-Type": "application/json",
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                # Dhan may return the token in different field names
                new_token = (
                    data.get("access_token")
                    or data.get("accessToken")
                    or data.get("data", {}).get("access_token")
                    if isinstance(data, dict) else None
                )
                if new_token:
                    _current_token = new_token
                    _refreshed_at = datetime.now(IST)
                    await database.save_dhan_session(
                        new_token, _refreshed_at.isoformat()
                    )
                    # Clear caches that depend on Dhan data
                    try:
                        from app.cache import clear_all_caches
                        clear_all_caches()
                    except Exception:
                        pass
                    logger.info("Dhan token renewed successfully")
                    return new_token
                else:
                    logger.error("Dhan renewal response missing token: %s", str(data)[:200])
            else:
                logger.error(
                    "Dhan token renewal failed: HTTP %d — %s",
                    resp.status_code, resp.text[:200],
                )
    except Exception as e:
        logger.error("Dhan token renewal error: %s", e)

    return None


async def init_dhan_token():
    """
    Called at startup. Seeds the env token into DB if no stored token exists.
    Then tries a renewal to verify the token is fresh.
    """
    global _current_token, _refreshed_at

    # Check DB first
    try:
        session = await database.get_dhan_session()
        if session and session.get("access_token"):
            _current_token = session["access_token"]
            refreshed_str = session.get("refreshed_at", "")
            if refreshed_str:
                try:
                    _refreshed_at = datetime.fromisoformat(refreshed_str)
                    if _refreshed_at.tzinfo is None:
                        _refreshed_at = _refreshed_at.replace(tzinfo=IST)
                except (ValueError, TypeError):
                    _refreshed_at = None
            logger.info("Dhan token loaded from DB (refreshed: %s)", refreshed_str or "unknown")
            return
    except Exception as e:
        logger.warning("Failed to read Dhan session: %s", e)

    # Seed from env
    if DHAN_ACCESS_TOKEN:
        _current_token = DHAN_ACCESS_TOKEN
        _refreshed_at = datetime.now(IST)
        try:
            await database.save_dhan_session(
                DHAN_ACCESS_TOKEN, _refreshed_at.isoformat()
            )
        except Exception:
            pass
        logger.info("Dhan token seeded from env var")
    else:
        logger.warning("No Dhan access token configured (env or DB)")
