import logging

from telegram import Update
from telegram.ext import ContextTypes

from bot.auth_check import authorized
from bot import database
from bot.kite_auth import auto_login, exchange_token, get_login_url
from bot.kite_client import KiteClient

logger = logging.getLogger(__name__)


@authorized
async def login(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Manual login fallback. Sends login URL or triggers auto-login."""
    await update.message.reply_text("Attempting auto-login...")
    try:
        await auto_login()
        await update.message.reply_text("Auto-login successful!")
    except Exception as e:
        url = get_login_url()
        await update.message.reply_text(
            f"Auto-login failed: {e}\n\n"
            f"Manual login:\n{url}\n\n"
            f"After login, send: /auth <request_token>"
        )


@authorized
async def auth_token(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Manual token exchange: /auth <request_token>"""
    if not context.args:
        await update.message.reply_text("Usage: /auth <request_token>")
        return
    request_token = context.args[0]
    try:
        await exchange_token(request_token)
        await update.message.reply_text("Login successful!")
    except Exception as e:
        await update.message.reply_text(f"Token exchange failed: {e}")


@authorized
async def status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show current authentication status."""
    session = await database.get_session()
    if not session:
        await update.message.reply_text("Not logged in.")
        return

    kite: KiteClient = context.bot_data["kite"]
    try:
        profile = await kite.get_profile()
        name = profile.get("user_name", "Unknown")
        user_id = profile.get("user_id", "Unknown")
        await update.message.reply_text(
            f"Logged in as: {name} ({user_id})\n"
            f"Since: {session['login_time']}\n"
            f"Token expires: ~6:00 AM IST tomorrow"
        )
    except Exception:
        await update.message.reply_text(
            f"Session saved (since {session['login_time']}) but token may be expired.\n"
            f"Use /login to re-authenticate."
        )


@authorized
async def logout(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await database.clear_session()
    await update.message.reply_text("Logged out. Session cleared.")
