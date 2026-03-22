"""
Structured response metadata builder for Stocky AI.
Attaches action tags, confidence scores, payoff boxes, and thesis killers
to handler responses.
"""

import re
import logging

logger = logging.getLogger(__name__)

TAG_COLORS = {
    "BUY": "#22c55e",
    "HOLD": "#eab308",
    "SELL": "#ef4444",
    "ALERT": "#3b82f6",
    "WATCH": "#9ca3af",
}


def build_structured_meta(
    action_tag: str = "WATCH",
    confidence: int = 50,
    confidence_reason: str = "",
    payoff_box: dict | None = None,
    thesis_killers: list[str] | None = None,
    sources: list[dict] | None = None,
) -> dict:
    """
    Build structured metadata dict to attach to handler response data.

    action_tag: BUY | HOLD | SELL | ALERT | WATCH
    confidence: 0-100
    payoff_box: {upside: str, downside: str, asymmetry: str}
    thesis_killers: list of strings
    sources: [{name: str, freshness: str}]
    """
    valid_tags = set(TAG_COLORS.keys())
    tag = action_tag.upper() if action_tag.upper() in valid_tags else "WATCH"

    return {
        "action_tag": tag,
        "action_color": TAG_COLORS[tag],
        "confidence": max(0, min(100, confidence)),
        "confidence_reasoning": confidence_reason or f"Confidence {confidence}%",
        "payoff_box": payoff_box or {
            "upside": "Not assessed",
            "downside": "Not assessed",
            "asymmetry": "N/A",
        },
        "thesis_killers": thesis_killers or [],
        "sources": sources or [{"name": "Stocky AI", "freshness": "Live"}],
    }


def parse_structured_from_ai(ai_text: str) -> dict:
    """
    Extract structured meta from AI-generated text that includes
    action tags, confidence, thesis killers etc.
    """
    if not ai_text:
        return {}

    meta: dict = {}

    # Action tag
    tag_match = re.search(r"\b(BUY|SELL|HOLD|ALERT|WATCH)\b", ai_text.upper())
    if tag_match:
        meta["action_tag"] = tag_match.group(1)

    # Confidence
    conf_match = re.search(r"confidence[:\s]*(\d{1,3})%?", ai_text, re.IGNORECASE)
    if conf_match:
        meta["confidence"] = int(conf_match.group(1))

    # Confidence reasoning
    reason_match = re.search(
        r"confidence[:\s]*\d{1,3}%?\s*[-—:]\s*(.+?)(?:\n|$)", ai_text, re.IGNORECASE
    )
    if reason_match:
        meta["confidence_reason"] = reason_match.group(1).strip()

    # Thesis killers
    killers = re.findall(
        r"(?:thesis killer|risk|invalidat\w+)[:\s]*(.+?)(?:\n|$)",
        ai_text,
        re.IGNORECASE,
    )
    if killers:
        meta["thesis_killers"] = [k.strip().strip("-* ") for k in killers[:5] if k.strip()]

    # Payoff box
    upside_match = re.search(r"upside[:\s]*(.+?)(?:\n|$)", ai_text, re.IGNORECASE)
    downside_match = re.search(r"downside[:\s]*(.+?)(?:\n|$)", ai_text, re.IGNORECASE)
    asymmetry_match = re.search(r"asymmetry[:\s]*(.+?)(?:\n|$)", ai_text, re.IGNORECASE)
    if upside_match or downside_match:
        meta["payoff_box"] = {
            "upside": upside_match.group(1).strip() if upside_match else "N/A",
            "downside": downside_match.group(1).strip() if downside_match else "N/A",
            "asymmetry": asymmetry_match.group(1).strip() if asymmetry_match else "N/A",
        }

    return meta


# Schema hint for structured AI responses
STRUCTURED_SCHEMA_HINT = """{
    "verdict": "string (2-4 sentence analysis)",
    "action_tag": "BUY | HOLD | SELL | ALERT | WATCH",
    "confidence": 0-100,
    "confidence_reason": "string (1 sentence)",
    "upside": "string (e.g. '15% to target 2800')",
    "downside": "string (e.g. '8% to support 2200')",
    "asymmetry": "string (e.g. '1.9:1 favorable')",
    "thesis_killers": ["string", "string"],
    "sources_used": ["NSE India", "yfinance"]
}"""
