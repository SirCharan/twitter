import asyncio
import difflib
import logging
import re

import feedparser
import numpy as np
import yfinance as yf

from app import ai_client
from app.database import log_api_call

logger = logging.getLogger(__name__)

# RSS feeds for Indian market news
NEWS_FEEDS = [
    # Indian Markets & Business
    ("LiveMint Markets", "https://www.livemint.com/rss/markets"),
    ("LiveMint Companies", "https://www.livemint.com/rss/companies"),
    ("Mint Money", "https://www.livemint.com/rss/money"),
    ("ET Markets", "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms"),
    ("ET Stocks", "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms"),
    ("Moneycontrol", "https://www.moneycontrol.com/rss/latestnews.xml"),
    ("CNBC-TV18", "https://www.cnbctv18.com/commonfeeds/v1/cne/rss/market.xml"),
    ("CNBC-TV18 Buzz", "https://www.cnbctv18.com/commonfeeds/v1/cne/rss/market-buzz.xml"),
    ("Business Standard", "https://www.business-standard.com/rss/markets-106.rss"),
    ("NDTV Profit", "https://feeds.feedburner.com/ndtvprofit-latest"),
    ("Hindu BusinessLine", "https://www.thehindubusinessline.com/markets/feeder/default.rss"),
    ("The Hindu Business", "https://www.thehindu.com/business/feeder/default.rss"),
    ("Indian Express Biz", "https://indianexpress.com/section/business/feed/"),
    ("Business Today", "https://www.businesstoday.in/rss/home"),
    # Commodities
    ("ET Commodities", "https://economictimes.indiatimes.com/markets/commodities/rssfeeds/1808152900.cms"),
    ("MC Commodities", "https://www.moneycontrol.com/rss/commodities.xml"),
    # Global / US Markets
    ("Reuters", "https://www.reutersagency.com/feed/"),
    ("BBC World", "https://feeds.bbci.co.uk/news/world/rss.xml"),
    ("CNBC US", "https://www.cnbc.com/id/10000664/device/rss/rss.html"),
    ("MarketWatch", "https://feeds.marketwatch.com/marketwatch/topstories"),
    ("Yahoo Finance US", "https://finance.yahoo.com/rss/topstories"),
    # Global / Premium (Tier 1)
    ("Bloomberg", "https://feeds.bloomberg.com/markets/news.rss"),
    ("AP Business", "https://rsshub.app/apnews/topics/business"),
    ("Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml"),
    ("CNBC Top News", "https://www.cnbc.com/id/100003114/device/rss/rss.html"),
    # Energy & Metals
    ("OilPrice", "https://oilprice.com/rss/main"),
    ("Kitco Gold", "https://www.kitco.com/rss/gold.xml"),
    ("Rigzone", "https://www.rigzone.com/news/rss/rigzone_latest.aspx"),
    ("Mining.com", "https://www.mining.com/feed/"),
    ("FT Commodities", "https://www.ft.com/rss/commodities"),
    # Asia-Pacific
    ("Nikkei Asia", "https://asia.nikkei.com/rss"),
    ("SCMP", "https://www.scmp.com/rss/91/feed"),
    ("Straits Times", "https://www.straitstimes.com/news/business/rss.xml"),
    # Geopolitical
    ("TASS", "https://tass.com/rss/v2.xml"),
    ("DefenseOne", "https://www.defenseone.com/rss/"),
    ("War on the Rocks", "https://warontherocks.com/feed/"),
    ("The Diplomat", "https://thediplomat.com/feed/"),
    # Central Banks
    ("FED Press", "https://www.federalreserve.gov/feeds/press_all.xml"),
]
FEED_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; StockyAI/1.0)"}

