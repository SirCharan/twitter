# Delta Exchange — Options Trading Terminal

A single-page crypto options trading terminal inspired by [Delta Exchange India](https://www.delta.exchange), built with vanilla HTML, CSS, and JavaScript.

**Live Demo:** [delta-rouge-eta.vercel.app](https://delta-rouge-eta.vercel.app)

## Features

- **Option Chain** — Interactive BTC options chain with strike prices, bid/ask spreads, IV, open interest, and quantity columns
- **TradingView Chart** — Embedded BINANCE:BTCUSDT chart with Delta Exchange color scheme
- **Buy/Sell Popup** — Hover over any option to get a quick Buy/Sell popup overlay
- **Position Management** — Track open positions with entry price, mark price, PnL, and ROE
- **Chart Overlay** — Strike price lines overlaid on the chart, color-coded by option type and side
- **Payoff Chart** — Canvas-based combined P&L payoff diagram for all open positions
- **Responsive** — Desktop-first layout with compact landscape mode for mobile; portrait shows a gate message prompting desktop or landscape use

## Tech Stack

- Vanilla HTML / CSS / JavaScript (no frameworks)
- CSS custom properties for Delta Exchange India color palette
- TradingView widget (iframe)
- Canvas API for payoff chart
- Deployed on Vercel

## Layout

| Section | Description |
|---------|-------------|
| **Left Panel (50%)** | Option chain table with calls and puts |
| **Top Right** | TradingView BTC/USDT chart with position strike overlays |
| **Bottom Right** | Positions table / Payoff chart |

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `#121212` | Page background |
| `--accent` | `#F3841E` | Delta orange — ATM highlight, branding |
| `--buy` | `#00C087` | Long / call / profit |
| `--sell` | `#FF4D4D` | Short / put / loss |
| `--text-primary` | `#FFFFFF` | Primary text |
| `--border` | `#262626` | Borders |

## Running Locally

Open `index.html` in any modern browser. No build step required.

## Deployment

Deployed via Vercel CLI:

```bash
cd delta
npx vercel --prod --yes
```
