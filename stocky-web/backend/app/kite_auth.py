import asyncio
import logging
from datetime import datetime
from urllib.parse import parse_qs, urlparse

import pyotp
import requests
from kiteconnect import KiteConnect

from app import database
from app.config import (
    KITE_API_KEY,
    KITE_API_SECRET,
    KITE_PASSWORD,
    KITE_TOTP_SECRET,
    KITE_USER_ID,
)

logger = logging.getLogger(__name__)

CONNECT_URL = f"https://kite.trade/connect/login?v=3&api_key={KITE_API_KEY}"
LOGIN_URL = "https://kite.zerodha.com/api/login"
TWOFA_URL = "https://kite.zerodha.com/api/twofa"


def _auto_login_sync() -> str:
    """Synchronous auto-login using credentials + TOTP. Returns access_token."""
    session = requests.Session()

    login_page = session.get(CONNECT_URL)
    login_page_url = login_page.url

    resp = session.post(LOGIN_URL, data={
        "user_id": KITE_USER_ID,
        "password": KITE_PASSWORD,
    })
    resp.raise_for_status()
    data = resp.json()
    if data.get("status") != "success":
        raise RuntimeError(f"Login step 1 failed: {data}")
    request_id = data["data"]["request_id"]

    totp = pyotp.TOTP(KITE_TOTP_SECRET)
    twofa_value = totp.now()

    session.post(TWOFA_URL, data={
        "user_id": KITE_USER_ID,
        "request_id": request_id,
        "twofa_value": twofa_value,
    })

    resp = session.get(login_page_url + "&skip_session=true", allow_redirects=False)
    while resp.is_redirect:
        next_url = resp.headers["Location"]
        parsed = urlparse(next_url)
        if parsed.hostname in ("127.0.0.1", "localhost"):
            redirect_url = next_url
            break
        resp = session.get(next_url, allow_redirects=False)
    else:
        redirect_url = resp.url
    request_token = parse_qs(urlparse(redirect_url).query)["request_token"][0]

    kite = KiteConnect(api_key=KITE_API_KEY)
    kite_session = kite.generate_session(request_token, api_secret=KITE_API_SECRET)
    return kite_session["access_token"]


async def auto_login() -> str:
    """Async auto-login. Returns access_token."""
    loop = asyncio.get_event_loop()
    await database.log_api_call("kite", "auto_login")
    access_token = await loop.run_in_executor(None, _auto_login_sync)
    await database.save_session(access_token, datetime.now().isoformat())
    logger.info("Auto-login successful")
    return access_token


def get_login_url() -> str:
    kite = KiteConnect(api_key=KITE_API_KEY)
    return kite.login_url()


async def get_authenticated_kite() -> KiteConnect | None:
    session = await database.get_session()
    if not session or not session["access_token"]:
        return None
    kite = KiteConnect(api_key=KITE_API_KEY)
    kite.set_access_token(session["access_token"])
    return kite


async def ensure_authenticated() -> KiteConnect:
    """Returns authenticated kite, auto-logging in if needed."""
    kite = await get_authenticated_kite()
    if kite:
        try:
            await database.log_api_call("kite", "profile")
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, kite.profile)
            return kite
        except Exception:
            logger.info("Saved token expired, re-authenticating...")

    access_token = await auto_login()
    kite = KiteConnect(api_key=KITE_API_KEY)
    kite.set_access_token(access_token)
    return kite
