"""6-Agent Stocky Council — SSE streaming debate handler.

Execution flow:
  Round 1 (Intelligence): CSO decompose → Data fetch → TS+FA+MP parallel → RG+ME parallel
  Round 2 (Debate): CSO identifies conflicts, generates rebuttals
  Round 3 (Verdict): CSO trade idea → CSO final synthesis
"""

import json
import logging
import re
import time
import asyncio
from datetime import datetime, timezone
from typing import AsyncGenerator

from app import ai_client
from app.prompts.council import (
    COUNCIL_AGENTS,
    COUNCIL_STEPS,
    CSO_DECOMPOSITION_PROMPT,
    CSO_REBUTTAL_PROMPT,
    CSO_SYNTHESIS_PROMPT,
    CSO_TRADE_PROMPT,
    FA_PROMPT,
    ME_PROMPT,
    MP_PROMPT,
    RG_PROMPT,
    TS_PROMPT,
)
from app.services.data_enricher import DataEnricher

logger = logging.getLogger(__name__)

_AGENT_PROMPTS = {
    "TS": TS_PROMPT,
    "FA": FA_PROMPT,
    "MP": MP_PROMPT,
    "RG": RG_PROMPT,
    "ME": ME_PROMPT,
}


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


def _agent_meta():
    return [
        {"name": a["name"], "short": a["short"], "icon": a["icon"],
         "color": a["color"], "skills": a["skills"]}
        for a in COUNCIL_AGENTS
    ]


# ---------------------------------------------------------------------------
# Ticker extraction
# ---------------------------------------------------------------------------
_KNOWN_TICKERS = {
    "reliance": "RELIANCE", "tcs": "TCS", "infy": "INFY", "infosys": "INFY",
    "hdfc": "HDFCBANK", "hdfcbank": "HDFCBANK", "icici": "ICICIBANK",
    "sbi": "SBIN", "wipro": "WIPRO", "itc": "ITC", "bhartiartl": "BHARTIARTL",
    "airtel": "BHARTIARTL", "hul": "HINDUNILVR", "kotak": "KOTAKBANK",
    "bajfinance": "BAJFINANCE", "bajaj finance": "BAJFINANCE",
    "maruti": "MARUTI", "sunpharma": "SUNPHARMA", "tatamotors": "TATAMOTORS",
    "tata motors": "TATAMOTORS", "tatasteel": "TATASTEEL", "tata steel": "TATASTEEL",
    "adani": "ADANIENT", "lt": "LT", "axisbank": "AXISBANK", "ongc": "ONGC",
    "nifty": "^NSEI", "sensex": "^BSESN", "banknifty": "^NSEBANK",
    "zomato": "ZOMATO", "paytm": "PAYTM", "nykaa": "NYKAA",
}


def _extract_tickers(query: str) -> list[str]:
    tickers = []
    q = query.lower()
    for keyword, ticker in _KNOWN_TICKERS.items():
        if keyword in q:
            tickers.append(ticker)
    # Also match explicit .NS tickers
    for m in re.finditer(r"\b([A-Z]{2,20})\.NS\b", query):
        tickers.append(m.group(1))
    return list(dict.fromkeys(tickers))[:3]  # deduplicate, limit 3


# ---------------------------------------------------------------------------
# Parsing helpers for synthesis
# ---------------------------------------------------------------------------

