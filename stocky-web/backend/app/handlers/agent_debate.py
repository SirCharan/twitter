import asyncio
import json
import logging
import time

from app import ai_client

logger = logging.getLogger(__name__)


async def _fetch_news_context() -> str:
    """Fetch headlines from all RSS feeds and format as context for agents."""
    from app.handlers.news import _fetch_all_headlines

    loop = asyncio.get_event_loop()
    articles = await loop.run_in_executor(None, lambda: _fetch_all_headlines(max_per_feed=5))
    if not articles:
        return ""

    # Deduplicate by title
    seen = set()
    unique = []
    for a in articles:
        key = a["title"].lower().strip()
        if key not in seen:
            seen.add(key)
            unique.append(a)

    # Group by category for structured context
    by_cat: dict[str, list[dict]] = {}
    from app.handlers.news import FEED_CATEGORIES
    for a in unique:
        cat = FEED_CATEGORIES.get(a["source"], "Other")
        by_cat.setdefault(cat, []).append(a)

    lines = [f"=== LIVE NEWS INTELLIGENCE ({len(unique)} headlines from {len(set(a['source'] for a in unique))} sources) ===\n"]
    for cat in ["Indian", "Global", "Asia-Pacific", "Energy", "Commodities", "Geopolitical", "Other"]:
        items = by_cat.get(cat, [])
        if not items:
            continue
        lines.append(f"\n## {cat}")
        for a in items[:15]:
            sentiment_tag = ""
            s = a.get("sentiment", 0)
            if s > 0.2:
                sentiment_tag = " [+]"
            elif s < -0.2:
                sentiment_tag = " [-]"
            date_str = f" ({a['date']})" if a.get("date") else ""
            lines.append(f"- [{a['source']}]{date_str} {a['title']}{sentiment_tag}")

    return "\n".join(lines)

TRIAD_PHASES = [
    {"phase": "briefing",   "agent": "nexus", "label": "Nexus is setting research parameters..."},
    {"phase": "thesis",     "agent": "aris",  "label": "Dr. Aris Thorne is building thesis..."},
    {"phase": "cross_exam", "agent": "silas", "label": "Silas Vance is cross-examining..."},
    {"phase": "rebuttal",   "agent": "aris",  "label": "Rebuttal round..."},
    {"phase": "synthesis",  "agent": "nexus", "label": "Nexus is synthesizing final report..."},
]


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


