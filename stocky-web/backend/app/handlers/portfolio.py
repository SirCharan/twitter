from app.kite_client import kite

# CNC = delivery/investments, MIS = intraday, NRML = F&O overnight
INVESTMENT_PRODUCTS = {"CNC"}
TRADING_PRODUCTS = {"MIS", "NRML", "BO", "CO"}


async def get_portfolio(with_ai: bool = True) -> dict:
    """Portfolio split into investments (holdings/CNC) and trading (MIS/NRML positions)."""
    positions = await kite.get_positions()
    holdings = await kite.get_holdings()

    # ── Investments: Holdings ──
    total_invested = sum(h.get("average_price", 0) * h.get("quantity", 0) for h in holdings)
    total_current = sum(h.get("last_price", 0) * h.get("quantity", 0) for h in holdings)
    holdings_pnl = total_current - total_invested

    top_holdings = []
    for h in sorted(holdings, key=lambda x: abs((x.get("last_price", 0) - x.get("average_price", 0)) * x.get("quantity", 0)), reverse=True)[:5]:
        avg = h.get("average_price", 0)
        ltp = h.get("last_price", 0)
        qty = h.get("quantity", 0)
        pnl = (ltp - avg) * qty
        pct = ((ltp - avg) / avg * 100) if avg else 0
        top_holdings.append({
            "symbol": h.get("tradingsymbol", ""),
            "qty": qty,
            "avg": round(avg, 2),
            "ltp": round(ltp, 2),
            "pnl": round(pnl, 2),
            "pct": round(pct, 2),
        })

    # ── Trading: Net positions (includes overnight NRML/F&O) ──
    net_positions = positions.get("net", [])
    trading_positions = []
    trading_pnl = 0
    trading_realised = 0

    for p in net_positions:
        product = p.get("product", "")
        if product in INVESTMENT_PRODUCTS:
            continue  # skip CNC — counted under investments
        qty = p.get("quantity", 0)
        if qty == 0:
            continue  # skip fully closed positions
        pnl = p.get("pnl", 0)
        realised = p.get("realised", 0)
        trading_pnl += pnl
        trading_realised += realised
        trading_positions.append({
            "symbol": p.get("tradingsymbol", ""),
            "exchange": p.get("exchange", ""),
            "product": product,
            "qty": qty,
            "avg": round(p.get("average_price", 0), 2),
            "ltp": round(p.get("last_price", 0), 2),
            "pnl": round(pnl, 2),
            "buy_qty": p.get("buy_quantity", 0),
            "sell_qty": p.get("sell_quantity", 0),
        })

    # overall P&L from net positions
    total_day_pnl = sum(p.get("pnl", 0) for p in net_positions if p.get("product", "") not in INVESTMENT_PRODUCTS)

    result = {
        "investments": {
            "invested": round(total_invested, 2),
            "current": round(total_current, 2),
            "pnl": round(holdings_pnl, 2),
            "pct": round((holdings_pnl / total_invested * 100) if total_invested else 0, 2),
            "count": len(holdings),
            "top_holdings": top_holdings,
        },
        "trading": {
            "day_pnl": round(trading_pnl, 2),
            "realised": round(trading_realised, 2),
            "open_count": sum(1 for p in trading_positions if p["qty"] != 0),
            "closed_count": sum(1 for p in trading_positions if p["qty"] == 0),
            "positions": trading_positions,
        },
        "day_pnl": round(total_day_pnl, 2),
    }

    # AI portfolio analysis
    if with_ai and holdings:
        try:
            from app import ai_client
            from app.prompts import PORTFOLIO_ANALYSIS_PROMPT

            # Build summary for AI
            portfolio_text = f"Total invested: {total_invested:,.0f} | Current: {total_current:,.0f} | "
            portfolio_text += f"P&L: {holdings_pnl:,.0f} ({(holdings_pnl / total_invested * 100) if total_invested else 0:.1f}%)\n"
            portfolio_text += f"Holdings count: {len(holdings)}\n"
            portfolio_text += "Top holdings:\n"
            for h in top_holdings:
                portfolio_text += f"  {h['symbol']}: {h['qty']} shares, avg {h['avg']}, LTP {h['ltp']}, P&L {h['pnl']:+,.0f} ({h['pct']:+.1f}%)\n"
            if trading_positions:
                portfolio_text += f"\nOpen trading positions: {len(trading_positions)}, Day P&L: {trading_pnl:+,.0f}\n"

            analysis = await ai_client.feature_analysis(
                PORTFOLIO_ANALYSIS_PROMPT.format(data=portfolio_text), max_tokens=256
            )
            if analysis:
                result["ai_analysis"] = analysis
        except Exception:
            pass

    return result


async def get_positions() -> list[dict]:
    """Open positions with P&L (includes overnight NRML/F&O)."""
    data = await kite.get_positions()
    net_positions = data.get("net", [])
    result = []
    for p in net_positions:
        qty = p.get("quantity", 0)
        if qty == 0:
            continue
        pnl = p.get("pnl", 0)
        result.append({
            "symbol": p.get("tradingsymbol", ""),
            "exchange": p.get("exchange", ""),
            "quantity": qty,
            "average_price": round(p.get("average_price", 0), 2),
            "ltp": round(p.get("last_price", 0), 2),
            "pnl": round(pnl, 2),
            "product": p.get("product", ""),
        })
    return result


async def get_holdings() -> list[dict]:
    """Holdings with P&L."""
    data = await kite.get_holdings()
    result = []
    for h in data:
        avg = h.get("average_price", 0)
        ltp = h.get("last_price", 0)
        qty = h.get("quantity", 0)
        pnl = (ltp - avg) * qty
        result.append({
            "symbol": h.get("tradingsymbol", ""),
            "exchange": h.get("exchange", ""),
            "quantity": qty,
            "average_price": round(avg, 2),
            "ltp": round(ltp, 2),
            "pnl": round(pnl, 2),
        })
    return result


async def get_orders() -> list[dict]:
    """Today's orders."""
    data = await kite.get_orders()
    result = []
    for o in (data or [])[-15:]:
        result.append({
            "order_id": o.get("order_id", ""),
            "symbol": o.get("tradingsymbol", ""),
            "exchange": o.get("exchange", ""),
            "txn_type": o.get("transaction_type", ""),
            "order_type": o.get("order_type", ""),
            "quantity": o.get("quantity", 0),
            "price": o.get("average_price", o.get("price", 0)),
            "status": o.get("status", ""),
            "product": o.get("product", ""),
        })
    return result


async def get_margins() -> dict:
    """Margin/funds data."""
    data = await kite.get_margins()
    result = {}
    for segment in ["equity", "commodity"]:
        if segment in data:
            m = data[segment]
            avail = m.get("available", {})
            result[segment] = {
                "cash": round(avail.get("cash", 0), 2),
                "collateral": round(avail.get("collateral", 0), 2),
                "intraday_payin": round(avail.get("intraday_payin", 0), 2),
                "used": round(m.get("utilised", {}).get("debits", 0), 2),
            }
    return result