POSITIVE_KEYWORDS = [
    "growth", "beat", "surge", "positive", "upgrade", "rally", "gain",
    "rise", "jump", "profit", "bullish", "buy", "outperform", "record",
    "strong", "boom", "recovery", "expand", "accumulate", "overweight",
    "target raised", "price target hiked", "rerating",
]
NEGATIVE_KEYWORDS = [
    "decline", "miss", "downgrade", "loss", "negative", "fall", "drop",
    "crash", "bearish", "sell", "underperform", "cut", "weak", "slump",
    "debt", "risk", "warning", "reduce", "avoid", "exit", "underweight",
    "target cut", "downside", "sell rating",
]

INDEX_ALIASES = {
    "NIFTY": "^NSEI",
    "BANKNIFTY": "^NSEBANK",
    "SENSEX": "^BSESN",
    "NIFTYBANK": "^NSEBANK",
}

STOCK_NAME_MAP = {
    "TATA MOTORS": "TATAMOTORS", "TATA STEEL": "TATASTEEL",
    "TATA POWER": "TATAPOWER", "TATA CONSUMER": "TATACONSUM",
    "HDFC BANK": "HDFCBANK", "HDFC LIFE": "HDFCLIFE",
    "ICICI BANK": "ICICIBANK", "KOTAK BANK": "KOTAKBANK",
    "KOTAK MAHINDRA": "KOTAKBANK", "AXIS BANK": "AXISBANK",
    "STATE BANK": "SBIN", "SBI": "SBIN",
    "BHARTI AIRTEL": "BHARTIARTL", "AIRTEL": "BHARTIARTL",
    "BAJAJ FINANCE": "BAJFINANCE", "BAJAJ FINSERV": "BAJAJFINSV",
    "BAJAJ AUTO": "BAJAJ-AUTO", "MARUTI SUZUKI": "MARUTI", "MARUTI": "MARUTI",
    "HERO MOTO": "HEROMOTOCO", "HINDUSTAN UNILEVER": "HINDUNILVR",
    "HUL": "HINDUNILVR", "SUN PHARMA": "SUNPHARMA",
    "DR REDDY": "DRREDDY", "DR REDDYS": "DRREDDY",
    "ULTRA CEMENT": "ULTRACEMCO", "ULTRATECH": "ULTRACEMCO",
    "POWER GRID": "POWERGRID", "ASIAN PAINTS": "ASIANPAINT",
    "TECH MAHINDRA": "TECHM", "M&M": "M&M", "MAHINDRA": "M&M",
    "ADANI ENTERPRISES": "ADANIENT", "ADANI PORTS": "ADANIPORTS",
    "L&T": "LT", "LARSEN": "LT", "NESTLE": "NESTLEIND",
    "NESTLE INDIA": "NESTLEIND", "COAL INDIA": "COALINDIA",
    "EICHER MOTORS": "EICHERMOT", "CIPLA": "CIPLA", "WIPRO": "WIPRO",
    "INFOSYS": "INFY", "TCS": "TCS", "HCL TECH": "HCLTECH",
    "RELIANCE": "RELIANCE", "ITC": "ITC", "TITAN": "TITAN",
}

STOCK_FULL_NAMES = {
    "TATAMOTORS": "tata motors", "TATASTEEL": "tata steel",
    "RELIANCE": "reliance", "TCS": "tcs", "INFY": "infosys",
    "HDFCBANK": "hdfc bank", "ICICIBANK": "icici bank", "SBIN": "sbi",
    "BHARTIARTL": "airtel", "ITC": "itc", "KOTAKBANK": "kotak",
    "LT": "larsen", "HINDUNILVR": "hindustan unilever",
    "BAJFINANCE": "bajaj finance", "MARUTI": "maruti", "WIPRO": "wipro",
    "HCLTECH": "hcl tech", "AXISBANK": "axis bank", "TITAN": "titan",
    "SUNPHARMA": "sun pharma", "ADANIENT": "adani", "NTPC": "ntpc",
    "ONGC": "ongc", "POWERGRID": "power grid", "M&M": "mahindra",
    "TECHM": "tech mahindra",
}