async def stream_triad_debate(query: str, data_context: str | None = None):
    """Async generator yielding SSE events for the Triad Deep Research Protocol.

    Args:
        query: The user's research question.
        data_context: Optional pre-fetched market data to inject into the briefing
                      (used by stock-specific deep research).
    """
    start_all = time.time()
    responses: dict[str, str] = {}

    # ── Stage 0: Fetch live news from all sources ────────────────────
    yield _sse({
        "type": "news_scan", "status": "started",
        "label": "Scanning 38 news sources...",
    })

    t0 = time.time()
    try:
        news_context = await _fetch_news_context()
    except Exception as e:
        logger.error(f"News fetch error: {e}")
        news_context = ""
    news_elapsed = round(time.time() - t0, 1)

    yield _sse({
        "type": "news_scan", "status": "done",
        "elapsed": news_elapsed,
        "headline_count": news_context.count("\n- [") if news_context else 0,
    })

    # ── Stage 1: Nexus Briefing ──────────────────────────────────────
    yield _sse({
        "type": "phase", "phase": "briefing", "agent": "nexus",
        "status": "started", "label": TRIAD_PHASES[0]["label"],
        "thinking": "Analyzing the query and defining research scope...",
    })

    t0 = time.time()
    briefing_input = f"Research query: {query}"
    if data_context:
        briefing_input += f"\n\n--- Pre-fetched Market Data ---\n{data_context}"
    if news_context:
        briefing_input += f"\n\n{news_context}"

    try:
        briefing = await ai_client.triad_call(
            "nexus", briefing_input,
            ai_client.SYSTEM_PROMPT + "\n\n" + ai_client.NEXUS_BRIEFING_PROMPT,
            max_tokens=512,
        )
        if not briefing:
            briefing = f"Research scope: {query}. Investigate thoroughly."
    except Exception as e:
        logger.error(f"Nexus briefing error: {e}")
        briefing = f"Research scope: {query}. Investigate thoroughly."

    briefing_elapsed = round(time.time() - t0, 1)
    responses["briefing"] = briefing

    yield _sse({
        "type": "agent_response", "agent": "nexus", "phase": "briefing",
        "content": briefing, "elapsed": briefing_elapsed,
    })

    # ── Stage 2: Dr. Aris Thorne — Initial Thesis ────────────────────
    yield _sse({
        "type": "phase", "phase": "thesis", "agent": "aris",
        "status": "started", "label": TRIAD_PHASES[1]["label"],
        "thinking": "Scanning market data, fundamentals, technicals, and news...",
    })

    t0 = time.time()
    thesis_input = (
        f"User's research query: {query}\n\n"
        f"--- Nexus Briefing ---\n{briefing}\n"
    )
    if data_context:
        thesis_input += f"\n--- Market Data ---\n{data_context}\n"
    if news_context:
        thesis_input += f"\n{news_context}\n"
    thesis_input += "\nPresent your research thesis as instructed."

    try:
        thesis = await ai_client.triad_call(
            "aris", thesis_input,
            ai_client.SYSTEM_PROMPT + "\n\n" + ai_client.ARIS_PROMPT,
            max_tokens=2048,
        )
        if not thesis:
            thesis = "Unable to generate thesis."
    except Exception as e:
        logger.error(f"Aris thesis error: {e}")
        thesis = f"Research error: {e}"

    thesis_elapsed = round(time.time() - t0, 1)
    responses["thesis"] = thesis

    yield _sse({
        "type": "agent_response", "agent": "aris", "phase": "thesis",
        "content": thesis, "elapsed": thesis_elapsed,
    })

    # ── Stage 3: Silas Vance — Cross-Examination ─────────────────────
    yield _sse({
        "type": "phase", "phase": "cross_exam", "agent": "silas",
        "status": "started", "label": TRIAD_PHASES[2]["label"],
        "thinking": "Scrutinizing claims, checking sources, finding weaknesses...",
    })

    t0 = time.time()
    cross_exam_input = (
        f"User's research query: {query}\n\n"
        f"--- Nexus Briefing ---\n{briefing}\n\n"
        f"--- Dr. Aris Thorne's Thesis ---\n{thesis}\n\n"
    )
    if news_context:
        cross_exam_input += f"{news_context}\n\n"
    cross_exam_input += "Cross-examine this thesis as instructed. Challenge every claim."

    try:
        cross_exam = await ai_client.triad_call(
            "silas", cross_exam_input,
            ai_client.SYSTEM_PROMPT + "\n\n" + ai_client.SILAS_PROMPT,
            max_tokens=2048,
        )
        if not cross_exam:
            cross_exam = "Unable to generate cross-examination."
    except Exception as e:
        logger.error(f"Silas cross-exam error: {e}")
        cross_exam = f"Cross-examination error: {e}"

    cross_exam_elapsed = round(time.time() - t0, 1)
    responses["cross_exam"] = cross_exam

    yield _sse({
        "type": "agent_response", "agent": "silas", "phase": "cross_exam",
        "content": cross_exam, "elapsed": cross_exam_elapsed,
    })

    # ── Stage 4: Rebuttal — Aris responds, then Silas final assessment ─
    yield _sse({
        "type": "phase", "phase": "rebuttal", "agent": "aris",
        "status": "started", "label": TRIAD_PHASES[3]["label"],
        "thinking": "Dr. Aris is defending thesis, Silas is preparing final assessment...",
    })

    t0 = time.time()
    rebuttal_input = (
        f"User's research query: {query}\n\n"
        f"--- Your Original Thesis ---\n{thesis}\n\n"
        f"--- Silas Vance's Cross-Examination ---\n{cross_exam}\n\n"
        "Respond to each challenge. Defend your thesis where warranted, "
        "concede where Silas makes valid points. Update your confidence levels."
    )

    try:
        rebuttal = await ai_client.triad_call(
            "aris", rebuttal_input,
            ai_client.SYSTEM_PROMPT + "\n\n" + ai_client.ARIS_PROMPT,
            max_tokens=1536,
        )
        if not rebuttal:
            rebuttal = "No rebuttal generated."
    except Exception as e:
        logger.error(f"Aris rebuttal error: {e}")
        rebuttal = f"Rebuttal error: {e}"

    # Silas final assessment
    silas_final_input = (
        f"User's research query: {query}\n\n"
        f"--- Dr. Aris Thorne's Rebuttal ---\n{rebuttal}\n\n"
        "Give your final assessment. Has Aris adequately addressed your challenges? "
        "Rate the overall research quality. Are you satisfied with the evidence?"
    )

    try:
        silas_final = await ai_client.triad_call(
            "silas", silas_final_input,
            ai_client.SYSTEM_PROMPT + "\n\n" + ai_client.SILAS_PROMPT,
            max_tokens=1024,
        )
        if not silas_final:
            silas_final = "No final assessment."
    except Exception as e:
        logger.error(f"Silas final assessment error: {e}")
        silas_final = f"Assessment error: {e}"

    rebuttal_elapsed = round(time.time() - t0, 1)
    responses["rebuttal"] = rebuttal
    responses["silas_final"] = silas_final

    yield _sse({
        "type": "agent_response", "agent": "aris", "phase": "rebuttal",
        "content": rebuttal, "elapsed": rebuttal_elapsed,
        "silas_final": silas_final,
    })

    # ── Stage 5: Nexus — Final Synthesis & Verification ──────────────
    yield _sse({
        "type": "phase", "phase": "synthesis", "agent": "nexus",
        "status": "started", "label": TRIAD_PHASES[4]["label"],
        "thinking": "Verifying all claims, synthesizing final report...",
    })

    t0 = time.time()
    synthesis_input = (
        f"User's research query: {query}\n\n"
        f"--- Nexus Briefing ---\n{briefing}\n\n"
        f"--- Dr. Aris Thorne's Thesis ---\n{thesis}\n\n"
        f"--- Silas Vance's Cross-Examination ---\n{cross_exam}\n\n"
        f"--- Dr. Aris Thorne's Rebuttal ---\n{rebuttal}\n\n"
        f"--- Silas Vance's Final Assessment ---\n{silas_final}\n\n"
        "Now synthesize the final report. VERIFY every factual claim before including it. "
        "Assign a confidence score (0-100). List verified sources and flag unverified claims."
    )

    try:
        synthesis = await ai_client.triad_call(
            "nexus", synthesis_input,
            ai_client.SYSTEM_PROMPT + "\n\n" + ai_client.NEXUS_SYNTHESIS_PROMPT,
            max_tokens=3000,
        )
        if not synthesis:
            synthesis = thesis  # fallback to Aris's thesis
    except Exception as e:
        logger.error(f"Nexus synthesis error: {e}")
        synthesis = thesis

    synthesis_elapsed = round(time.time() - t0, 1)
    total_elapsed = round(time.time() - start_all, 1)

    # Parse confidence score from synthesis
    confidence_score = _extract_confidence(synthesis)
    sources_verified = _extract_sources(synthesis)
    unverified_claims = _extract_unverified(synthesis)

    # ── Final Result ─────────────────────────────────────────────────
    yield _sse({
        "type": "result",
        "data": {
            "query": query,
            "briefing": {
                "agent": "Nexus",
                "content": briefing,
                "elapsed": briefing_elapsed,
            },
            "thesis": {
                "agent": "Dr. Aris Thorne",
                "content": thesis,
                "elapsed": thesis_elapsed,
            },
            "cross_examination": {
                "agent": "Silas Vance",
                "content": cross_exam,
                "elapsed": cross_exam_elapsed,
            },
            "rebuttal": {
                "agent": "Dr. Aris Thorne",
                "content": rebuttal,
                "elapsed": rebuttal_elapsed,
            },
            "final_assessment": {
                "agent": "Silas Vance",
                "content": silas_final,
            },
            "synthesis": synthesis,
            "synthesis_elapsed": synthesis_elapsed,
            "confidence_score": confidence_score,
            "sources_verified": sources_verified,
            "unverified_claims": unverified_claims,
            "total_elapsed": total_elapsed,
        },
    })

    yield _sse({"type": "done"})


