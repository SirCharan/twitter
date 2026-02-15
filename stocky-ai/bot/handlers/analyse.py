import asyncio
import logging
import re

import feedparser
import numpy as np
import yfinance as yf
from telegram import Update
from telegram.ext import ContextTypes

from bot.auth_check import authorized
from bot.database import log_api_call
from bot import ai_client

logger = logging.getLogger(__name__)

# RSS feeds for Indian market news
NEWS_FEEDS = [
    ("MoneyControl", "https://www.moneycontrol.com/rss/MCtopnews.xml"),
    ("MoneyControl Stocks", "https://www.moneycontrol.com/rss/marketreports.xml"),
    ("LiveMint", "https://www.livemint.com/rss/markets"),
    ("ET Markets", "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms"),
]

POSITIVE_KEYWORDS = [
    "growth", "beat", "surge", "positive", "upgrade", "rally", "gain",
    "rise", "jump", "profit", "bullish", "buy", "outperform", "record",
    "strong", "boom", "recovery", "expand",
]
NEGATIVE_KEYWORDS = [
    "decline", "miss", "downgrade", "loss", "negative", "fall", "drop",
    "crash", "bearish", "sell", "underperform", "cut", "weak", "slump",
    "debt", "risk", "warning",
]

# Index aliases
INDEX_ALIASES = {
    "NIFTY": "^NSEI",
    "BANKNIFTY": "^NSEBANK",
    "SENSEX": "^BSESN",
    "NIFTYBANK": "^NSEBANK",
}

# Common multi-word/alternate names → NSE trading symbol
# When yfinance fails with the NSE ticker, we try BSE (.BO) as fallback
STOCK_NAME_MAP = {
    "TATA MOTORS": "TATAMOTORS",
    "TATA STEEL": "TATASTEEL",
    "TATA POWER": "TATAPOWER",
    "TATA CONSUMER": "TATACONSUM",
    "TATA CHEMICALS": "TATACHEM",
    "TATA ELXSI": "TATAELXSI",
    "TATA COMM": "TATACOMM",
    "HDFC BANK": "HDFCBANK",
    "HDFC LIFE": "HDFCLIFE",
    "HDFC AMC": "HDFCAMC",
    "ICICI BANK": "ICICIBANK",
    "ICICI PRU": "ICICIPRULI",
    "KOTAK BANK": "KOTAKBANK",
    "KOTAK MAHINDRA": "KOTAKBANK",
    "AXIS BANK": "AXISBANK",
    "STATE BANK": "SBIN",
    "SBI": "SBIN",
    "BHARTI AIRTEL": "BHARTIARTL",
    "AIRTEL": "BHARTIARTL",
    "BAJAJ FINANCE": "BAJFINANCE",
    "BAJAJ FINSERV": "BAJAJFINSV",
    "BAJAJ AUTO": "BAJAJ-AUTO",
    "MARUTI SUZUKI": "MARUTI",
    "MARUTI": "MARUTI",
    "HERO MOTO": "HEROMOTOCO",
    "HINDUSTAN UNILEVER": "HINDUNILVR",
    "HUL": "HINDUNILVR",
    "SUN PHARMA": "SUNPHARMA",
    "DR REDDY": "DRREDDY",
    "DR REDDYS": "DRREDDY",
    "ULTRA CEMENT": "ULTRACEMCO",
    "ULTRATECH": "ULTRACEMCO",
    "POWER GRID": "POWERGRID",
    "ASIAN PAINTS": "ASIANPAINT",
    "TECH MAHINDRA": "TECHM",
    "M&M": "M&M",
    "MAHINDRA": "M&M",
    "ADANI ENTERPRISES": "ADANIENT",
    "ADANI PORTS": "ADANIPORTS",
    "ADANI GREEN": "ADANIGREEN",
    "ADANI POWER": "ADANIPOWER",
    "L&T": "LT",
    "LARSEN": "LT",
    "NESTLE": "NESTLEIND",
    "NESTLE INDIA": "NESTLEIND",
    "BRITANNIA": "BRITANNIA",
    "COAL INDIA": "COALINDIA",
    "DIVIS LAB": "DIVISLAB",
    "EICHER MOTORS": "EICHERMOT",
    "GRASIM": "GRASIM",
    "CIPLA": "CIPLA",
    "WIPRO": "WIPRO",
    "INFOSYS": "INFY",
    "TCS": "TCS",
    "HCL TECH": "HCLTECH",
    "RELIANCE": "RELIANCE",
    "ITC": "ITC",
    "TITAN": "TITAN",
}

