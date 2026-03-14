import json
import logging
import time

from app import ai_client
from app.config import OPENROUTER_API_KEY

logger = logging.getLogger(__name__)

DEBATE_PHASES = [
    {"phase": "agent_a", "label": "Quick Agent analyzing..."},
    {"phase": "agent_b", "label": "Deep Agent analyzing..."},
    {"phase": "synthesis", "label": "Synthesizing final answer..."},
]


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


async def stream_agent_debate(query: str):
    """Async generator yielding SSE events for the dual-agent debate."""
    start_all = time.time()

    # ── Phase 1: Agent A (Groq) — fast initial analysis ──
    yield _sse({
        "type": "phase",
        "phase": "agent_a",
        "status": "started",
        "label": DEBATE_PHASES[0]["label"],
    })

    t0 = time.time()
    try:
        agent_a_prompt = ai_client.SYSTEM_PROMPT + "\n\n" + ai_client.DEEP_AGENT_A_PROMPT
        agent_a_response = await ai_client.chat(
            query,
            system_prompt=agent_a_prompt,
            max_tokens=1024,
        )
        if not agent_a_response:
            agent_a_response = "Unable to generate initial analysis."
    except Exception as e:
        logger.error(f"Agent A error: {e}")
        agent_a_response = f"Quick Agent encountered an error: {e}"

    agent_a_elapsed = round(time.time() - t0, 1)
    yield _sse({
        "type": "agent_response",
        "agent": "quick",
        "content": agent_a_response,
        "elapsed": agent_a_elapsed,
        "model": "llama-3.3-70b",
    })

    # ── Phase 2: Agent B (OpenRouter/Gemini) — critique + deep analysis ──
    agent_b_response = None
    agent_b_elapsed = 0.0

    if OPENROUTER_API_KEY:
        yield _sse({
            "type": "phase",
            "phase": "agent_b",
            "status": "started",
            "label": DEBATE_PHASES[1]["label"],
        })

        t0 = time.time()
        try:
            critique_prompt = (
                f"User's question: {query}\n\n"
                f"--- Quick Agent's Analysis ---\n{agent_a_response}\n"
                f"--- End of Quick Agent's Analysis ---\n\n"
                "Now provide your deep research analysis as instructed."
            )
            agent_b_response = await ai_client.openrouter_chat(
                critique_prompt,
                system_prompt=ai_client.SYSTEM_PROMPT + "\n\n" + ai_client.DEEP_AGENT_B_PROMPT,
                max_tokens=4096,
            )
        except Exception as e:
            logger.error(f"Agent B error: {e}")
            agent_b_response = None

        agent_b_elapsed = round(time.time() - t0, 1)

        if agent_b_response:
            yield _sse({
                "type": "agent_response",
                "agent": "deep",
                "content": agent_b_response,
                "elapsed": agent_b_elapsed,
                "model": "gemini-2.5-pro",
            })
        else:
            yield _sse({
                "type": "phase",
                "phase": "agent_b",
                "status": "error",
                "label": "Deep Agent unavailable — using Quick Agent only",
            })
    else:
        yield _sse({
            "type": "phase",
            "phase": "agent_b",
            "status": "skipped",
            "label": "Deep Agent not configured — using Quick Agent only",
        })

    # ── Phase 3: Synthesis (Groq) — merge both analyses ──
    yield _sse({
        "type": "phase",
        "phase": "synthesis",
        "status": "started",
        "label": DEBATE_PHASES[2]["label"],
    })

    t0 = time.time()
    try:
        if agent_b_response:
            synthesis_input = (
                f"User's question: {query}\n\n"
                f"--- Quick Agent (llama-3.3-70b) ---\n{agent_a_response}\n\n"
                f"--- Deep Agent (gemini-2.5-pro) ---\n{agent_b_response}\n\n"
                "Synthesize the definitive answer as instructed."
            )
            synthesis = await ai_client.chat(
                synthesis_input,
                system_prompt=ai_client.SYSTEM_PROMPT + "\n\n" + ai_client.SYNTHESIS_PROMPT,
                max_tokens=2048,
            )
        else:
            # No Agent B — just expand Agent A's response
            synthesis = await ai_client.chat(
                f"Expand and improve this analysis of: {query}\n\n"
                f"Initial analysis:\n{agent_a_response}\n\n"
                "Provide a comprehensive, well-structured final answer.",
                system_prompt=ai_client.SYSTEM_PROMPT,
                max_tokens=2048,
            )

        if not synthesis:
            synthesis = agent_a_response
    except Exception as e:
        logger.error(f"Synthesis error: {e}")
        synthesis = agent_a_response

    synthesis_elapsed = round(time.time() - t0, 1)
    total_elapsed = round(time.time() - start_all, 1)

    # ── Result ──
    yield _sse({
        "type": "result",
        "data": {
            "query": query,
            "agent_a": {
                "model": "llama-3.3-70b",
                "response": agent_a_response,
                "elapsed": agent_a_elapsed,
            },
            "agent_b": {
                "model": "gemini-2.5-pro",
                "response": agent_b_response,
                "elapsed": agent_b_elapsed,
            } if agent_b_response else None,
            "synthesis": synthesis,
            "synthesis_elapsed": synthesis_elapsed,
            "total_elapsed": total_elapsed,
        },
    })

    yield _sse({"type": "done"})