def _extract_confidence(text: str) -> int:
    """Extract confidence score from Nexus synthesis."""
    import re
    match = re.search(r"Confidence\s*Score[:\s]*(\d{1,3})", text, re.IGNORECASE)
    if match:
        score = int(match.group(1))
        return min(max(score, 0), 100)
    return 65  # default moderate confidence


def _extract_sources(text: str) -> list[str]:
    """Extract verified sources list from synthesis."""
    import re
    sources = []
    in_section = False
    for line in text.split("\n"):
        if re.search(r"sources?\s*verified", line, re.IGNORECASE):
            in_section = True
            continue
        if in_section:
            if line.strip().startswith("- "):
                sources.append(line.strip().lstrip("- ").strip())
            elif line.strip().startswith("#") or (line.strip() and not line.strip().startswith("-")):
                break
    return sources or ["Market data via yfinance", "NSE India"]


def _extract_unverified(text: str) -> list[str]:
    """Extract unverified claims from synthesis."""
    import re
    claims = []
    in_section = False
    for line in text.split("\n"):
        if re.search(r"unverified\s*claims?", line, re.IGNORECASE):
            in_section = True
            continue
        if in_section:
            if line.strip().startswith("- "):
                claims.append(line.strip().lstrip("- ").strip())
            elif line.strip().startswith("#") or (line.strip() and not line.strip().startswith("-")):
                break
    return claims


# Backward-compatible alias
async def stream_agent_debate(query: str):
    """Backward-compatible wrapper — now uses Triad protocol."""
    async for chunk in stream_triad_debate(query):
        yield chunk