# News search: full company name for better matching
STOCK_FULL_NAMES = {
    "TATAMOTORS": "tata motors",
    "TATASTEEL": "tata steel",
    "RELIANCE": "reliance",
    "TCS": "tcs",
    "INFY": "infosys",
    "HDFCBANK": "hdfc bank",
    "ICICIBANK": "icici bank",
    "SBIN": "sbi",
    "BHARTIARTL": "airtel",
    "ITC": "itc",
    "KOTAKBANK": "kotak",
    "LT": "larsen",
    "HINDUNILVR": "hindustan unilever",
    "BAJFINANCE": "bajaj finance",
    "MARUTI": "maruti",
    "WIPRO": "wipro",
    "HCLTECH": "hcl tech",
    "AXISBANK": "axis bank",
    "TITAN": "titan",
    "SUNPHARMA": "sun pharma",
    "ADANIENT": "adani",
    "NTPC": "ntpc",
    "ONGC": "ongc",
    "POWERGRID": "power grid",
    "M&M": "mahindra",
    "TECHM": "tech mahindra",
    "TATAMOTORS": "tata motors",
}


def _resolve_symbol(user_input: str) -> tuple[str, str, list[str]]:
    """
    Returns (yf_symbol, nse_symbol, news_search_terms).
    Tries .NS first, falls back to .BO.
    """
    upper = user_input.upper().strip()

    # Index aliases
    if upper in INDEX_ALIASES:
        yf_sym = INDEX_ALIASES[upper]
        return yf_sym, upper, [upper.lower()]

    # Already has suffix
    if "." in upper or upper.startswith("^"):
        base = upper.split(".")[0]
        return upper, base, [base.lower()]

    # Check multi-word name map
    if upper in STOCK_NAME_MAP:
        nse_sym = STOCK_NAME_MAP[upper]
    else:
        # Strip spaces for single-word attempt
        nse_sym = upper.replace(" ", "")

    # Build news search terms
    news_terms = [nse_sym.lower(), upper.lower()]
    if nse_sym in STOCK_FULL_NAMES:
        news_terms.append(STOCK_FULL_NAMES[nse_sym])
    # Add original input words if multi-word
    if " " in user_input:
        news_terms.append(user_input.lower())

    # Deduplicate
    news_terms = list(dict.fromkeys(news_terms))

    yf_sym = f"{nse_sym}.NS"
    return yf_sym, nse_sym, news_terms


def _validate_yf_ticker(yf_symbol: str) -> str | None:
    """Try to validate ticker, fall back to .BO if .NS fails."""
    try:
        tk = yf.Ticker(yf_symbol)
        info = tk.info
        if info and info.get("regularMarketPrice") is not None:
            return yf_symbol
    except Exception:
        pass

    # Try BSE fallback
    if yf_symbol.endswith(".NS"):
        bo_symbol = yf_symbol.replace(".NS", ".BO")
        try:
            tk = yf.Ticker(bo_symbol)
            info = tk.info
            if info and info.get("regularMarketPrice") is not None:
                return bo_symbol
        except Exception:
            pass

    return None


# ---------------------------------------------------------------------------
# TECHNICAL SCORE — RSI, MACD, SMA Crossover, price momentum, volume
# ---------------------------------------------------------------------------

def _calculate_rsi(closes, period=14):
    delta = closes.diff()
    gain = delta.where(delta > 0, 0).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi


def _get_technical_data(yf_symbol: str) -> tuple[str, float]:
    """RSI + MACD + SMA crossover + price changes + volume."""
    try:
        df = yf.download(yf_symbol, period="1y", interval="1d", progress=False)
    except Exception:
        return "Technical data not available.", 5.0

    if df.empty or len(df) < 30:
        return "Could not fetch price data from Yahoo Finance.", 5.0

    # Flatten multi-level columns if present
    if hasattr(df.columns, "levels") and df.columns.nlevels > 1:
        df.columns = df.columns.get_level_values(0)

    closes = df["Close"]
    current = float(closes.iloc[-1])
    lines = [f"Price: {current:,.2f}"]

    # --- RSI ---
    rsi_val = None
    if len(closes) >= 15:
        rsi_series = _calculate_rsi(closes)
        rsi_val = float(rsi_series.iloc[-1])
        if rsi_val > 70:
            rsi_label = "Overbought"
        elif rsi_val < 30:
            rsi_label = "Oversold"
        else:
            rsi_label = "Neutral"
        lines.append(f"RSI(14): {rsi_val:.1f} ({rsi_label})")

    if rsi_val is not None:
        if rsi_val <= 30:
            rsi_score = 0.0  # Oversold = bearish momentum
        elif rsi_val >= 70:
            rsi_score = 10.0  # Overbought = bullish momentum
        else:
            rsi_score = max(0, min(10, (rsi_val - 30) * (10 / 40)))
    else:
        rsi_score = 5.0

    # --- MACD ---
    macd_score = 5.0
    if len(closes) >= 26:
        ema12 = closes.ewm(span=12, adjust=False).mean()
        ema26 = closes.ewm(span=26, adjust=False).mean()
        macd = ema12 - ema26
        signal = macd.ewm(span=9, adjust=False).mean()
        macd_diff = float(macd.iloc[-1] - signal.iloc[-1])

        if macd_diff > 0:
            lines.append(f"MACD: Bullish (+{macd_diff:.2f})")
        else:
            lines.append(f"MACD: Bearish ({macd_diff:.2f})")

        macd_max = float(np.abs(macd).max())
        if macd_max > 0:
            macd_score = 5 + (macd_diff / macd_max * 5)
            macd_score = max(0, min(10, macd_score))

    # --- SMA 50/200 Crossover ---
    sma_score = 5.0
    if len(closes) >= 200:
        sma50 = float(closes.rolling(50).mean().iloc[-1])
        sma200 = float(closes.rolling(200).mean().iloc[-1])
        sma_ratio = sma50 / sma200 if sma200 != 0 else 1.0

        if sma50 > sma200:
            lines.append(f"SMA: Golden Cross (50D:{sma50:,.0f} > 200D:{sma200:,.0f})")
        else:
            lines.append(f"SMA: Death Cross (50D:{sma50:,.0f} < 200D:{sma200:,.0f})")

        sma_score = max(0, min(10, (sma_ratio - 0.9) * 100))
    elif len(closes) >= 50:
        sma50 = float(closes.rolling(50).mean().iloc[-1])
        above = current > sma50
        lines.append(f"50D SMA: {sma50:,.2f} ({'above' if above else 'below'})")
        sma_score = 7.0 if above else 3.0

    # --- Price Changes + Momentum Score ---
    # Trend-following: recent price going up = bullish, down = bearish
    change_parts = []
    momentum_scores = []
    for label, days, weight in [("1D", 2, 0.1), ("1W", 5, 0.3), ("1M", 22, 0.4), ("3M", 66, 0.2)]:
        if len(closes) >= days:
            ref = float(closes.iloc[-days])
            chg = (current - ref) / ref * 100
            sign = "+" if chg >= 0 else ""
            change_parts.append(f"{label}: {sign}{chg:.1f}%")
            # Score: +10% change → 10, -10% → 0, 0% → 5
            m = max(0, min(10, 5 + chg / 2))
            momentum_scores.append((m, weight))
    if change_parts:
        lines.append(" | ".join(change_parts))

    momentum_score = 5.0
    if momentum_scores:
        total_w = sum(w for _, w in momentum_scores)
        momentum_score = sum(s * w for s, w in momentum_scores) / total_w
        momentum_score = max(0, min(10, momentum_score))

    # --- 52W Range ---
    high_52 = float(closes.max())
    low_52 = float(closes.min())
    if high_52 != low_52:
        pos = (current - low_52) / (high_52 - low_52) * 100
        lines.append(f"52W: {low_52:,.0f} - {high_52:,.0f} (at {pos:.0f}%)")

    # --- Volume ---
    if "Volume" in df.columns and len(df) >= 20:
        vol_5d = float(df["Volume"].tail(5).mean())
        vol_20d = float(df["Volume"].tail(20).mean())
        if vol_20d > 0:
            vol_ratio = vol_5d / vol_20d
            if vol_ratio > 1.3:
                lines.append(f"Vol: {vol_ratio:.1f}x avg (high)")
            elif vol_ratio < 0.7:
                lines.append(f"Vol: {vol_ratio:.1f}x avg (low)")

    # Trend-following tech score: RSI + MACD + SMA + Momentum
    tech_score = round((rsi_score + macd_score + sma_score + momentum_score) / 4, 1)
    tech_score = max(0, min(10, tech_score))
    return "\n".join(lines), tech_score