def _resolve_symbol(user_input: str) -> tuple[str, str, list[str]]:
    upper = user_input.upper().strip()
    if upper in INDEX_ALIASES:
        return INDEX_ALIASES[upper], upper, [upper.lower()]
    if "." in upper or upper.startswith("^"):
        base = upper.split(".")[0]
        return upper, base, [base.lower()]
    nse_sym = STOCK_NAME_MAP.get(upper, upper.replace(" ", ""))
    news_terms = [nse_sym.lower(), upper.lower()]
    if nse_sym in STOCK_FULL_NAMES:
        news_terms.append(STOCK_FULL_NAMES[nse_sym])
    if " " in user_input:
        news_terms.append(user_input.lower())
    news_terms = list(dict.fromkeys(news_terms))
    return f"{nse_sym}.NS", nse_sym, news_terms


def _validate_yf_ticker(yf_symbol: str) -> str | None:
    try:
        tk = yf.Ticker(yf_symbol)
        info = tk.info
        if info and info.get("regularMarketPrice") is not None:
            return yf_symbol
    except Exception:
        pass
    if yf_symbol.endswith(".NS"):
        bo = yf_symbol.replace(".NS", ".BO")
        try:
            tk = yf.Ticker(bo)
            info = tk.info
            if info and info.get("regularMarketPrice") is not None:
                return bo
        except Exception:
            pass
    return None


def _suggest_similar(query: str) -> list[str]:
    """Return up to 3 closest stock names/symbols using fuzzy matching."""
    upper = query.upper().strip()
    # Build candidate pool: all map keys + all NSE symbols
    candidates = list(STOCK_NAME_MAP.keys()) + list(STOCK_NAME_MAP.values())
    candidates += list(STOCK_FULL_NAMES.keys())
    candidates = list(dict.fromkeys(candidates))  # dedupe
    matches = difflib.get_close_matches(upper, candidates, n=3, cutoff=0.55)
    resolved = []
    for m in matches:
        sym = STOCK_NAME_MAP.get(m, m)
        if sym not in resolved:
            resolved.append(sym)
    return resolved[:3]


def _calculate_rsi(closes, period=14):
    delta = closes.diff()
    gain = delta.where(delta > 0, 0).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))


