"""7-Agent Deep Research Crew — orchestrated multi-agent research system.

Agents:
1. Planner — decomposes query into sub-tasks
2. DataFetcher — parallel yfinance + RSS data gathering (not LLM)
3. Fundamental Analyst — deep financial analysis
4. Sector & Macro Analyst — sectoral context
5. News & Sentiment Analyst — RSS sentiment
6. Critic/Verifier — cross-checks, flags hallucinations
7. Synthesizer — final report with confidence + sources
"""

import asyncio
import json
import logging
import re
import time

import feedparser
import yfinance as yf

from app import ai_client
from app.prompts import (
    CREW_CRITIC_PROMPT,
    CREW_FUNDAMENTAL_PROMPT,
    CREW_NEWS_SENTIMENT_PROMPT,
    CREW_PLANNER_PROMPT,
    CREW_SECTOR_MACRO_PROMPT,
    CREW_SYNTHESIZER_PROMPT,
    DISCLAIMER,
)

logger = logging.getLogger(__name__)

# RSS feeds for news gathering
NEWS_FEEDS = [
    "https://www.moneycontrol.com/rss/latestnews.xml",
    "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms",
    "https://www.livemint.com/rss/markets",
    "https://www.moneycontrol.com/rss/stocksinnews.xml",
]


async def stream_crew_research(query: str):
    """Stream the 7-agent crew research via SSE events."""
    total_start = time.time()

    def _event(data: dict) -> str:
        return f"data: {json.dumps(data)}\n\n"

    try:
        # ── Phase 1: Planner ──────────────────────────────────────────
        yield _event({"type": "phase", "agent": "planner", "status": "started"})
        planner_start = time.time()

        plan_text = await ai_client.crew_call(
            agent="planner",
            user_message=f"Research query: {query}",
            system_prompt=CREW_PLANNER_PROMPT,
            max_tokens=512,
        )
        plan_elapsed = round(time.time() - planner_start, 1)
        yield _event({
            "type": "agent_response", "agent": "planner",
            "content": plan_text or "Planning complete.",
            "elapsed": plan_elapsed,
        })

        # Parse plan for tickers
        tickers = _extract_tickers(query, plan_text or "")

        # ── Phase 2: DataFetcher (Python, not LLM) ───────────────────
        yield _event({"type": "phase", "agent": "data_fetcher", "status": "started"})
        data_start = time.time()

        loop = asyncio.get_event_loop()
        raw_data = await loop.run_in_executor(None, _fetch_all_data, tickers, query)

        yield _event({
            "type": "data_progress",
            "source": "yfinance+rss",
            "items": len(raw_data.get("fundamentals", {})) + len(raw_data.get("news", [])),
            "elapsed": round(time.time() - data_start, 1),
        })

        # ── Phase 3: Three Analysts in Parallel ──────────────────────
        yield _event({"type": "phase", "agent": "fundamental_analyst", "status": "started"})
        yield _event({"type": "phase", "agent": "sector_macro_analyst", "status": "started"})
        yield _event({"type": "phase", "agent": "news_sentiment_analyst", "status": "started"})

        analysts_start = time.time()

        fundamental_task = ai_client.crew_call(
            agent="fundamental",
            user_message=f"Query: {query}\n\nAnalyse this data.",
            system_prompt=CREW_FUNDAMENTAL_PROMPT.format(data=json.dumps(raw_data.get("fundamentals", {}), default=str)[:6000]),
            max_tokens=2048,
        )
        sector_task = ai_client.crew_call(
            agent="sector_macro",
            user_message=f"Query: {query}\n\nAnalyse sectoral and macro context.",
            system_prompt=CREW_SECTOR_MACRO_PROMPT.format(data=json.dumps(raw_data.get("sectors", {}), default=str)[:4000]),
            max_tokens=1536,
        )
        news_task = ai_client.crew_call(
            agent="news_sentiment",
            user_message=f"Query: {query}\n\nAnalyse news sentiment.",
            system_prompt=CREW_NEWS_SENTIMENT_PROMPT.format(data=json.dumps(raw_data.get("news", []), default=str)[:4000]),
            max_tokens=1536,
        )

        fundamental_result, sector_result, news_result = await asyncio.gather(
            fundamental_task, sector_task, news_task,
            return_exceptions=True,
        )

        # Handle exceptions
        fundamental_text = fundamental_result if isinstance(fundamental_result, str) else f"Analysis unavailable: {fundamental_result}"
        sector_text = sector_result if isinstance(sector_result, str) else f"Analysis unavailable: {sector_result}"
        news_text = news_result if isinstance(news_result, str) else f"Analysis unavailable: {news_result}"

        analysts_elapsed = round(time.time() - analysts_start, 1)

        yield _event({"type": "agent_response", "agent": "fundamental_analyst", "content": fundamental_text, "elapsed": analysts_elapsed})
        yield _event({"type": "agent_response", "agent": "sector_macro_analyst", "content": sector_text, "elapsed": analysts_elapsed})
        yield _event({"type": "agent_response", "agent": "news_sentiment_analyst", "content": news_text, "elapsed": analysts_elapsed})

        # ── Phase 4: Critic/Verifier ─────────────────────────────────
        analyst_outputs = (
            f"## Fundamental Analysis\n{fundamental_text}\n\n"
            f"## Sector & Macro Analysis\n{sector_text}\n\n"
            f"## News & Sentiment Analysis\n{news_text}"
        )

        max_critic_loops = 2
        critic_text = ""
        confidence = 0

        for iteration in range(max_critic_loops):
            yield _event({"type": "phase", "agent": "critic", "status": "started", "iteration": iteration + 1})
            critic_start = time.time()

            critic_text = await ai_client.crew_call(
                agent="critic",
                user_message="Verify the following analysis against the raw data.",
                system_prompt=CREW_CRITIC_PROMPT.format(
                    raw_data=json.dumps(raw_data.get("fundamentals", {}), default=str)[:4000],
                    analyst_outputs=analyst_outputs[:6000],
                ),
                max_tokens=1024,
            ) or "Verification complete."

            confidence = _extract_confidence(critic_text)
            critic_elapsed = round(time.time() - critic_start, 1)

            yield _event({
                "type": "critic_verdict",
                "confidence": confidence,
                "content": critic_text,
                "elapsed": critic_elapsed,
                "iteration": iteration + 1,
            })

            if confidence >= 70 or iteration == max_critic_loops - 1:
                break

            # Low confidence — request revision
            yield _event({"type": "revision_loop", "iteration": iteration + 2, "reason": "Confidence below 70%"})

        # ── Phase 5: Synthesizer ─────────────────────────────────────
        yield _event({"type": "phase", "agent": "synthesizer", "status": "started"})
        synth_start = time.time()

        synthesis = await ai_client.crew_call(
            agent="synthesizer",
            user_message=f"Original query: {query}\n\nProduce the final research report.",
            system_prompt=CREW_SYNTHESIZER_PROMPT.format(
                analyst_outputs=analyst_outputs[:8000],
                critic_report=critic_text[:3000],
            ),
            max_tokens=3000,
        ) or "Synthesis unavailable."

        synth_elapsed = round(time.time() - synth_start, 1)
        yield _event({"type": "agent_response", "agent": "synthesizer", "content": synthesis, "elapsed": synth_elapsed})

        # ── Final Result ─────────────────────────────────────────────
        total_elapsed = round(time.time() - total_start, 1)

        sources = _extract_sources(critic_text)
        unverified = _extract_unverified(critic_text)

        yield _event({
            "type": "result",
            "data": {
                "query": query,
                "plan": plan_text,
                "fundamental_analysis": fundamental_text,
                "sector_macro_analysis": sector_text,
                "news_sentiment_analysis": news_text,
                "critic_report": critic_text,
                "synthesis": synthesis,
                "confidence_score": confidence,
                "sources_verified": sources,
                "unverified_claims": unverified,
                "total_elapsed": total_elapsed,
                "disclaimer": DISCLAIMER,
            },
        })
        yield _event({"type": "done"})

    except Exception as e:
        logger.error(f"Crew research error: {e}", exc_info=True)
        yield _event({"type": "error", "message": str(e)})