# ---------------------------------------------------------------------------
# FUNDAMENTAL SCORE
# ---------------------------------------------------------------------------

def _get_fundamental_data(ticker: yf.Ticker) -> tuple[str, float]:
    info = ticker.info
    if not info or info.get("regularMarketPrice") is None:
        return "Fundamental data not available on Yahoo Finance.", 5.0

    lines = []

    # Sector
    sector = info.get("sector")
    industry = info.get("industry", "")
    if sector:
        lines.append(f"Sector: {sector}" + (f" ({industry})" if industry else ""))

    # Market Cap
    mcap = info.get("marketCap")
    if mcap:
        if mcap >= 1e12:
            lines.append(f"Mkt Cap: Rs.{mcap/1e12:.2f}T")
        elif mcap >= 1e9:
            lines.append(f"Mkt Cap: Rs.{mcap/1e9:.2f}B")
        elif mcap >= 1e6:
            lines.append(f"Mkt Cap: Rs.{mcap/1e6:.0f}M")

    # P/E
    pe = info.get("trailingPE")
    fwd_pe = info.get("forwardPE")
    pe_score = 5.0
    if pe:
        lines.append(f"P/E (TTM): {pe:.2f}")
        pe_score = max(0, min(10, 10 - (pe - 15) * (10 / 15) if pe > 15 else 10))
    if fwd_pe:
        improving = " (improving)" if pe and fwd_pe < pe else ""
        lines.append(f"P/E (Fwd): {fwd_pe:.2f}{improving}")

    # ROE
    roe = info.get("returnOnEquity")
    roe_score = 5.0
    if roe:
        roe_pct = roe * 100
        lines.append(f"ROE: {roe_pct:.1f}%")
        roe_score = max(0, min(10, (roe_pct - 5) * (10 / 15) if roe_pct > 5 else 0))

    # D/E
    de = info.get("debtToEquity")
    de_score = 5.0
    if de is not None:
        de_ratio = de / 100
        lines.append(f"Debt/Equity: {de_ratio:.2f}")
        de_score = max(0, min(10, 10 - (de_ratio - 0.5) * (10 / 1.5) if de_ratio > 0.5 else 10))

    # EPS Growth
    growth_score = 5.0
    earn_growth = info.get("earningsGrowth")
    if earn_growth:
        eg_pct = earn_growth * 100
        lines.append(f"Earnings Growth: {'+' if eg_pct >= 0 else ''}{eg_pct:.1f}%")
        growth_score = max(0, min(10, (eg_pct / 15) * 10 if eg_pct > 0 else max(0, 5 + eg_pct / 10)))

    # Revenue Growth
    rev_growth = info.get("revenueGrowth")
    if rev_growth:
        rg_pct = rev_growth * 100
        lines.append(f"Revenue Growth: {'+' if rg_pct >= 0 else ''}{rg_pct:.1f}%")

    # Margins, Book Value, P/B, Dividend
    margin = info.get("profitMargins")
    if margin:
        lines.append(f"Profit Margin: {margin*100:.1f}%")
    bv = info.get("bookValue")
    if bv:
        lines.append(f"Book Value: {bv:,.2f}")
    pb = info.get("priceToBook")
    if pb:
        lines.append(f"P/B: {pb:.2f}")
    div_yield = info.get("dividendYield")
    if div_yield and div_yield > 0:
        lines.append(f"Div Yield: {div_yield*100:.2f}%")

    fund_score = round((pe_score + roe_score + de_score + growth_score) / 4, 1)
    fund_score = max(0, min(10, fund_score))

    text = "\n".join(lines) if lines else "No fundamental data available."
    return text, fund_score


