import asyncio
import base64
import logging
from io import BytesIO

import yfinance as yf

from app.handlers.analyse import _resolve_symbol, _validate_yf_ticker

logger = logging.getLogger(__name__)


async def generate_chart(stock: str, chart_type: str) -> dict:
    """Generate a chart response for the given stock."""
    loop = asyncio.get_event_loop()
    yf_symbol, nse_symbol, _ = _resolve_symbol(stock)
    valid = await loop.run_in_executor(None, _validate_yf_ticker, yf_symbol)
    if valid:
        yf_symbol = valid

    if chart_type == "tradingview":
        return {
            "type": "tradingview",
            "symbol": f"NSE:{nse_symbol}",
            "stock": nse_symbol,
        }
    else:
        image_b64 = await loop.run_in_executor(None, _make_analysis_chart, yf_symbol, nse_symbol)
        return {
            "type": "image",
            "image_b64": image_b64,
            "stock": nse_symbol,
        }


def _make_analysis_chart(yf_symbol: str, nse_symbol: str) -> str:
    """Generate a dark-theme 4-panel analysis chart. Returns base64 PNG."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import matplotlib.gridspec as gridspec
    import matplotlib.dates as mdates

    ticker = yf.Ticker(yf_symbol)
    hist = ticker.history(period="6mo")
    if hist.empty or len(hist) < 10:
        raise ValueError("Not enough data")

    closes = hist["Close"]
    volumes = hist["Volume"]

    # RSI
    delta = closes.diff()
    gain = delta.clip(lower=0).ewm(span=14, adjust=False).mean()
    loss = (-delta.clip(upper=0)).ewm(span=14, adjust=False).mean()
    rsi = 100 - (100 / (1 + gain / loss.replace(0, 1e-9)))

    # MACD
    ema12 = closes.ewm(span=12, adjust=False).mean()
    ema26 = closes.ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    macd_hist = macd_line - signal_line

    # SMAs
    sma20 = closes.rolling(20).mean()
    sma50 = closes.rolling(50).mean()

    # Colours
    BG = "#111111"
    FG = "#F5F0EB"
    GOLD = "#C9A96E"
    GREEN = "#4ADE80"
    RED = "#F87171"
    MUTED = "#555555"

    fig = plt.figure(figsize=(14, 10), facecolor=BG)
    gs = gridspec.GridSpec(4, 1, height_ratios=[3, 1, 1, 1], hspace=0.05)

    # Price
    ax1 = fig.add_subplot(gs[0])
    ax1.set_facecolor(BG)
    ax1.plot(closes.index, closes, color=GOLD, linewidth=1.5, label="Price", zorder=3)
    ax1.plot(closes.index, sma20, color=GREEN, linewidth=0.8, alpha=0.7, label="SMA20")
    ax1.plot(closes.index, sma50, color=RED, linewidth=0.8, alpha=0.7, label="SMA50")
    ax1.fill_between(closes.index, closes, float(closes.min()), alpha=0.04, color=GOLD)
    ax1.set_title(f"{nse_symbol} — 6 Month Analysis", color=FG, fontsize=12, pad=10)
    ax1.legend(loc="upper left", framealpha=0, labelcolor=MUTED, fontsize=8)
    ax1.tick_params(colors=MUTED, labelbottom=False, labelsize=8)
    for spine in ax1.spines.values():
        spine.set_color(MUTED); spine.set_alpha(0.25)
    ax1.set_ylabel("Price (₹)", color=MUTED, fontsize=8)
    ax1.grid(axis="y", color=MUTED, alpha=0.08)

    # Volume
    ax2 = fig.add_subplot(gs[1], sharex=ax1)
    ax2.set_facecolor(BG)
    bar_clr = [GREEN if closes.iloc[i] >= closes.iloc[i - 1] else RED for i in range(len(closes))]
    ax2.bar(volumes.index, volumes, color=bar_clr, alpha=0.55, width=1.5)
    ax2.set_ylabel("Volume", color=MUTED, fontsize=8)
    ax2.tick_params(colors=MUTED, labelbottom=False, labelsize=7)
    for spine in ax2.spines.values():
        spine.set_color(MUTED); spine.set_alpha(0.25)
    ax2.grid(axis="y", color=MUTED, alpha=0.08)

    # RSI
    ax3 = fig.add_subplot(gs[2], sharex=ax1)
    ax3.set_facecolor(BG)
    ax3.plot(rsi.index, rsi, color=GOLD, linewidth=1)
    ax3.axhline(70, color=RED, linewidth=0.7, alpha=0.5, linestyle="--")
    ax3.axhline(30, color=GREEN, linewidth=0.7, alpha=0.5, linestyle="--")
    ax3.fill_between(rsi.index, rsi, 50, where=(rsi > 50), alpha=0.06, color=GREEN)
    ax3.fill_between(rsi.index, rsi, 50, where=(rsi < 50), alpha=0.06, color=RED)
    ax3.set_ylim(0, 100)
    ax3.set_ylabel("RSI", color=MUTED, fontsize=8)
    ax3.tick_params(colors=MUTED, labelbottom=False, labelsize=7)
    for spine in ax3.spines.values():
        spine.set_color(MUTED); spine.set_alpha(0.25)
    ax3.grid(axis="y", color=MUTED, alpha=0.08)

    # MACD
    ax4 = fig.add_subplot(gs[3], sharex=ax1)
    ax4.set_facecolor(BG)
    ax4.plot(macd_line.index, macd_line, color=GOLD, linewidth=1, label="MACD")
    ax4.plot(signal_line.index, signal_line, color=GREEN, linewidth=0.8, alpha=0.8)
    hbar_clr = [GREEN if v >= 0 else RED for v in macd_hist]
    ax4.bar(macd_hist.index, macd_hist, color=hbar_clr, alpha=0.45, width=1.5)
    ax4.axhline(0, color=MUTED, linewidth=0.4, alpha=0.5)
    ax4.set_ylabel("MACD", color=MUTED, fontsize=8)
    ax4.tick_params(colors=MUTED, labelcolor=MUTED, labelsize=7)
    ax4.xaxis.set_major_formatter(mdates.DateFormatter("%b"))
    for spine in ax4.spines.values():
        spine.set_color(MUTED); spine.set_alpha(0.25)
    ax4.grid(axis="y", color=MUTED, alpha=0.08)

    plt.tight_layout()
    buf = BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", facecolor=BG, dpi=130)
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode()
