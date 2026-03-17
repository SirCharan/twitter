"""PDF export handler — generate PDF reports from card data."""

import io
import logging
from datetime import datetime

from fpdf import FPDF

logger = logging.getLogger(__name__)


async def generate_pdf(card_type: str, data: dict) -> bytes:
    """Generate a PDF report from card data. Returns PDF bytes."""
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    # Header
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 12, "Stocky AI Report", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(128, 128, 128)
    pdf.cell(0, 6, f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M')} | {card_type.replace('_', ' ').title()}", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(8)
    pdf.set_text_color(0, 0, 0)

    # Dispatch to card-specific renderer
    renderer = RENDERERS.get(card_type, _render_generic)
    renderer(pdf, data)

    # Disclaimer footer
    pdf.ln(10)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(128, 128, 128)
    pdf.multi_cell(0, 4, (
        "Disclaimer: This is AI-generated analysis for informational purposes only. "
        "Not financial advice. Verify all data independently before making investment decisions."
    ))

    return pdf.output()


def _render_analysis(pdf: FPDF, data: dict):
    """Render stock analysis card."""
    symbol = data.get("symbol", data.get("name", "Unknown"))
    score = data.get("overall_score", "N/A")

    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 8, f"{symbol} — Score: {score}/30", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # Fundamental
    fund = data.get("fundamental", {})
    if fund:
        _section(pdf, "Fundamental Analysis", f"Score: {fund.get('score', 'N/A')}/10")
        metrics = [
            ("P/E", fund.get("pe")), ("ROE", fund.get("roe")),
            ("D/E", fund.get("de")), ("Profit Margin", fund.get("profit_margin")),
        ]
        for label, val in metrics:
            if val is not None:
                pdf.cell(45, 5, f"{label}: {val}", new_x="RIGHT")
        pdf.ln(8)

    # Technical
    tech = data.get("technical", {})
    if tech:
        _section(pdf, "Technical Analysis", f"Score: {tech.get('score', 'N/A')}/10")
        metrics = [
            ("RSI", tech.get("rsi")), ("MACD", tech.get("macd_signal")),
            ("SMA Signal", tech.get("sma_signal")),
        ]
        for label, val in metrics:
            if val is not None:
                pdf.cell(60, 5, f"{label}: {val}", new_x="RIGHT")
        pdf.ln(8)

    # Verdict
    verdict = data.get("verdict", "")
    if verdict:
        _section(pdf, "Verdict")
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(0, 5, _clean_text(verdict))


def _render_compare(pdf: FPDF, data: dict):
    """Render stock comparison."""
    stocks = data.get("stocks", [])
    if not stocks:
        pdf.cell(0, 8, "No comparison data", new_x="LMARGIN", new_y="NEXT")
        return

    _section(pdf, "Stock Comparison")

    # Table header
    pdf.set_font("Helvetica", "B", 9)
    col_w = 35
    pdf.cell(col_w, 6, "Metric", border=1)
    for s in stocks:
        pdf.cell(col_w, 6, s.get("symbol", "?"), border=1, align="C")
    pdf.ln()

    # Metrics
    pdf.set_font("Helvetica", "", 9)
    for metric in ["pe", "roe", "earnings_growth", "profit_margin"]:
        label = metric.replace("_", " ").title()
        pdf.cell(col_w, 5, label, border=1)
        for s in stocks:
            val = s.get(metric, "N/A")
            pdf.cell(col_w, 5, str(val) if val is not None else "N/A", border=1, align="C")
        pdf.ln()

    # Verdict
    verdict = data.get("ai_verdict", "")
    if verdict:
        pdf.ln(4)
        _section(pdf, "Verdict")
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(0, 5, _clean_text(verdict))


def _render_earnings(pdf: FPDF, data: dict):
    """Render earnings calendar."""
    _section(pdf, "Upcoming Earnings")
    for e in data.get("upcoming", []):
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 5, f"{e.get('date', '?')} — {e.get('symbol', '?')} (EPS est: {e.get('estimate_eps', 'N/A')})", new_x="LMARGIN", new_y="NEXT")

    if data.get("ai_analysis"):
        pdf.ln(4)
        _section(pdf, "Analysis")
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(0, 5, _clean_text(data["ai_analysis"]))


def _render_generic(pdf: FPDF, data: dict):
    """Generic renderer — dump key-value pairs."""
    pdf.set_font("Helvetica", "", 10)
    for key, val in data.items():
        if key in ("disclaimer", "ai_analysis", "ai_mood"):
            continue
        if isinstance(val, (list, dict)):
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(0, 6, f"{key.replace('_', ' ').title()}:", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("Helvetica", "", 9)
            if isinstance(val, list):
                for item in val[:10]:
                    pdf.multi_cell(0, 4, f"  {str(item)[:150]}")
            else:
                for k, v in val.items():
                    pdf.cell(0, 4, f"  {k}: {v}", new_x="LMARGIN", new_y="NEXT")
        else:
            pdf.cell(0, 5, f"{key.replace('_', ' ').title()}: {val}", new_x="LMARGIN", new_y="NEXT")

    # AI analysis at end
    ai = data.get("ai_analysis") or data.get("ai_mood")
    if ai:
        pdf.ln(4)
        _section(pdf, "AI Analysis")
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(0, 5, _clean_text(ai))


def _section(pdf: FPDF, title: str, subtitle: str = ""):
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(201, 169, 110)  # Gold accent
    pdf.cell(0, 7, title, new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    if subtitle:
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 5, subtitle, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)


def _clean_text(text: str) -> str:
    """Clean text for PDF rendering — remove markdown markers."""
    import re
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"#{1,3}\s*", "", text)
    text = text.replace("•", "-")
    return text.strip()


RENDERERS = {
    "analysis": _render_analysis,
    "compare": _render_compare,
    "earnings": _render_earnings,
    "deep_research": _render_analysis,  # Same structure
    "dividends": _render_generic,
    "sectors": _render_generic,
    "valuation": _render_generic,
}