# ---------------------------------------------------------------------------
# NEWS SCORE — RSS with per-article sentiment, better matching
# ---------------------------------------------------------------------------

def _get_news_data(search_terms: list[str]) -> tuple[str, float]:
    """Fetch RSS, filter by stock using search_terms, score sentiment."""
    # Build word-boundary regex patterns for precise matching
    patterns = []
    for term in search_terms:
        if len(term) <= 3:
            # Short terms (TCS, ITC, SBI) need word boundaries
            patterns.append(re.compile(r"\b" + re.escape(term) + r"\b", re.IGNORECASE))
        else:
            patterns.append(re.compile(re.escape(term), re.IGNORECASE))

    relevant = []
    sentiments = []

    for feed_name, feed_url in NEWS_FEEDS:
        try:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries[:30]:
                title = entry.get("title", "")
                summary = entry.get("summary", "") or entry.get("description", "") or ""
                text = title + " " + summary

                if any(p.search(text) for p in patterns):
                    text_lower = text.lower()
                    pos_count = sum(1 for kw in POSITIVE_KEYWORDS if kw in text_lower)
                    neg_count = sum(1 for kw in NEGATIVE_KEYWORDS if kw in text_lower)
                    total = pos_count + neg_count + 1
                    sentiment = (pos_count - neg_count) / total

                    sentiments.append(sentiment)
                    pub_date = ""
                    if hasattr(entry, "published"):
                        pub_date = entry.published[:16]
                    relevant.append({
                        "source": feed_name,
                        "title": title,
                        "date": pub_date,
                        "sentiment": sentiment,
                    })
        except Exception as e:
            logger.debug(f"Failed to parse {feed_name}: {e}")

    if not relevant:
        return "No recent news found.", 5.0

    avg_sentiment = sum(sentiments) / len(sentiments)
    news_score = round(5 + (avg_sentiment * 5), 1)
    news_score = max(0, min(10, news_score))

    lines = [f"Found {len(relevant)} article(s)\n"]
    for item in relevant[:5]:
        sent = item["sentiment"]
        icon = "+" if sent > 0.1 else ("-" if sent < -0.1 else "~")
        date = f" ({item['date']})" if item["date"] else ""
        lines.append(f"[{icon}] [{item['source']}]{date}\n{item['title']}")

    return "\n\n".join(lines), news_score


# ---------------------------------------------------------------------------
# SCORE DISPLAY
# ---------------------------------------------------------------------------

def _score_bar(score: float, max_score: int = 10) -> str:
    """Score bar. max_score=10 for individual, 30 for overall."""
    s = round(score * 10 / max_score)  # normalize to 0-10 for bar
    s = max(0, min(10, s))
    bar = "=" * s + "-" * (10 - s)
    if max_score == 30:
        if score >= 21:
            label = "Bullish"
        elif score >= 12:
            label = "Neutral"
        elif score >= 6:
            label = "Bearish"
        else:
            label = "Very Bearish"
    else:
        if score >= 7:
            label = "Bullish"
        elif score >= 4:
            label = "Neutral"
        elif score >= 2:
            label = "Bearish"
        else:
            label = "Very Bearish"
    return f"[{bar}] {score:.1f}/{max_score} ({label})"