def _get_technical_data(yf_symbol: str) -> tuple[dict, float]:
    """Returns (structured_data_dict, score)."""
    try:
        df = yf.download(yf_symbol, period="1y", interval="1d", progress=False)
    except Exception:
        return {"error": "Technical data not available"}, 5.0

    if df.empty or len(df) < 30:
        return {"error": "Insufficient price data"}, 5.0

    if hasattr(df.columns, "levels") and df.columns.nlevels > 1:
        df.columns = df.columns.get_level_values(0)

    closes = df["Close"]
    current = float(closes.iloc[-1])
    result = {"price": current}

    # RSI
    rsi_score = 5.0
    if len(closes) >= 15:
        rsi_val = float(_calculate_rsi(closes).iloc[-1])
        rsi_label = "Overbought" if rsi_val > 70 else ("Oversold" if rsi_val < 30 else "Neutral")
        result["rsi"] = round(rsi_val, 1)
        result["rsi_label"] = rsi_label
        if rsi_val <= 30:
            rsi_score = 0.0
        elif rsi_val >= 70:
            rsi_score = 10.0
        else:
            rsi_score = max(0, min(10, (rsi_val - 30) * (10 / 40)))

    # MACD
    macd_score = 5.0
    if len(closes) >= 26:
        ema12 = closes.ewm(span=12, adjust=False).mean()
        ema26 = closes.ewm(span=26, adjust=False).mean()
        macd = ema12 - ema26
        signal = macd.ewm(span=9, adjust=False).mean()
        macd_diff = float(macd.iloc[-1] - signal.iloc[-1])
        result["macd"] = round(macd_diff, 2)
        result["macd_signal"] = "Bullish" if macd_diff > 0 else "Bearish"
        macd_max = float(np.abs(macd).max())
        if macd_max > 0:
            macd_score = max(0, min(10, 5 + (macd_diff / macd_max * 5)))

    # SMA
    sma_score = 5.0
    if len(closes) >= 200:
        sma50 = float(closes.rolling(50).mean().iloc[-1])
        sma200 = float(closes.rolling(200).mean().iloc[-1])
        result["sma50"] = round(sma50, 2)
        result["sma200"] = round(sma200, 2)
        result["sma_signal"] = "Golden Cross" if sma50 > sma200 else "Death Cross"
        sma_score = max(0, min(10, (sma50 / sma200 - 0.9) * 100))
    elif len(closes) >= 50:
        sma50 = float(closes.rolling(50).mean().iloc[-1])
        result["sma50"] = round(sma50, 2)
        result["sma_signal"] = "Above 50D" if current > sma50 else "Below 50D"
        sma_score = 7.0 if current > sma50 else 3.0

    # Price changes
    changes = []
    momentum_scores = []
    for label, days, weight in [("1D", 2, 0.1), ("1W", 5, 0.3), ("1M", 22, 0.4), ("3M", 66, 0.2)]:
        if len(closes) >= days:
            ref = float(closes.iloc[-days])
            chg = (current - ref) / ref * 100
            changes.append({"period": label, "pct": round(chg, 2)})
            momentum_scores.append((max(0, min(10, 5 + chg / 2)), weight))
    result["changes"] = changes

    momentum_score = 5.0
    if momentum_scores:
        total_w = sum(w for _, w in momentum_scores)
        momentum_score = max(0, min(10, sum(s * w for s, w in momentum_scores) / total_w))

    # 52W range
    high_52 = float(closes.max())
    low_52 = float(closes.min())
    if high_52 != low_52:
        pos = (current - low_52) / (high_52 - low_52) * 100
        result["range_52w"] = {"high": round(high_52, 2), "low": round(low_52, 2), "position": round(pos, 1)}

    # Volume
    if "Volume" in df.columns and len(df) >= 20:
        vol_5d = float(df["Volume"].tail(5).mean())
        vol_20d = float(df["Volume"].tail(20).mean())
        if vol_20d > 0:
            result["volume_ratio"] = round(vol_5d / vol_20d, 2)

    tech_score = round((rsi_score + macd_score + sma_score + momentum_score) / 4, 1)
    tech_score = max(0, min(10, tech_score))
    return result, tech_score


def _get_fundamental_data(ticker: yf.Ticker) -> tuple[dict, float]:
    info = ticker.info
    if not info or info.get("regularMarketPrice") is None:
        return {"error": "Fundamental data not available"}, 5.0

    result = {}
    if info.get("sector"):
        result["sector"] = info["sector"]
    if info.get("industry"):
        result["industry"] = info["industry"]
    if info.get("marketCap"):
        result["market_cap"] = info["marketCap"]

    pe = info.get("trailingPE")
    pe_score = 5.0
    if pe:
        result["pe"] = round(pe, 2)
        pe_score = max(0, min(10, 10 - (pe - 15) * (10 / 15) if pe > 15 else 10))
    fwd_pe = info.get("forwardPE")
    if fwd_pe:
        result["forward_pe"] = round(fwd_pe, 2)

    roe = info.get("returnOnEquity")
    roe_score = 5.0
    if roe:
        roe_pct = roe * 100
        result["roe"] = round(roe_pct, 1)
        roe_score = max(0, min(10, (roe_pct - 5) * (10 / 15) if roe_pct > 5 else 0))

    de = info.get("debtToEquity")
    de_score = 5.0
    if de is not None:
        de_ratio = de / 100
        result["debt_to_equity"] = round(de_ratio, 2)
        de_score = max(0, min(10, 10 - (de_ratio - 0.5) * (10 / 1.5) if de_ratio > 0.5 else 10))

    growth_score = 5.0
    earn_growth = info.get("earningsGrowth")
    if earn_growth:
        result["earnings_growth"] = round(earn_growth * 100, 1)
        eg_pct = earn_growth * 100
        growth_score = max(0, min(10, (eg_pct / 15) * 10 if eg_pct > 0 else max(0, 5 + eg_pct / 10)))

    rev_growth = info.get("revenueGrowth")
    if rev_growth:
        result["revenue_growth"] = round(rev_growth * 100, 1)

    if info.get("profitMargins"):
        result["profit_margin"] = round(info["profitMargins"] * 100, 1)
    if info.get("bookValue"):
        result["book_value"] = round(info["bookValue"], 2)
    if info.get("priceToBook"):
        result["pb"] = round(info["priceToBook"], 2)
    if info.get("dividendYield") and info["dividendYield"] > 0:
        result["dividend_yield"] = round(info["dividendYield"] * 100, 2)

    fund_score = round((pe_score + roe_score + de_score + growth_score) / 4, 1)
    fund_score = max(0, min(10, fund_score))
    return result, fund_score


