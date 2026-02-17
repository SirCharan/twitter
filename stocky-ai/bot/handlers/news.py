import asyncio
import logging
import re
from datetime import datetime

import feedparser
from telegram import Update
from telegram.ext import ContextTypes

from bot.auth_check import authorized
from bot.database import log_api_call
from bot.handlers.analyse import (
    NEWS_FEEDS,
    POSITIVE_KEYWORDS,
    NEGATIVE_KEYWORDS,
    STOCK_FULL_NAMES,
    _resolve_symbol,
)

logger = logging.getLogger(__name__)


def _fetch_all_headlines(max_per_feed: int = 15) -> list[dict]:
    """Fetch latest headlines from all RSS feeds."""
    articles = []
    for feed_name, feed_url in NEWS_FEEDS:
        try:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries[:max_per_feed]:
                title = entry.get("title", "").strip()
                if not title:
                    continue
                link = entry.get("link", "")
                pub_date = ""
                if hasattr(entry, "published"):
                    pub_date = entry.published[:16]
                elif hasattr(entry, "updated"):
                    pub_date = entry.updated[:16]

                summary = entry.get("summary", "") or entry.get("description", "") or ""
                text = title + " " + summary
                text_lower = text.lower()
                pos = sum(1 for kw in POSITIVE_KEYWORDS if kw in text_lower)
                neg = sum(1 for kw in NEGATIVE_KEYWORDS if kw in text_lower)
                total = pos + neg + 1
                sentiment = (pos - neg) / total

                articles.append({
                    "source": feed_name,
                    "title": title,
                    "link": link,
                    "date": pub_date,
                    "sentiment": sentiment,
                })
        except Exception as e:
            logger.debug(f"Failed to parse {feed_name}: {e}")

    return articles


def _filter_stock_news(articles: list[dict], search_terms: list[str]) -> list[dict]:
    """Filter articles matching a stock's search terms."""
    patterns = []
    for term in search_terms:
        if len(term) <= 3:
            patterns.append(re.compile(r"\b" + re.escape(term) + r"\b", re.IGNORECASE))
        else:
            patterns.append(re.compile(re.escape(term), re.IGNORECASE))

    return [a for a in articles if any(p.search(a["title"]) for p in patterns)]


def _format_article(article: dict, include_link: bool = True) -> str:
    sent = article["sentiment"]
    icon = "+" if sent > 0.1 else ("-" if sent < -0.1 else "~")
    date = f" ({article['date']})" if article["date"] else ""
    title = article["title"]
    if include_link and article["link"]:
        return f"[{icon}] <b>{article['source']}</b>{date}\n<a href=\"{article['link']}\">{title}</a>"
    return f"[{icon}] <b>{article['source']}</b>{date}\n{title}"


@authorized
async def news_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show latest market news. /news or /news SYMBOL"""
    args = context.args or []
    loop = asyncio.get_event_loop()

    await log_api_call("rss", "news_command")
    articles = await loop.run_in_executor(None, _fetch_all_headlines)

    if not articles:
        await update.message.reply_text("No news available right now. RSS feeds might be down.")
        return

    if args:
        # Stock-specific news
        stock_input = " ".join(args)
        _, nse_symbol, news_terms = _resolve_symbol(stock_input)
        filtered = _filter_stock_news(articles, news_terms)

        if not filtered:
            await update.message.reply_text(
                f"No recent news found for <b>{stock_input.upper()}</b>.\n\n"
                "Try a broader name or check /news for general market headlines.",
                parse_mode="HTML",
            )
            return

        header = f"<b>News: {stock_input.upper()}</b>\n{'=' * 25}\n\n"
        lines = [_format_article(a) for a in filtered[:10]]
        message = header + "\n\n".join(lines)
    else:
        # General market news — deduplicate by title, show top 12
        seen = set()
        unique = []
        for a in articles:
            key = a["title"].lower().strip()
            if key not in seen:
                seen.add(key)
                unique.append(a)

        header = f"<b>Market Headlines</b>\n{'=' * 25}\n\n"
        lines = [_format_article(a) for a in unique[:12]]
        message = header + "\n\n".join(lines)

    if len(message) > 4090:
        message = message[:4087] + "..."

    await update.message.reply_text(message, parse_mode="HTML", disable_web_page_preview=True)


async def send_morning_digest(bot, chat_id: int):
    """Send morning market news digest. Called by scheduler."""
    try:
        loop = asyncio.get_event_loop()
        await log_api_call("rss", "morning_digest")
        articles = await loop.run_in_executor(None, _fetch_all_headlines)

        if not articles:
            return

        seen = set()
        unique = []
        for a in articles:
            key = a["title"].lower().strip()
            if key not in seen:
                seen.add(key)
                unique.append(a)

        now = datetime.now().strftime("%d %b %Y")
        header = f"<b>Morning Digest — {now}</b>\n{'=' * 25}\n\n"
        lines = [_format_article(a, include_link=True) for a in unique[:10]]
        message = header + "\n\n".join(lines)
        message += "\n\n<i>Good morning. Markets open soon.</i>"

        if len(message) > 4090:
            message = message[:4087] + "..."

        await bot.send_message(chat_id=chat_id, text=message, parse_mode="HTML", disable_web_page_preview=True)
        logger.info("Morning digest sent")
    except Exception as e:
        logger.error(f"Morning digest failed: {e}")
