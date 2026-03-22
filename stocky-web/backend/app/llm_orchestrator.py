"""
LLM Orchestrator — centralized AI interpretation layer for Stocky AI.

Every handler calls `enhance(button_type, raw_data, deep=False)` instead
of `ai_client.feature_analysis()`.  The orchestrator selects the right
prompt, model, token budget, and—when deep=True—runs a 3-stage pipeline
(primary analysis → critique → synthesis) with round-robin key rotation.
"""

import asyncio
import json
import logging
from typing import Any

from groq import AsyncGroq

from app.config import (
    GROQ_API_KEY,
    GROQ_API_KEY_2,
    GROQ_API_KEY_3,
    GROQ_API_KEY_4,
    GROQ_API_KEY_5,
    GROQ_API_KEY_6,
    GROQ_MODEL,
)
from app.prompts.orchestrator import (
    BUTTON_CONFIGS,
    DEEP_CRITIQUE_UNIVERSAL,
    DEEP_SYNTHESIS_UNIVERSAL,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Key Pool — thread-safe round-robin across all 6 Groq API keys
# ---------------------------------------------------------------------------

class KeyPool:
    """Rotates across all available Groq API keys for every call."""

    def __init__(self) -> None:
        self._keys: list[str] = [
            k for k in [
                GROQ_API_KEY, GROQ_API_KEY_2, GROQ_API_KEY_3,
                GROQ_API_KEY_4, GROQ_API_KEY_5, GROQ_API_KEY_6,
            ] if k
        ]
        if not self._keys:
            raise RuntimeError("No Groq API keys configured")
        self._clients: dict[str, AsyncGroq] = {}
        self._idx: int = 0
        self._lock = asyncio.Lock()

    async def next_client(self) -> AsyncGroq:
        async with self._lock:
            key = self._keys[self._idx % len(self._keys)]
            self._idx += 1
            if key not in self._clients:
                self._clients[key] = AsyncGroq(api_key=key)
            return self._clients[key]

    @property
    def key_count(self) -> int:
        return len(self._keys)


_key_pool = KeyPool()


# ---------------------------------------------------------------------------
# Low-level rotated call
# ---------------------------------------------------------------------------

async def _rotated_call(
    prompt: str,
    system_prompt: str = "",
    max_tokens: int = 512,
    model: str | None = None,
    temperature: float = 0.5,
) -> str:
    """Single Groq chat completion using the next key in the pool."""
    client = await _key_pool.next_client()
    mdl = model or GROQ_MODEL

    messages: list[dict[str, str]] = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    try:
        resp = await client.chat.completions.create(
            model=mdl,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        content = resp.choices[0].message.content or ""
        logger.info(
            "Orchestrator call: model=%s tokens=%s/%s",
            mdl,
            resp.usage.prompt_tokens if resp.usage else "?",
            resp.usage.completion_tokens if resp.usage else "?",
        )
        return content.strip()
    except Exception as e:
        logger.error("Orchestrator Groq call failed: %s", e)
        # Retry once with next key
        try:
            client = await _key_pool.next_client()
            resp = await client.chat.completions.create(
                model=mdl,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return (resp.choices[0].message.content or "").strip()
        except Exception as retry_err:
            logger.error("Orchestrator retry also failed: %s", retry_err)
            return ""


# ---------------------------------------------------------------------------
# Data formatting helpers
# ---------------------------------------------------------------------------

def _truncate(text: str, max_chars: int = 4000) -> str:
    """Truncate text to max_chars to avoid blowing prompt token budget."""
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n... [truncated]"


def _format_data(raw_data: dict[str, Any], max_chars: int = 4000) -> str:
    """Convert raw data dict to a readable text summary for prompts."""
    try:
        text = json.dumps(raw_data, indent=2, default=str, ensure_ascii=False)
    except (TypeError, ValueError):
        text = str(raw_data)
    return _truncate(text, max_chars)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def enhance(
    button_type: str,
    raw_data: dict[str, Any],
    user_query: str = "",
    deep: bool = False,
    history: list[dict] | None = None,
) -> dict[str, Any]:
    """
    Central AI interpretation for any button type.

    Returns:
        {"ai_analysis": str, "ai_metadata": dict | None}
    """
    config = BUTTON_CONFIGS.get(button_type)
    if not config:
        logger.warning("No orchestrator config for button_type=%s", button_type)
        return {"ai_analysis": "", "ai_metadata": None}

    data_text = _format_data(raw_data)
    temperature = config.get("temperature", 0.5)

    if deep:
        return await _deep_pipeline(button_type, config, raw_data, data_text, temperature)
    else:
        return await _quick_enhance(button_type, config, raw_data, data_text, temperature)


async def _quick_enhance(
    button_type: str,
    config: dict,
    raw_data: dict,
    data_text: str,
    temperature: float,
) -> dict[str, Any]:
    """Single upgraded call for quick mode."""
    prompt_template = config["quick_prompt"]
    max_tokens = config.get("quick_max_tokens", 512)

    # Build format kwargs from raw_data + data_text
    fmt = _build_format_kwargs(raw_data, data_text)

    try:
        prompt = prompt_template.format(**fmt)
    except KeyError as e:
        logger.warning("Prompt format error for %s: %s", button_type, e)
        prompt = prompt_template.replace("{data}", data_text)

    analysis = await _rotated_call(
        prompt=prompt,
        max_tokens=max_tokens,
        temperature=temperature,
    )

    return {"ai_analysis": analysis, "ai_metadata": None}


async def _deep_pipeline(
    button_type: str,
    config: dict,
    raw_data: dict,
    data_text: str,
    temperature: float,
) -> dict[str, Any]:
    """3-stage deep pipeline: primary → critique → synthesis."""
    deep_max_tokens = config.get("deep_max_tokens", 1536)
    fmt = _build_format_kwargs(raw_data, data_text)

    # Stage 1: Primary analysis
    primary_template = config.get("deep_primary", config["quick_prompt"])
    try:
        primary_prompt = primary_template.format(**fmt)
    except KeyError:
        primary_prompt = primary_template.replace("{data}", data_text)

    primary_analysis = await _rotated_call(
        prompt=primary_prompt,
        max_tokens=deep_max_tokens,
        temperature=temperature,
    )

    if not primary_analysis:
        return {"ai_analysis": "", "ai_metadata": None}

    # Stage 2: Critique (using universal critique prompt)
    critique_prompt = DEEP_CRITIQUE_UNIVERSAL.format(
        primary_analysis=_truncate(primary_analysis, 3000),
        data=_truncate(data_text, 2000),
    )
    critique = await _rotated_call(
        prompt=critique_prompt,
        max_tokens=768,
        temperature=0.3,  # Lower temp for critique = more precise
    )

    # Stage 3: Synthesis
    synthesis_prompt = DEEP_SYNTHESIS_UNIVERSAL.format(
        primary_analysis=_truncate(primary_analysis, 3000),
        critique=_truncate(critique, 2000),
    )
    synthesis = await _rotated_call(
        prompt=synthesis_prompt,
        max_tokens=deep_max_tokens,
        temperature=temperature,
    )

    # Build metadata from the pipeline
    ai_metadata = {
        "mode": "deep",
        "stages": {
            "primary": primary_analysis,
            "critique": critique,
        },
    }

    return {
        "ai_analysis": synthesis or primary_analysis,
        "ai_metadata": ai_metadata,
    }


def _build_format_kwargs(raw_data: dict, data_text: str) -> dict[str, str]:
    """Build a dict of format kwargs that covers all possible prompt placeholders."""
    return {
        "data": data_text,
        "name": str(raw_data.get("name", raw_data.get("symbol", ""))),
        "stock": str(raw_data.get("stock", raw_data.get("symbol", raw_data.get("name", "")))),
        "scan_type": str(raw_data.get("scan_type", "")),
        "text": str(raw_data.get("text", data_text)),
    }