def _extract_tickers(query: str, plan: str) -> list[str]:
    """Extract .NS tickers from query and plan text."""
    combined = f"{query} {plan}"
    # Match common Indian stock names
    known = {
        "reliance": "RELIANCE.NS", "tcs": "TCS.NS", "hdfc": "HDFCBANK.NS",
        "infosys": "INFOSYS.NS", "infy": "INFOSYS.NS", "sbi": "SBIN.NS",
        "wipro": "WIPRO.NS", "icici": "ICICIBANK.NS", "bharti": "BHARTIARTL.NS",
        "airtel": "BHARTIARTL.NS", "itc": "ITC.NS", "bajaj finance": "BAJFINANCE.NS",
        "kotak": "KOTAKBANK.NS", "axis": "AXISBANK.NS", "maruti": "MARUTI.NS",
        "sun pharma": "SUNPHARMA.NS", "titan": "TITAN.NS", "tatamotors": "TATAMOTORS.NS",
        "tata motors": "TATAMOTORS.NS", "tata steel": "TATASTEEL.NS",
        "adani": "ADANIENT.NS", "zomato": "ZOMATO.NS", "nifty": "^NSEI",
    }
    tickers = []
    lower = combined.lower()
    for name, sym in known.items():
        if name in lower:
            tickers.append(sym)

    # Also match explicit .NS tickers
    explicit = re.findall(r"([A-Z]{2,20})\.NS", combined.upper())
    for t in explicit:
        sym = f"{t}.NS"
        if sym not in tickers:
            tickers.append(sym)

    return tickers[:5] or ["^NSEI"]  # Default to Nifty if nothing found


