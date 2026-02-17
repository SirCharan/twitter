import asyncio
import logging
from datetime import datetime

from telegram import Update
from telegram.ext import ContextTypes

from bot.auth_check import authorized
from bot.database import log_api_call

logger = logging.getLogger(__name__)


def _fetch_nse_overview() -> dict:
    """Fetch market overview from nsetools. Returns dict with sections."""
    from nsetools import Nse
    nse = Nse()

    result = {
        "indices": [],
        "gainers": [],
        "losers": [],
        "advances_declines": None,
    }

    # Index quotes
    for idx_name in ["NIFTY 50", "NIFTY BANK", "NIFTY IT", "NIFTY FIN SERVICE"]:
        try:
            q = nse.get_index_quote(idx_name)
            if q:
                result["indices"].append({
                    "name": idx_name,
                    "value": q.get("lastPrice", 0),
                    "change": q.get("change", 0),
                    "pct_change": q.get("pChange", 0),
                })
        except Exception:
            pass

    # Top gainers/losers
    try:
        gainers = nse.get_top_gainers()
        if gainers:
            result["gainers"] = gainers[:5]
    except Exception:
        pass

    try:
        losers = nse.get_top_losers()
        if losers:
            result["losers"] = losers[:5]
    except Exception:
        pass

    # Advances/declines
    try:
        ad = nse.get_advances_declines()
        if ad:
            total_adv = sum(int(x.get("advances", 0)) for x in ad)
            total_dec = sum(int(x.get("declines", 0)) for x in ad)
            total_unch = sum(int(x.get("unchanged", 0)) for x in ad)
            result["advances_declines"] = {
                "advances": total_adv,
                "declines": total_dec,
                "unchanged": total_unch,
            }
    except Exception:
        pass

    return result


def _fetch_kite_indices(kite_client) -> list[dict]:
    """Fetch index data from Kite Connect as fallback/supplement."""
    indices = []
    try:
        instruments = [
            "NSE:NIFTY 50", "NSE:NIFTY BANK",
        ]
        data = kite_client.ltp(instruments)
        for inst, info in data.items():
            name = inst.replace("NSE:", "")
            indices.append({
                "name": name,
                "value": info.get("last_price", 0),
                "change": 0,
                "pct_change": 0,
            })
    except Exception:
        pass
    return indices


def _format_overview(data: dict) -> str:
    """Format market overview data into a Telegram message."""
    now = datetime.now().strftime("%d %b %Y, %H:%M")
    lines = [f"<b>Market Overview</b> ({now})", f"{'=' * 30}", ""]

    # Indices
    if data["indices"]:
        lines.append("<b>INDICES</b>")
        for idx in data["indices"]:
            val = idx["value"]
            chg = idx["change"]
            pct = idx["pct_change"]
            sign = "+" if chg >= 0 else ""
            name = idx["name"]
            # Shorten names
            name = name.replace("NIFTY FIN SERVICE", "FINNIFTY").replace("NIFTY BANK", "BANKNIFTY").replace("NIFTY 50", "NIFTY")
            lines.append(f"  {name}: {val:,.2f} ({sign}{chg:,.2f} / {sign}{pct:.2f}%)")
        lines.append("")

    # Market breadth
    ad = data.get("advances_declines")
    if ad:
        total = ad["advances"] + ad["declines"] + ad["unchanged"]
        if total > 0:
            adv_pct = ad["advances"] / total * 100
            lines.append("<b>BREADTH</b>")
            bar_len = 20
            adv_bars = round(adv_pct / 100 * bar_len)
            dec_bars = bar_len - adv_bars
            bar = "+" * adv_bars + "-" * dec_bars
            lines.append(f"  [{bar}]")
            lines.append(f"  Adv: {ad['advances']} | Dec: {ad['declines']} | Unch: {ad['unchanged']}")
            lines.append("")

    # Top gainers
    if data["gainers"]:
        lines.append("<b>TOP GAINERS</b>")
        for g in data["gainers"][:5]:
            sym = g.get("symbol", "?")
            ltp = g.get("ltp", g.get("lastCorpAnnouncementDate", 0))
            pct = g.get("netPrice", g.get("pChange", 0))
            try:
                ltp_val = float(g.get("ltp", 0))
                pct_val = float(pct)
                lines.append(f"  {sym}: {ltp_val:,.2f} (+{pct_val:.2f}%)")
            except (ValueError, TypeError):
                lines.append(f"  {sym}: +{pct}%")
        lines.append("")

    # Top losers
    if data["losers"]:
        lines.append("<b>TOP LOSERS</b>")
        for l in data["losers"][:5]:
            sym = l.get("symbol", "?")
            pct = l.get("netPrice", l.get("pChange", 0))
            try:
                ltp_val = float(l.get("ltp", 0))
                pct_val = float(pct)
                lines.append(f"  {sym}: {ltp_val:,.2f} ({pct_val:.2f}%)")
            except (ValueError, TypeError):
                lines.append(f"  {sym}: {pct}%")
        lines.append("")

    if len(lines) <= 3:
        return "<b>Market Overview</b>\n\nCouldn't fetch market data right now. NSE may be down or markets are closed."

    return "\n".join(lines)


@authorized
async def overview_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show market overview: indices, gainers/losers, breadth."""
    await update.message.reply_text("Fetching market overview...")

    loop = asyncio.get_event_loop()
    await log_api_call("nse", "overview")

    try:
        data = await loop.run_in_executor(None, _fetch_nse_overview)
    except Exception as e:
        logger.error(f"NSE overview failed: {e}")
        await update.message.reply_text(f"Failed to fetch market data: {e}")
        return

    message = _format_overview(data)

    if len(message) > 4090:
        message = message[:4087] + "..."

    await update.message.reply_text(message, parse_mode="HTML")