def _get_quarterly_results(ticker: yf.Ticker) -> list[dict]:
    try:
        qis = ticker.quarterly_income_stmt
        if qis is None or qis.empty:
            return []

        cols = list(qis.columns[:8])
        if not cols:
            return []

        quarters = []
        for col in cols:
            q = {"period": col.strftime("%b'%y")}
            for label, row_names in [
                ("revenue", ["Total Revenue", "Operating Revenue"]),
                ("net_income", ["Net Income", "Net Income Common Stockholders"]),
                ("eps", ["Basic EPS", "Diluted EPS"]),
            ]:
                for rn in row_names:
                    if rn in qis.index:
                        try:
                            val = qis.loc[rn, col]
                            if val is not None and not (isinstance(val, float) and np.isnan(val)):
                                q[label] = float(val)
                        except (IndexError, KeyError, TypeError):
                            pass
                        break
            quarters.append(q)

        # Compute QoQ and YoY deltas for the first 4 quarters using the older quarters as reference
        for i in range(min(4, len(quarters))):
            q = quarters[i]
            for metric in ["revenue", "net_income", "eps"]:
                if metric in q and q[metric]:
                    if i + 1 < len(quarters) and metric in quarters[i + 1] and quarters[i + 1][metric]:
                        prev = quarters[i + 1][metric]
                        q[f"{metric}_qoq"] = round((q[metric] - prev) / abs(prev) * 100, 1)
                    if i + 4 < len(quarters) and metric in quarters[i + 4] and quarters[i + 4][metric]:
                        prev_yr = quarters[i + 4][metric]
                        q[f"{metric}_yoy"] = round((q[metric] - prev_yr) / abs(prev_yr) * 100, 1)
        return quarters[:4]
    except Exception:
        return []


def _get_shareholding(ticker: yf.Ticker) -> list[dict]:
    try:
        mh = ticker.major_holders
        if mh is None or mh.empty:
            return []
        if len(mh.columns) < 2:
            return []
        holders = []
        for _, row in mh.iterrows():
            try:
                pct = row.iloc[0]
                desc = str(row.iloc[1])
                if isinstance(pct, (int, float)):
                    holders.append({"description": desc, "percentage": round(float(pct), 2)})
                else:
                    holders.append({"description": desc, "percentage": str(pct)})
            except (IndexError, KeyError):
                continue
        return holders
    except Exception:
        return []


