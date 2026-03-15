import asyncio
import logging
import re
from html import unescape

import feedparser

from app import ai_client
from app.database import log_api_call
from app.handlers.analyse import (
    NEWS_FEEDS,
    FEED_HEADERS,
    POSITIVE_KEYWORDS,
    NEGATIVE_KEYWORDS,
    STOCK_FULL_NAMES,
    _resolve_symbol,
)

logger = logging.getLogger(__name__)

FEED_CATEGORIES = {
    "LiveMint Markets": "Indian", "LiveMint Companies": "Indian", "LiveMint Economy": "Indian",
    "ET Markets": "Indian", "ET Industry": "Indian",
    "Moneycontrol": "Indian", "CNBC-TV18": "Indian", "Business Standard": "Indian",
    "NDTV Profit": "Indian", "Hindu BusinessLine": "Indian",
    "CNBC-TV18 Buzz": "Indian", "The Hindu Biz": "Indian",
    "Indian Express Biz": "Indian", "Business Today": "Indian",
    "ET Commodities": "Commodities", "MC Commodities": "Commodities",
    "Reuters": "Global", "BBC World": "Global", "CNBC US": "Global",
    "MarketWatch": "Global", "Yahoo Finance US": "Global",
    "OilPrice": "Energy", "Kitco Gold": "Energy",
    "Nikkei Asia": "Global", "FED Press": "Global",
}


def _fetch_all_headlines(max_per_feed: int = 8) -> list[dict]:
    articles = []
    for feed_name, feed_url in NEWS_FEEDS:
        try:
            feed = feedparser.parse(feed_url, request_headers=FEED_HEADERS)
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
                title_lower = title.lower()
                body_lower = summary.lower()
                # Title keywords carry 3× weight — catches broker calls like "Reduce Wipro"
                pos = sum(3 for kw in POSITIVE_KEYWORDS if kw in title_lower) + \
                      sum(1 for kw in POSITIVE_KEYWORDS if kw in body_lower)
                neg = sum(3 for kw in NEGATIVE_KEYWORDS if kw in title_lower) + \
                      sum(1 for kw in NEGATIVE_KEYWORDS if kw in body_lower)
                total = pos + neg + 1
                sentiment = (pos - neg) / total

                # Clean summary: strip HTML tags, unescape entities, truncate
                clean_summary = unescape(re.sub(r"<[^>]+>", " ", summary)).strip()
                clean_summary = re.sub(r"\s+", " ", clean_summary)[:130].rsplit(" ", 1)[0] if len(clean_summary) > 130 else clean_summary

                articles.append({
                    "source": feed_name,
                    "title": title,
                    "link": link,
                    "date": pub_date,
                    "sentiment": round(sentiment, 3),
                    "summary": clean_summary or None,
                    "_text": title + " " + summary,
                    "category": FEED_CATEGORIES.get(feed_name, "Indian"),
                })
        except Exception as e:
            logger.debug(f"Failed to parse {feed_name}: {e}")
    return articles


def _filter_stock_news(articles: list[dict], search_terms: list[str]) -> list[dict]:
    patterns = []
    for term in search_terms:
        if len(term) <= 3:
            patterns.append(re.compile(r"\b" + re.escape(term) + r"\b", re.IGNORECASE))
        else:
            patterns.append(re.compile(re.escape(term), re.IGNORECASE))
    return [a for a in articles if any(p.search(a.get("_text", a["title"])) for p in patterns)]


def _clean_articles(articles: list[dict]) -> list[dict]:
    """Strip internal fields before returning to client."""
    return [{k: v for k, v in a.items() if not k.startswith("_")} for a in articles]


async def _generate_news_summary(titles: list[str], symbol: str | None) -> str:
    """One-sentence AI summary of the news headlines."""
    if not titles:
        return ""
    try:
        from app.prompts import NEWS_SUMMARY_PROMPT
        subject = f"for {symbol.upper()}" if symbol else "about the Indian market"
        headlines_text = "\n".join(f"- {t}" for t in titles)
        data_text = f"Subject: {subject}\n{headlines_text}"
        result = await ai_client.feature_analysis(
            NEWS_SUMMARY_PROMPT.format(data=data_text), max_tokens=200
        )
        return result or ""
    except Exception:
        return ""


async def get_news(symbol: str | None = None) -> dict:
    """Get market news, optionally filtered for a stock."""
    loop = asyncio.get_event_loop()
    await log_api_call("rss", "news")

    if symbol:
        # Fetch more articles for stock-specific search
        articles = await loop.run_in_executor(
            None, lambda: _fetch_all_headlines(max_per_feed=40)
        )
        if not articles:
            return {"articles": [], "headline": "No news available right now."}
        _, nse_symbol, news_terms = _resolve_symbol(symbol)
        filtered = _filter_stock_news(articles, news_terms)
        final_articles = _clean_articles(filtered[:10])
        ai_summary = await _generate_news_summary(
            [a["title"] for a in final_articles[:6]], symbol
        )
        return {
            "symbol": symbol.upper(),
            "articles": final_articles,
            "headline": f"News: {symbol.upper()}",
            "count": len(filtered),
            "ai_summary": ai_summary,
        }

    articles = await loop.run_in_executor(None, _fetch_all_headlines)

    if not articles:
        return {"articles": [], "headline": "No news available right now."}

    # General — group by source, interleave, then deduplicate
    by_source: dict[str, list[dict]] = {}
    for a in articles:
        by_source.setdefault(a["source"], []).append(a)

    # Round-robin across sources for diversity
    interleaved = []
    max_len = max((len(v) for v in by_source.values()), default=0)
    sources = list(by_source.values())
    for i in range(max_len):
        for group in sources:
            if i < len(group):
                interleaved.append(group[i])

    seen = set()
    unique = []
    for a in interleaved:
        key = a["title"].lower().strip()
        if key not in seen:
            seen.add(key)
            unique.append(a)

    final_articles = _clean_articles(unique[:20])
    ai_summary = await _generate_news_summary(
        [a["title"] for a in final_articles[:6]], None
    )
    return {
        "articles": final_articles,
        "headline": "Market Headlines",
        "count": len(unique),
        "ai_summary": ai_summary,
        "categories": sorted(set(a.get("category", "Indian") for a in unique)),
    }