# ---------------------------------------------------------------------------
# HANDLER
# ---------------------------------------------------------------------------

@authorized
async def analyse(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Analyse a stock: /analyse INFY"""
    args = context.args or []
    if not args:
        await update.message.reply_text("Give me a stock name. RELIANCE, INFY, TCS — anything.")
        return

    stock_input = " ".join(args)
    yf_symbol, nse_symbol, news_terms = _resolve_symbol(stock_input)

    await update.message.reply_text(f"Pulling data on {stock_input.upper()}...")

    loop = asyncio.get_event_loop()

    # Validate ticker (try .NS then .BO)
    await log_api_call("yfinance", "validate_ticker")
    valid_symbol = await loop.run_in_executor(None, _validate_yf_ticker, yf_symbol)
    if valid_symbol:
        yf_symbol = valid_symbol

    ticker = yf.Ticker(yf_symbol)

    # Run all three analyses
    await log_api_call("yfinance", "fundamental_data")
    fundamental_text, fundamental_score = await loop.run_in_executor(
        None, _get_fundamental_data, ticker
    )
    await log_api_call("yfinance", "technical_data")
    technical_text, technical_score = await loop.run_in_executor(
        None, _get_technical_data, yf_symbol
    )
    await log_api_call("rss", "news_feeds")
    news_text, news_score = await loop.run_in_executor(
        None, _get_news_data, news_terms
    )

    # Overall: sum of all three (0-30)
    overall = round(fundamental_score + technical_score + news_score, 1)

    # Company name
    try:
        name = ticker.info.get("longName") or ticker.info.get("shortName") or stock_input.upper()
    except Exception:
        name = stock_input.upper()

    # Stocky's verdict — try AI first, fall back to hardcoded
    data_summary = (
        f"Fundamental: {fundamental_score}/10\n{fundamental_text}\n\n"
        f"Technical: {technical_score}/10\n{technical_text}\n\n"
        f"News: {news_score}/10\n{news_text}\n\n"
        f"Overall: {overall}/30"
    )
    try:
        ai_verdict = await ai_client.analyse_verdict(name, data_summary)
    except Exception:
        ai_verdict = None

    if ai_verdict:
        verdict = ai_verdict
    elif overall >= 21:
        verdict = "Trend, fundamentals, sentiment — all pointing the same way. The payoff is asymmetric in your favour."
    elif overall >= 16:
        verdict = "More right than wrong here. Not a perfect setup, but the odds lean positive."
    elif overall >= 12:
        verdict = "No edge. Mixed signals across the board. Sitting this one out is a valid trade."
    elif overall >= 6:
        verdict = "The trend is against you. Fundamentals aren't saving it either. Bad risk-reward."
    else:
        verdict = "Everything is broken here. Trend, fundamentals, sentiment — all negative. Stay away."

    message = (
        f"<b>{name}</b>\n"
        f"<b>Overall: {_score_bar(overall, 30)}</b>\n"
        f"{'=' * 30}\n\n"
        f"<b>FUNDAMENTAL</b> {_score_bar(fundamental_score)}\n"
        f"{fundamental_text}\n\n"
        f"{'=' * 30}\n\n"
        f"<b>TECHNICAL</b> {_score_bar(technical_score)}\n"
        f"{technical_text}\n\n"
        f"{'=' * 30}\n\n"
        f"<b>NEWS</b> {_score_bar(news_score)}\n"
        f"{news_text}\n\n"
        f"{'=' * 30}\n"
        f"<b>Stocky's take:</b> {verdict}\n\n"
        f"<i>Not financial advice.</i>"
    )

    if len(message) > 4090:
        message = message[:4087] + "..."

    await update.message.reply_text(message, parse_mode="HTML")