def _get_news_data(search_terms: list[str]) -> tuple[list[dict], float]:
    patterns = []
    for term in search_terms:
        if len(term) <= 3:
            patterns.append(re.compile(r"\b" + re.escape(term) + r"\b", re.IGNORECASE))
        else:
            patterns.append(re.compile(re.escape(term), re.IGNORECASE))

    relevant = []
    sentiments = []

    for feed_name, feed_url in NEWS_FEEDS:
        try:
            feed = feedparser.parse(feed_url, request_headers=FEED_HEADERS)
            for entry in feed.entries[:30]:
                title = entry.get("title", "")
                summary = entry.get("summary", "") or entry.get("description", "") or ""
                text = title + " " + summary
                if any(p.search(text) for p in patterns):
                    title_lower = title.lower()
                    body_lower = summary.lower()
                    # Title keywords carry 3× weight — catches "Reduce Wipro" correctly
                    pos = sum(3 for kw in POSITIVE_KEYWORDS if kw in title_lower) + \
                          sum(1 for kw in POSITIVE_KEYWORDS if kw in body_lower)
                    neg = sum(3 for kw in NEGATIVE_KEYWORDS if kw in title_lower) + \
                          sum(1 for kw in NEGATIVE_KEYWORDS if kw in body_lower)
                    total = pos + neg + 1
                    sentiment = (pos - neg) / total
                    sentiments.append(sentiment)
                    pub_date = ""
                    if hasattr(entry, "published"):
                        pub_date = entry.published[:16]
                    relevant.append({
                        "source": feed_name,
                        "title": title,
                        "date": pub_date,
                        "sentiment": round(sentiment, 3),
                        "link": entry.get("link", ""),
                    })
        except Exception:
            pass

    if not relevant:
        return [], 5.0

    avg_sentiment = sum(sentiments) / len(sentiments)
    news_score = round(5 + (avg_sentiment * 5), 1)
    news_score = max(0, min(10, news_score))
    return relevant[:10], news_score


async def _generate_news_analysis(articles: list[dict], symbol_name: str) -> str | None:
    """AI-generated 1-2 sentence summary of news sentiment and key theme."""
    if not articles:
        return None
    titles = [a["title"] for a in articles[:6]]
    prompt = (
        f"Recent headlines about {symbol_name}:\n"
        + "\n".join(f"- {t}" for t in titles)
        + "\n\nSummarise the overall sentiment and key theme driving the news in 1-2 sentences. Direct, no fluff."
    )
    try:
        return await ai_client.chat(prompt)
    except Exception:
        return None


