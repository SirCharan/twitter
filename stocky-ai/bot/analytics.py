import json
import logging
import os

import aiohttp

logger = logging.getLogger(__name__)

WEB_API_URL = os.environ.get("STOCKY_WEB_API_URL", os.environ.get("WEB_API_URL", ""))


async def track(event_type: str, event_name: str, event_data: dict | None = None):
    """Fire-and-forget analytics event to the web backend."""
    if not WEB_API_URL:
        return
    try:
        async with aiohttp.ClientSession() as session:
            await session.post(
                f"{WEB_API_URL}/api/analytics/track",
                json={
                    "events": [
                        {
                            "event_type": event_type,
                            "event_name": event_name,
                            "event_data": event_data,
                            "platform": "telegram",
                        }
                    ]
                },
                timeout=aiohttp.ClientTimeout(total=5),
            )
    except Exception:
        logger.debug("Analytics track failed", exc_info=True)
