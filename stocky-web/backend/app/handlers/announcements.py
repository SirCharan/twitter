"""Corporate announcements handler — NSE filings, actions, board meetings."""

import asyncio
import logging
from datetime import datetime

import feedparser

from app import ai_client
from app.cache import cached
from app.database import log_api_call
from app.prompts import DISCLAIMER, ANNOUNCEMENTS_ANALYSIS_PROMPT

logger = logging.getLogger(__name__)

# RSS feeds for corporate announcements
ANNOUNCEMENT_FEEDS = [
    "https://www.moneycontrol.com/rss/results.xml",
    "https://www.moneycontrol.com/rss/stocksinnews.xml",
    "https://economictimes.indiatimes.com/markets/stocks/earnings/rssfeeds/12aborning.cms",
    "https://www.livemint.com/rss/companies",
]

# Classification keywords
TYPE_KEYWORDS = {
    "earnings": ["result", "quarter", "earnings", "profit", "revenue", "q1", "q2", "q3", "q4", "fy"],
    "dividend": ["dividend", "interim dividend", "final dividend", "payout"],
    "bonus": ["bonus", "bonus share", "bonus issue"],
    "split": ["split", "stock split", "sub-division"],
    "buyback": ["buyback", "buy back", "buy-back"],
    "board_meeting": ["board meeting", "board of directors", "agm", "egm"],
    "acquisition": ["acquisition", "acquire", "merger", "takeover", "stake"],
    "fundraise": ["fundraise", "qip", "rights issue", "fpo", "preferential"],
}


@cached(ttl=900)
async def get_announcements() -> dict:
    """Fetch and classify corporate announcements from RSS feeds."""
    loop = asyncio.get_event_loop()
    await log_api_call("rss", "announcements")

    data = await loop.run_in_executor(None, _fetch_announcements)

    # AI analysis
    try:
        ann_text = _format_for_ai(data)
        if ann_text.strip():
            analysis = await ai_client.feature_analysis(
                ANNOUNCEMENTS_ANALYSIS_PROMPT.format(data=ann_text), max_tokens=256
            )
            if analysis:
                data["ai_analysis"] = analysis
    except Exception:
        pass

    data["disclaimer"] = DISCLAIMER
    return data


def _fetch_announcements() -> dict:
    """Parse RSS feeds and classify announcements."""
    all_items = []

    for feed_url in ANNOUNCEMENT_FEEDS:
        try:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries[:15]:
                title = entry.get("title", "")
                summary = entry.get("summary", entry.get("description", ""))
                published = entry.get("published", entry.get("updated", ""))

                # Parse date
                date_str = ""
                try:
                    if hasattr(entry, "published_parsed") and entry.published_parsed:
                        dt = datetime(*entry.published_parsed[:6])
                        date_str = dt.strftime("%Y-%m-%d %H:%M")
                    elif published:
                        date_str = published[:16]
                except Exception:
                    date_str = published[:16] if published else ""

                # Extract company from title
                company = _extract_company(title)

                # Classify type
                ann_type = _classify_announcement(title + " " + summary)

                all_items.append({
                    "company": company,
                    "symbol": "",  # Can't reliably extract from RSS
                    "title": title[:200],
                    "summary": _clean_html(summary)[:300],
                    "date": date_str,
                    "type": ann_type,
                    "source": _get_source_name(feed_url),
                })
        except Exception as e:
            logger.warning("RSS feed %s failed: %s", feed_url, e)
            continue

    # Deduplicate by title similarity
    seen_titles = set()
    unique_items = []
    for item in all_items:
        key = item["title"][:50].lower()
        if key not in seen_titles:
            seen_titles.add(key)
            unique_items.append(item)

    # Sort by date descending
    unique_items.sort(key=lambda x: x.get("date", ""), reverse=True)

    # Group by type
    by_type = {}
    for item in unique_items:
        t = item["type"]
        if t not in by_type:
            by_type[t] = 0
        by_type[t] += 1

    return {
        "announcements": unique_items[:20],
        "by_type": by_type,
        "total": len(unique_items),
    }


def _classify_announcement(text: str) -> str:
    """Classify announcement type based on keywords."""
    text_lower = text.lower()
    for ann_type, keywords in TYPE_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                return ann_type
    return "general"


def _extract_company(title: str) -> str:
    """Try to extract company name from title."""
    # Common patterns: "Company Name: details" or "Company Name reports Q3..."
    if ":" in title:
        return title.split(":")[0].strip()[:50]
    if " - " in title:
        return title.split(" - ")[0].strip()[:50]
    # First few words
    words = title.split()
    return " ".join(words[:3]) if len(words) > 3 else title[:50]


def _clean_html(text: str) -> str:
    """Remove HTML tags from text."""
    import re
    return re.sub(r"<[^>]+>", "", text).strip()


def _get_source_name(url: str) -> str:
    if "moneycontrol" in url:
        return "Moneycontrol"
    if "economictimes" in url:
        return "Economic Times"
    if "livemint" in url:
        return "LiveMint"
    return "RSS"


def _format_for_ai(data: dict) -> str:
    text = f"Total announcements: {data.get('total', 0)}\n"
    text += f"By type: {data.get('by_type', {})}\n\n"
    for a in data.get("announcements", [])[:10]:
        text += f"[{a['type']}] {a['company']}: {a['title'][:100]}\n"
    return text
