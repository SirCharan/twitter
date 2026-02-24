---
name: positions
description: Fetch and display Zerodha portfolio — open positions, holdings, orders, and margins. Use when the user asks about their portfolio, positions, trades, or holdings.
disable-model-invocation: true
---

Fetch the user's Zerodha portfolio data and display it in a clean, formatted way.

## Steps

1. Run the portfolio fetch script:

```bash
cd stocky-web/backend && .venv/bin/python -m scripts.fetch_portfolio
```

2. Parse the JSON output. If there's an `"error"` key, display the error and suggest the user check their `.env` credentials in `stocky-web/backend/.env`.

3. Display the data in well-formatted markdown tables:

### Portfolio Summary
Show a summary with:
- **Investments**: invested amount, current value, total P&L (with % and color indication)
- **Trading**: day P&L, realised P&L, open/closed position counts
- **Overall Day P&L**

### Open Positions
Table with columns: Symbol | Exchange | Product | Qty | Avg Price | LTP | P&L
- Show the product type (MIS/NRML/CNC)
- Mark P&L as positive (+) or negative (-)
- Include buy_qty and sell_qty if available

### Top Holdings
Table with columns: Symbol | Qty | Avg Price | LTP | P&L | Return %
- Show from portfolio.investments.top_holdings

### Today's Orders
Table with columns: Symbol | Type | Qty | Price | Status | Product
- Color-code status (COMPLETE, REJECTED, OPEN, CANCELLED)

### Margins
Show equity segment: Available Cash | Collateral | Intraday Payin | Used

4. If any section has no data (empty list), mention "No open positions" / "No orders today" etc. instead of an empty table.

5. At the end, show the timestamp of when data was fetched.

## Notes
- The script requires `stocky-web/backend/.env` with Kite credentials (KITE_API_KEY, KITE_API_SECRET, KITE_USER_ID, KITE_PASSWORD, KITE_TOTP_SECRET)
- It auto-authenticates via TOTP if the session is expired
- All amounts are in INR (₹)