async def get_analysis(symbol: str, deep: bool = False) -> dict:
    """Full stock analysis — returns structured data for the frontend."""
    yf_symbol, nse_symbol, news_terms = _resolve_symbol(symbol)
    loop = asyncio.get_event_loop()

    await log_api_call("yfinance", "validate_ticker")
    valid = await loop.run_in_executor(None, _validate_yf_ticker, yf_symbol)
    if not valid:
        suggestions = _suggest_similar(symbol)
        if suggestions:
            return {
                "type": "suggestion",
                "content": f"Couldn't find '{symbol}'. Did you mean one of these?",
                "data": {"query": symbol, "suggestions": suggestions},
            }
        return {
            "type": "error",
            "content": f"Couldn't find stock: {symbol}. Try the NSE symbol (e.g. RELIANCE, TCS, INFY).",
        }
    yf_symbol = valid

    ticker = yf.Ticker(yf_symbol)

    await log_api_call("yfinance", "fundamental_data")
    fundamental, fundamental_score = await loop.run_in_executor(None, _get_fundamental_data, ticker)

    await log_api_call("yfinance", "technical_data")
    technical, technical_score = await loop.run_in_executor(None, _get_technical_data, yf_symbol)

    await log_api_call("rss", "news_feeds")
    news_articles, news_score = await loop.run_in_executor(None, _get_news_data, news_terms)

    await log_api_call("yfinance", "quarterly_results")
    quarterly = await loop.run_in_executor(None, _get_quarterly_results, ticker)
    shareholding = await loop.run_in_executor(None, _get_shareholding, ticker)

    overall = round(fundamental_score + technical_score + news_score, 1)

    try:
        name = ticker.info.get("longName") or ticker.info.get("shortName") or symbol.upper()
    except Exception:
        name = symbol.upper()

    news_analysis = await _generate_news_analysis(news_articles, name)

    # Build rich summary for AI verdict
    data_summary = (
        f"Scores — Fundamental: {fundamental_score}/10 | Technical: {technical_score}/10 | "
        f"News: {news_score}/10 | Overall: {overall}/30\n"
        f"P/E: {fundamental.get('pe', '?')} | Forward P/E: {fundamental.get('forward_pe', '?')} | "
        f"ROE: {fundamental.get('roe', '?')}% | D/E: {fundamental.get('debt_to_equity', '?')}\n"
        f"Earnings Growth: {fundamental.get('earnings_growth', '?')}% | "
        f"Revenue Growth: {fundamental.get('revenue_growth', '?')}%\n"
        f"RSI: {technical.get('rsi', '?')} ({technical.get('rsi_label', '')}) | "
        f"MACD: {technical.get('macd_signal', '?')} | SMA: {technical.get('sma_signal', '?')}\n"
        f"SMA50: {technical.get('sma50', '?')} | SMA200: {technical.get('sma200', '?')} | "
        f"Price: {technical.get('price', '?')}\n"
    )
    range_52w = technical.get("range_52w")
    if range_52w:
        data_summary += (
            f"52W Range: {range_52w.get('low', '?')} - {range_52w.get('high', '?')} "
            f"(Position: {range_52w.get('position', '?')}%)\n"
        )
    if quarterly:
        q = quarterly[0]
        data_summary += (
            f"Latest Quarter ({q.get('period', '?')}): "
            f"Revenue QoQ: {q.get('revenue_qoq', '?')}% | "
            f"Net Income QoQ: {q.get('net_income_qoq', '?')}%\n"
        )
    # AI verdict via orchestrator
    verdict = None
    ai_metadata = None
    try:
        from app.llm_orchestrator import enhance
        ai_result = await enhance(
            button_type="analyse",
            raw_data={
                "name": name,
                "symbol": nse_symbol,
                "overall_score": overall,
                "fundamental_score": fundamental_score,
                "technical_score": technical_score,
                "news_score": news_score,
                "data_summary": data_summary,
            },
            deep=deep,
        )
        verdict = ai_result.get("ai_analysis") or None
        ai_metadata = ai_result.get("ai_metadata")
    except Exception:
        pass

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
            verdict = "Everything is broken. Trend, fundamentals, sentiment — all negative. Stay away."

    # Build structured meta from verdict and scores
    from app.response_formatter import build_structured_meta, parse_structured_from_ai

    ai_meta = parse_structured_from_ai(verdict or "") if verdict else {}

    # Determine action tag from score
    if overall >= 22:
        default_tag = "BUY"
    elif overall >= 16:
        default_tag = "HOLD"
    elif overall >= 10:
        default_tag = "WATCH"
    else:
        default_tag = "SELL"

    structured_meta = build_structured_meta(
        action_tag=ai_meta.get("action_tag", default_tag),
        confidence=ai_meta.get("confidence", min(95, max(20, int(overall * 3.3)))),
        confidence_reason=ai_meta.get("confidence_reason", f"Based on {overall:.0f}/30 composite score"),
        payoff_box=ai_meta.get("payoff_box") or {
            "upside": f"{technical.get('sma_200', 'N/A')} (SMA200)" if technical.get("sma_200") else "See analysis",
            "downside": f"{technical.get('week_52_low', 'N/A')} (52W Low)" if technical.get("week_52_low") else "See analysis",
            "asymmetry": "See verdict",
        },
        thesis_killers=ai_meta.get("thesis_killers", []),
        sources=[
            {"name": "NSE India", "freshness": "Live"},
            {"name": "yfinance", "freshness": "15m delay"},
            {"name": "RSS News", "freshness": "Recent"},
        ],
    )

    result = {
        "name": name,
        "symbol": nse_symbol,
        "yf_symbol": yf_symbol,
        "overall_score": overall,
        "fundamental": {"score": fundamental_score, **fundamental},
        "technical": {"score": technical_score, **technical},
        "news": {"score": news_score, "articles": news_articles, "analysis": news_analysis},
        "quarterly": quarterly,
        "shareholding": shareholding,
        "verdict": verdict,
        "structured_meta": structured_meta,
    }
    if ai_metadata:
        result["ai_metadata"] = ai_metadata
    return result