def _fetch_all_data(tickers: list[str], query: str) -> dict:
    """Gather all data from yfinance + RSS. Returns clean dict."""
    data = {"fundamentals": {}, "sectors": {}, "news": []}

    # Fundamentals for each ticker
    for sym in tickers:
        try:
            ticker = yf.Ticker(sym)
            info = ticker.info or {}
            display = sym.replace(".NS", "").replace("^", "")

            data["fundamentals"][display] = {
                "price": info.get("regularMarketPrice") or info.get("currentPrice"),
                "pe": info.get("trailingPE"),
                "forward_pe": info.get("forwardPE"),
                "pb": info.get("priceToBook"),
                "roe": info.get("returnOnEquity"),
                "roce": info.get("returnOnAssets"),
                "de": info.get("debtToEquity"),
                "profit_margin": info.get("profitMargins"),
                "revenue_growth": info.get("revenueGrowth"),
                "earnings_growth": info.get("earningsGrowth"),
                "market_cap": info.get("marketCap"),
                "dividend_yield": info.get("dividendYield"),
                "sector": info.get("sector"),
                "industry": info.get("industry"),
                "52w_high": info.get("fiftyTwoWeekHigh"),
                "52w_low": info.get("fiftyTwoWeekLow"),
                "avg_volume": info.get("averageVolume"),
            }
        except Exception as e:
            logger.warning("yfinance data fetch failed for %s: %s", sym, e)

    # Sector indices
    sector_symbols = {
        "IT": "^CNXIT", "Bank": "^NSEBANK", "Auto": "^CNXAUTO",
        "Pharma": "^CNXPHARMA", "FMCG": "^CNXFMCG", "Metal": "^CNXMETAL",
        "Energy": "^CNXENERGY",
    }
    for name, sym in sector_symbols.items():
        try:
            ticker = yf.Ticker(sym)
            info = ticker.info or {}
            price = info.get("regularMarketPrice") or info.get("currentPrice")
            prev = info.get("regularMarketPreviousClose") or info.get("previousClose")
            if price and prev:
                data["sectors"][name] = {
                    "price": round(float(price), 2),
                    "change_pct": round((float(price) - float(prev)) / float(prev) * 100, 2),
                }
        except Exception:
            pass

    # News from RSS
    query_lower = query.lower()
    for feed_url in NEWS_FEEDS[:3]:
        try:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries[:10]:
                title = entry.get("title", "")
                summary = entry.get("summary", "")[:200]
                # Check relevance
                if any(t.replace(".NS", "").replace("^", "").lower() in title.lower() for t in tickers) or \
                   any(word in title.lower() for word in query_lower.split()[:3]):
                    data["news"].append({
                        "title": title,
                        "summary": summary,
                        "source": "RSS",
                    })
        except Exception:
            pass

    # If no relevant news, take latest headlines
    if not data["news"]:
        try:
            feed = feedparser.parse(NEWS_FEEDS[0])
            for entry in feed.entries[:5]:
                data["news"].append({
                    "title": entry.get("title", ""),
                    "summary": entry.get("summary", "")[:200],
                    "source": "Moneycontrol",
                })
        except Exception:
            pass

    return data


def _extract_confidence(text: str) -> int:
    """Extract confidence score from critic output."""
    patterns = [
        r"confidence\s*(?:score)?[:\s]*(\d{1,3})",
        r"(\d{1,3})\s*(?:/\s*100|%|out of 100)",
        r"score[:\s]*(\d{1,3})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text.lower())
        if match:
            val = int(match.group(1))
            if 0 <= val <= 100:
                return val
    return 65  # Default moderate confidence


def _extract_sources(text: str) -> list[str]:
    """Extract verified sources from critic text."""
    sources = []
    in_sources = False
    for line in text.split("\n"):
        if "sources verified" in line.lower() or "verified sources" in line.lower():
            in_sources = True
            continue
        if in_sources:
            if line.strip().startswith("-") or line.strip().startswith("*"):
                sources.append(line.strip().lstrip("-*").strip())
            elif line.strip() and not line.strip().startswith("#"):
                if len(sources) > 0:
                    break
    return sources[:10] or ["yfinance", "RSS feeds"]


def _extract_unverified(text: str) -> list[str]:
    """Extract unverified claims from critic text."""
    claims = []
    in_section = False
    for line in text.split("\n"):
        if "unverified" in line.lower():
            in_section = True
            continue
        if in_section:
            if line.strip().startswith("-") or line.strip().startswith("*"):
                claims.append(line.strip().lstrip("-*").strip())
            elif line.strip() and not line.strip().startswith("#"):
                if len(claims) > 0:
                    break
    return claims[:5]
