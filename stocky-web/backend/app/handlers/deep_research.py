import asyncio
import json
import logging
import time

import yfinance as yf

from app import ai_client
from app.database import log_api_call
from app.handlers.analyse import (
    _get_fundamental_data,
    _get_news_data,
    _get_quarterly_results,
    _get_shareholding,
    _get_technical_data,
    _resolve_symbol,
    _validate_yf_ticker,
)

logger = logging.getLogger(__name__)

RESEARCH_STEPS = [
    "Fetching technical indicators",
    "Loading fundamental data",
    "Loading quarterly financials",
    "Scanning news sources",
    "Checking shareholding",
    "Generating AI verdict",
    "Building report",
]


async def stream_deep_research(stock: str, mode: str):
    """Async generator yielding SSE-formatted events for deep research."""
    total = len(RESEARCH_STEPS)
    start_all = time.time()
    loop = asyncio.get_event_loop()

    yf_symbol, nse_symbol, news_terms = _resolve_symbol(stock)
    valid = await loop.run_in_executor(None, _validate_yf_ticker, yf_symbol)
    if valid:
        yf_symbol = valid
    ticker = yf.Ticker(yf_symbol)

    def _emit(index: int, elapsed: float) -> str:
        return f"data: {json.dumps({'type': 'progress', 'step': RESEARCH_STEPS[index], 'index': index, 'total': total, 'elapsed': elapsed})}\n\n"

    # Step 0: Technical
    t0 = time.time()
    await log_api_call("yfinance", "technical_data")
    technical, technical_score = await loop.run_in_executor(None, _get_technical_data, yf_symbol)
    yield _emit(0, round(time.time() - t0, 1))

    # Step 1: Fundamental
    t0 = time.time()
    await log_api_call("yfinance", "fundamental_data")
    fundamental, fundamental_score = await loop.run_in_executor(None, _get_fundamental_data, ticker)
    yield _emit(1, round(time.time() - t0, 1))

    # Step 2: Quarterly
    t0 = time.time()
    await log_api_call("yfinance", "quarterly_results")
    quarterly = await loop.run_in_executor(None, _get_quarterly_results, ticker)
    yield _emit(2, round(time.time() - t0, 1))

    # Step 3: News
    t0 = time.time()
    await log_api_call("rss", "news_feeds")
    news_articles, news_score = await loop.run_in_executor(None, _get_news_data, news_terms)
    yield _emit(3, round(time.time() - t0, 1))

    # Step 4: Shareholding
    t0 = time.time()
    shareholding = await loop.run_in_executor(None, _get_shareholding, ticker)
    yield _emit(4, round(time.time() - t0, 1))

    # Step 5: AI verdict
    t0 = time.time()
    try:
        name = ticker.info.get("longName") or ticker.info.get("shortName") or stock.upper()
    except Exception:
        name = stock.upper()

    overall = round(fundamental_score + technical_score + news_score, 1)
    data_summary = (
        f"Fundamental: {fundamental_score}/10\n"
        f"Technical: {technical_score}/10\n"
        f"News: {news_score}/10\n"
        f"Overall: {overall}/30"
    )

    try:
        verdict = await ai_client.analyse_verdict(name, data_summary)
    except Exception:
        verdict = None

    if not verdict:
        if overall >= 21:
            verdict = "Trend, fundamentals, sentiment — all aligned. Asymmetric payoff in your favour."
        elif overall >= 16:
            verdict = "More right than wrong. Not perfect, but the odds lean positive."
        elif overall >= 12:
            verdict = "No edge. Mixed signals. Sitting this out is a valid trade."
        elif overall >= 6:
            verdict = "Trend is against you. Fundamentals aren't saving it. Bad risk-reward."
        else:
            verdict = "Everything is broken. Stay away."

    yield _emit(5, round(time.time() - t0, 1))

    # Step 6: Triad Deep Research debate on collected data
    t0 = time.time()

    # Build data context for the Triad briefing
    news_titles = [a["title"] for a in news_articles[:5]]
    data_context = (
        f"Stock: {name} ({nse_symbol})\n"
        f"Scores — Overall: {overall}/30 | Technical: {technical_score}/10 | "
        f"Fundamental: {fundamental_score}/10 | News: {news_score}/10\n"
        f"RSI: {technical.get('rsi', '?')} ({technical.get('rsi_label', '')})\n"
        f"MACD: {technical.get('macd_signal', '?')} | SMA: {technical.get('sma_signal', '?')}\n"
        f"P/E: {fundamental.get('pe', '?')} | ROE: {fundamental.get('roe', '?')}% | "
        f"D/E: {fundamental.get('debt_to_equity', '?')}\n"
        f"Verdict: {verdict}\n"
        f"Recent headlines:\n" + "\n".join(f"- {t}" for t in news_titles)
    )

    triad_query = f"Deep research analysis of {name} ({nse_symbol})"

    from app.handlers.agent_debate import stream_triad_debate

    triad_responses = {}
    async for sse_chunk in stream_triad_debate(triad_query, data_context=data_context):
        # Parse SSE to capture triad result, and forward phase events
        if sse_chunk.startswith("data: "):
            try:
                event = json.loads(sse_chunk[6:].strip())
                if event.get("type") == "phase":
                    # Re-emit as triad_phase so frontend can distinguish
                    event["type"] = "triad_phase"
                    yield f"data: {json.dumps(event)}\n\n"
                elif event.get("type") == "agent_response":
                    event["type"] = "triad_agent_response"
                    yield f"data: {json.dumps(event)}\n\n"
                elif event.get("type") == "result":
                    triad_responses = event.get("data", {})
                # Skip "done" — we emit our own
            except (json.JSONDecodeError, KeyError):
                pass

    yield _emit(6, round(time.time() - t0, 1))

    result = {
        "name": name,
        "symbol": nse_symbol,
        "overall_score": overall,
        "fundamental": {"score": fundamental_score, **fundamental},
        "technical": {"score": technical_score, **technical},
        "news": {"score": news_score, "articles": news_articles},
        "quarterly": quarterly,
        "shareholding": shareholding,
        "verdict": verdict,
        "full_report": triad_responses.get("synthesis", f"## {name}\n\n**Verdict:** {verdict}"),
        "triad": triad_responses,
        "mode": mode,
        "total_elapsed": round(time.time() - start_all, 1),
    }

    yield f"data: {json.dumps({'type': 'result', 'data': result})}\n\n"
    yield 'data: {"type":"done"}\n\n'