def _extract_confidence(text: str) -> int:
    patterns = [
        r"Confidence\s*Score[:\s]*(\d{1,3})",
        r"(\d{1,3})\s*/\s*100",
        r"confidence[:\s]*(\d{1,3})\s*%",
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            return min(int(m.group(1)), 100)
    return 65


def _extract_section(text: str, heading: str) -> str:
    pattern = rf"##\s*{heading}\s*\n(.*?)(?=\n##|\Z)"
    m = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    return m.group(1).strip() if m else ""


def _extract_risks(text: str) -> list[dict]:
    risks = []
    section = _extract_section(text, "Key Risks")
    for line in section.split("\n"):
        m = re.search(r"-\s*(.+?):\s*(\d{1,3})%", line)
        if m:
            risks.append({"risk": m.group(1).strip(), "probability": int(m.group(2))})
    return risks or [{"risk": "Market volatility", "probability": 50}]


def _extract_sources(text: str) -> list[str]:
    section = _extract_section(text, "Sources Verified")
    if not section:
        return ["yfinance", "GNews"]
    return [s.strip().strip("-").strip() for s in section.split("\n") if s.strip()]


def _extract_unverified(text: str) -> list[str]:
    section = _extract_section(text, "Unverified Claims")
    if not section:
        return []
    return [s.strip().strip("-").strip() for s in section.split("\n") if s.strip()]


def _parse_trade(text: str) -> dict:
    trade: dict = {
        "action": "HOLD",
        "entry": None,
        "target_1": None,
        "target_2": None,
        "stoploss": None,
        "sizing": "2-3% of portfolio",
        "timeframe": "2-4 weeks",
        "risk_reward": "1:2",
    }
    # Action
    m = re.search(r"\*\*Action\*\*:\s*(BUY|SELL|HOLD|AVOID)", text, re.IGNORECASE)
    if m:
        trade["action"] = m.group(1).upper()
    # Entry
    m = re.search(r"\*\*Entry\*\*:\s*₹?([\d,]+\.?\d*)", text)
    if m:
        trade["entry"] = float(m.group(1).replace(",", ""))
    # Target 1
    m = re.search(r"\*\*Target\s*1\*\*:\s*₹?([\d,]+\.?\d*)", text)
    if m:
        trade["target_1"] = float(m.group(1).replace(",", ""))
    # Target 2
    m = re.search(r"\*\*Target\s*2\*\*:\s*₹?([\d,]+\.?\d*)", text)
    if m:
        trade["target_2"] = float(m.group(1).replace(",", ""))
    # Stop-Loss
    m = re.search(r"\*\*Stop.?Loss\*\*:\s*₹?([\d,]+\.?\d*)", text)
    if m:
        trade["stoploss"] = float(m.group(1).replace(",", ""))
    # Position Size
    m = re.search(r"\*\*Position\s*Size\*\*:\s*(.+)", text)
    if m:
        trade["sizing"] = m.group(1).strip()
    # Timeframe
    m = re.search(r"\*\*Timeframe\*\*:\s*(.+)", text)
    if m:
        trade["timeframe"] = m.group(1).strip()
    # Risk/Reward
    m = re.search(r"\*\*Risk.?Reward\*\*:\s*(.+)", text)
    if m:
        trade["risk_reward"] = m.group(1).strip()
    return trade


# ---------------------------------------------------------------------------
# Main streaming handler
# ---------------------------------------------------------------------------

async def stream_council_debate(query: str) -> AsyncGenerator[str, None]:
    """Stream 6-agent Stocky Council debate via SSE."""

    total_start = time.time()
    enricher = DataEnricher()
    tickers = _extract_tickers(query)
    agent_outputs: dict[str, str] = {}
    steps_data: list[dict] = []

    # --- Emit council start ---
    yield _sse({
        "type": "council_start",
        "query": query,
        "agents": _agent_meta(),
    })

    # ===================================================================
    # ROUND 1: INTELLIGENCE GATHERING
    # ===================================================================

    # Step 1: CSO Query Decomposition
    yield _sse({"type": "step_start", "step": 1, "round": 1,
                "label": "Query Decomposition", "agent": "CSO"})
    yield _sse({"type": "agent_thinking", "agent": "CSO",
                "thinking": "Breaking down the research query..."})

    t = time.time()
    try:
        decomposition = await ai_client.council_call(
            "CSO", f"Research query: {query}", CSO_DECOMPOSITION_PROMPT, 512
        )
    except Exception as e:
        decomposition = f"Query analysis: {query}. Investigate all angles."
        logger.error(f"CSO decomposition error: {e}")

    elapsed = round(time.time() - t, 1)
    steps_data.append({"step": 1, "agent": "CSO", "label": "Query Decomposition",
                       "content": decomposition, "elapsed": elapsed})
    yield _sse({"type": "agent_output", "agent": "CSO", "step": 1, "round": 1,
                "content": decomposition, "elapsed": elapsed})

    # Step 2: Data Fetch (non-LLM)
    yield _sse({"type": "step_start", "step": 2, "round": 1,
                "label": "Market Data Fetch", "agent": None})
    yield _sse({"type": "data_fetch", "status": "started",
                "sources": ["yfinance", "gnews", "nsetools"]})

    t = time.time()
    try:
        data_context = await enricher.enrich_for_council(query, tickers)
    except Exception as e:
        data_context = f"Data fetch failed: {e}. Proceed with available knowledge."
        logger.error(f"Data enricher error: {e}")

    elapsed = round(time.time() - t, 1)
    steps_data.append({"step": 2, "agent": None, "label": "Market Data Fetch",
                       "content": f"Fetched data for {len(tickers)} tickers", "elapsed": elapsed})
    yield _sse({"type": "data_fetch", "status": "done", "elapsed": elapsed})
    yield _sse({"type": "agent_output", "agent": None, "step": 2, "round": 1,
                "content": f"Market data fetched for {', '.join(tickers) or 'general query'}",
                "elapsed": elapsed})

    # Steps 3-5: Parallel Group A (TS, FA, MP)
    async def _run_agent(step: int, agent: str, prompt: str, max_tokens: int) -> dict:
        user_msg = (
            f"Research query: {query}\n\n"
            f"CSO Decomposition:\n{decomposition}\n\n"
            f"{data_context}"
        )
        t0 = time.time()
        try:
            content = await ai_client.council_call(agent, user_msg, prompt, max_tokens)
        except Exception as e:
            content = f"[{agent}] Analysis unavailable: {e}"
            logger.error(f"Council {agent} step {step} error: {e}")
        return {
            "step": step, "agent": agent,
            "label": COUNCIL_STEPS[step - 1]["label"],
            "content": content,
            "elapsed": round(time.time() - t0, 1),
        }

    for s, a in [(3, "TS"), (4, "FA"), (5, "MP")]:
        yield _sse({"type": "step_start", "step": s, "round": 1,
                    "label": COUNCIL_STEPS[s - 1]["label"], "agent": a})
        yield _sse({"type": "agent_thinking", "agent": a,
                    "thinking": f"Analysing {COUNCIL_STEPS[s-1]['label'].lower()}..."})

    results_a = await asyncio.gather(
        _run_agent(3, "TS", TS_PROMPT, 2048),
        _run_agent(4, "FA", FA_PROMPT, 2048),
        _run_agent(5, "MP", MP_PROMPT, 1536),
        return_exceptions=True,
    )

    for r in results_a:
        if isinstance(r, Exception):
            logger.error(f"Agent group A exception: {r}")
            continue
        agent_outputs[r["agent"]] = r["content"]
        steps_data.append(r)
        yield _sse({"type": "agent_output", "agent": r["agent"], "step": r["step"],
                    "round": 1, "content": r["content"], "elapsed": r["elapsed"]})

    # Steps 6-7: Parallel Group B (RG, ME) — with prior agent context
    prior_context = "\n\n".join(
        f"--- {k} Analysis ---\n{v}" for k, v in agent_outputs.items()
    )

    async def _run_agent_b(step: int, agent: str, prompt: str, max_tokens: int) -> dict:
        user_msg = (
            f"Research query: {query}\n\n"
            f"CSO Decomposition:\n{decomposition}\n\n"
            f"{data_context}\n\n"
            f"Prior agent analyses:\n{prior_context}"
        )
        t0 = time.time()
        try:
            content = await ai_client.council_call(agent, user_msg, prompt, max_tokens)
        except Exception as e:
            content = f"[{agent}] Analysis unavailable: {e}"
            logger.error(f"Council {agent} step {step} error: {e}")
        return {
            "step": step, "agent": agent,
            "label": COUNCIL_STEPS[step - 1]["label"],
            "content": content,
            "elapsed": round(time.time() - t0, 1),
        }

    for s, a in [(6, "RG"), (7, "ME")]:
        yield _sse({"type": "step_start", "step": s, "round": 1,
                    "label": COUNCIL_STEPS[s - 1]["label"], "agent": a})
        yield _sse({"type": "agent_thinking", "agent": a,
                    "thinking": f"Analysing {COUNCIL_STEPS[s-1]['label'].lower()}..."})

    results_b = await asyncio.gather(
        _run_agent_b(6, "RG", RG_PROMPT, 1536),
        _run_agent_b(7, "ME", ME_PROMPT, 1536),
        return_exceptions=True,
    )

    for r in results_b:
        if isinstance(r, Exception):
            logger.error(f"Agent group B exception: {r}")
            continue
        agent_outputs[r["agent"]] = r["content"]
        steps_data.append(r)
        yield _sse({"type": "agent_output", "agent": r["agent"], "step": r["step"],
                    "round": 1, "content": r["content"], "elapsed": r["elapsed"]})

    # ===================================================================
    # ROUND 2: DEBATE & REBUTTALS
    # ===================================================================

    yield _sse({"type": "round_start", "round": 2, "label": "Debate & Rebuttals"})

    all_outputs = "\n\n".join(
        f"--- {k} ---\n{v}" for k, v in agent_outputs.items()
    )
    rebuttal_input = (
        f"Research query: {query}\n\n"
        f"All agent analyses:\n{all_outputs}\n\n"
        "Identify conflicts and challenge the weakest claims."
    )

    yield _sse({"type": "agent_thinking", "agent": "CSO",
                "thinking": "Reviewing agent analyses for conflicts..."})

    t = time.time()
    try:
        rebuttal_content = await ai_client.council_call(
            "CSO", rebuttal_input, CSO_REBUTTAL_PROMPT, 1536
        )
    except Exception as e:
        rebuttal_content = "No significant conflicts identified between agents."
        logger.error(f"CSO rebuttal error: {e}")

    rebuttal_elapsed = round(time.time() - t, 1)
    rebuttals = [{
        "agent": "CSO", "target": "ALL",
        "conflict": "Cross-agent review",
        "content": rebuttal_content,
        "elapsed": rebuttal_elapsed,
    }]
    yield _sse({"type": "rebuttal", "agent": "CSO", "target": "ALL",
                "content": rebuttal_content, "elapsed": rebuttal_elapsed})

    # ===================================================================
    # ROUND 3: VERDICT
    # ===================================================================

    yield _sse({"type": "round_start", "round": 3, "label": "Final Verdict"})

    # Step 8: Trade Idea
    yield _sse({"type": "step_start", "step": 8, "round": 3,
                "label": "Trade Idea Generation", "agent": "CSO"})
    yield _sse({"type": "agent_thinking", "agent": "CSO",
                "thinking": "Generating actionable trade recommendation..."})

    trade_input = (
        f"Query: {query}\n\n{all_outputs}\n\n"
        f"Rebuttal:\n{rebuttal_content}\n\n{data_context}"
    )
    t = time.time()
    try:
        trade_content = await ai_client.council_call(
            "CSO", trade_input, CSO_TRADE_PROMPT, 1024
        )
    except Exception as e:
        trade_content = "**Action**: HOLD\nInsufficient data for trade recommendation."
        logger.error(f"CSO trade error: {e}")

    trade_elapsed = round(time.time() - t, 1)
    steps_data.append({"step": 8, "agent": "CSO", "label": "Trade Idea Generation",
                       "content": trade_content, "elapsed": trade_elapsed})
    yield _sse({"type": "agent_output", "agent": "CSO", "step": 8, "round": 3,
                "content": trade_content, "elapsed": trade_elapsed})

    # Step 9: Final Synthesis
    yield _sse({"type": "step_start", "step": 9, "round": 3,
                "label": "Final Synthesis", "agent": "CSO"})
    yield _sse({"type": "agent_thinking", "agent": "CSO",
                "thinking": "Synthesizing all views into final report..."})

    synthesis_input = (
        f"Query: {query}\n\n{all_outputs}\n\n"
        f"Rebuttal:\n{rebuttal_content}\n\n"
        f"Trade Idea:\n{trade_content}"
    )
    t = time.time()
    try:
        synthesis = await ai_client.council_call(
            "CSO", synthesis_input, CSO_SYNTHESIS_PROMPT, 3000
        )
    except Exception as e:
        synthesis = "## Executive Summary\nAnalysis could not be completed due to an error."
        logger.error(f"CSO synthesis error: {e}")

    synthesis_elapsed = round(time.time() - t, 1)
    steps_data.append({"step": 9, "agent": "CSO", "label": "Final Synthesis",
                       "content": synthesis, "elapsed": synthesis_elapsed})
    yield _sse({"type": "agent_output", "agent": "CSO", "step": 9, "round": 3,
                "content": synthesis, "elapsed": synthesis_elapsed})

    # ===================================================================
    # FINAL RESULT
    # ===================================================================

    total_elapsed = round(time.time() - total_start, 1)
    confidence = _extract_confidence(synthesis)
    trade = _parse_trade(trade_content)

    result = {
        "query": query,
        "agents": _agent_meta(),
        "steps": steps_data,
        "rebuttals": rebuttals,
        "synthesis": {
            "executive_summary": synthesis,
            "bull_case": _extract_section(synthesis, "Bull Case"),
            "bear_case": _extract_section(synthesis, "Bear Case"),
            "key_risks": _extract_risks(synthesis),
            "trade": trade,
            "confidence_score": confidence,
            "sources": _extract_sources(synthesis),
            "unverified_claims": _extract_unverified(synthesis),
        },
        "total_elapsed": total_elapsed,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    yield _sse({"type": "result", "data": result})
    yield _sse({"type": "done"})
