from functools import wraps

from bot.config import ALLOWED_USER_IDS


def authorized(func):
    """Decorator that restricts handler to ALLOWED_USER_IDS only."""

    @wraps(func)
    async def wrapper(update, context, *args, **kwargs):
        if update.effective_user.id not in ALLOWED_USER_IDS:
            return
        return await func(update, context, *args, **kwargs)

    return wrapper
