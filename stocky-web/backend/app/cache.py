"""Simple in-memory TTL cache for handler results."""

import functools
import hashlib
import logging
import time
from typing import Any

logger = logging.getLogger(__name__)

_store: dict[str, dict[str, Any]] = {}


def cached(ttl: int = 60, prefix: str = ""):
    """Decorator for async functions. Caches result by function name + args hash.

    Args:
        ttl: Time-to-live in seconds (default 60).
        prefix: Optional key prefix (defaults to function name).
    """

    def decorator(fn):
        @functools.wraps(fn)
        async def wrapper(*args, **kwargs):
            key_raw = f"{prefix or fn.__name__}:{args}:{sorted(kwargs.items())}"
            key = hashlib.md5(key_raw.encode()).hexdigest()
            entry = _store.get(key)
            if entry and (time.time() - entry["ts"]) < ttl:
                logger.debug("Cache HIT for %s (age %.1fs)", fn.__name__, time.time() - entry["ts"])
                return entry["data"]
            result = await fn(*args, **kwargs)
            _store[key] = {"data": result, "ts": time.time()}
            return result

        def cache_clear():
            """Clear all entries for this function."""
            to_remove = [k for k in _store if k.startswith(hashlib.md5(f"{prefix or fn.__name__}:".encode()).hexdigest()[:8])]
            for k in to_remove:
                del _store[k]

        wrapper.cache_clear = cache_clear
        return wrapper

    return decorator


def clear_all_caches():
    """Clear the entire cache store."""
    _store.clear()
