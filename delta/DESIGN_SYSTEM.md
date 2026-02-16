# Delta Exchange Design System

Comprehensive design system reference compiled from delta.exchange website analysis,
brand resources, CSS variable extraction, screenshot analysis, and design research.

---

## 1. Brand Identity

Delta Exchange is a crypto derivatives trading platform (futures, options, perpetual swaps).
The brand identity centers on a professional, information-dense dark theme typical of
institutional-grade trading terminals.

**Official Brand Colors** (from logotyp.us brand resource):
- **Brand Turquoise/Cyan**: `#00B5EB`
- **Brand Green**: `#06F922`

---

## 2. Theme System

Delta Exchange supports multiple themes managed via a `delta_theme` localStorage key:
- `dark` (default / global)
- `light`
- `indian_dark` (India region, orange-accented)
- `indian_light`

### CSS Custom Properties (extracted from source)

| Variable                   | Dark Theme  | Light Theme | Indian Dark | Indian Light |
|----------------------------|-------------|-------------|-------------|--------------|
| `--primaryBackground`      | `#101013`   | `#FAFAFA`   | `#101013`   | `#FAFAFA`    |
| `--primaryTheme`           | `#2894F9`   | `#2894F9`   | `#FD7D02`   | `#FD7D02`    |
| `--main-bg-surface-alt`    | (see below) | (see below) | --          | --           |
| `--brand-bg-primary`       | (see below) | (see below) | --          | --           |

---

## 3. Color Palette (Dark Theme - Primary)

### Backgrounds

| Token                     | Hex Code    | Usage                                         |
|---------------------------|-------------|-----------------------------------------------|
| Base Background           | `#101013`   | Main application background (CSS var confirmed)|
| Surface / Card Background | `#1A1A1F`   | Elevated panels, cards, modals                 |
| Surface Alt / Sidebar     | `#141418`   | Sidebar, secondary panels, option chain bg     |
| Surface Elevated          | `#1E1E24`   | Hover states on cards, dropdown menus          |
| Header / Navbar           | `#0D0D10`   | Top navigation bar                             |
| Input / Field Background  | `#1C1C22`   | Input fields, search boxes                     |
| Table Row Hover           | `#1F1F26`   | Hovered table rows                             |
| Table Row Highlight       | `#252530`   | Selected/active table row (ATM strike row)     |

### Text Colors

| Token                | Hex Code                 | Usage                           |
|----------------------|--------------------------|---------------------------------|
| Primary Text         | `#FFFFFF`                | Headings, key values, prices    |
| Secondary Text       | `#A0A0A8`               | Labels, descriptions, subtitles |
| Tertiary/Muted Text  | `#6B6B76`               | Hints, placeholders, disabled   |
| Disabled Text        | `rgba(255,255,255,0.38)` | Disabled controls               |
| Link Text            | `#2894F9`               | Clickable links, active tabs    |

### Primary Accent (Blue)

| Token                | Hex Code    | Usage                                     |
|----------------------|-------------|-------------------------------------------|
| Primary Blue         | `#2894F9`   | Primary CTA buttons, links, active states  |
| Primary Blue Hover   | `#3CA3FF`   | Hover state for primary buttons            |
| Primary Blue Pressed | `#1A7AD8`   | Pressed/active state                       |
| Primary Blue Muted   | `rgba(40,148,249,0.15)` | Blue-tinted backgrounds, badges  |

### Indian Theme Accent (Orange)

| Token                | Hex Code    | Usage                                   |
|----------------------|-------------|------------------------------------------|
| Primary Orange       | `#FD7D02`   | India-region primary accent              |
| Orange Hover         | `#FF9020`   | Hover state                              |
| Orange Muted         | `rgba(253,125,2,0.15)` | Tinted backgrounds          |

### Trading Colors (Buy/Sell - Green/Red)

| Token                | Hex Code    | Usage                                         |
|----------------------|-------------|-----------------------------------------------|
| Buy / Long / Green   | `#00D26A`   | Buy buttons, profit values, green candles      |
| Buy Green Hover      | `#00E87A`   | Hover state on buy buttons                     |
| Buy Green Muted      | `rgba(0,210,106,0.12)` | Green-tinted row backgrounds        |
| Buy Green Dark       | `#00B35A`   | Pressed state, darker green accents            |
| Sell / Short / Red   | `#FF3B3B`   | Sell buttons, loss values, red candles         |
| Sell Red Hover       | `#FF5252`   | Hover state on sell buttons                    |
| Sell Red Muted       | `rgba(255,59,59,0.12)` | Red-tinted row backgrounds          |
| Sell Red Dark        | `#E02020`   | Pressed state, darker red accents              |

*Note: From the screenshot, the green appears as a vivid medium-green and the red is
a bright signal red. These hex values are derived from visual analysis of the
screenshot at `/Users/charandeepkapoor/conductor/workspaces/twitter/dubai/.context/attachments/image.png`.*

### Border Colors

| Token                | Hex Code                 | Usage                          |
|----------------------|--------------------------|--------------------------------|
| Border Default       | `#2A2A32`                | Panel borders, dividers        |
| Border Subtle        | `#222228`                | Subtle separators              |
| Border Strong        | `#3A3A44`                | Focused input borders          |
| Border Accent        | `#2894F9`                | Focused/active element borders |
| Border Muted         | `rgba(255,255,255,0.08)` | Very subtle separators         |

### Status / Semantic Colors

| Token                | Hex Code    | Usage                          |
|----------------------|-------------|--------------------------------|
| Warning              | `#FFB020`   | Warning alerts, caution states |
| Error                | `#FF3B3B`   | Error messages, validation     |
| Success              | `#00D26A`   | Success states, confirmations  |
| Info                 | `#2894F9`   | Informational messages         |

---

## 4. Typography

### Font Stack

```css
font-family: "Roboto", "Helvetica", "Arial", sans-serif;
```

The platform uses **Roboto** as its primary typeface, with Helvetica and Arial as
fallbacks. This is consistent with their use of Material-UI (MUI) component library.

For the marketing/landing pages, **Open Sans** has also been observed:
```css
font-family: "Open Sans", sans-serif;
```

### Type Scale

| Element              | Size          | Weight | Letter Spacing | Line Height |
|----------------------|---------------|--------|----------------|-------------|
| H1 / Page Title      | 24px (1.5rem) | 700    | -0.02em        | 1.3         |
| H2 / Section Title   | 20px (1.25rem)| 600    | -0.01em        | 1.3         |
| H3 / Panel Header    | 16px (1rem)   | 600    | 0              | 1.4         |
| Body / Default        | 14px (0.875rem)| 400   | 0.01em         | 1.5         |
| Body Small / Data     | 13px (0.8125rem)| 400  | 0.01em         | 1.4         |
| Caption / Label       | 12px (0.75rem)| 400    | 0.02em         | 1.3         |
| Tiny / Micro          | 11px (0.6875rem)| 400  | 0.03em         | 1.2         |
| Tab Labels (Uppercase)| 14px (0.875rem)| 500   | 0.02857em      | 1.25        |
| Price Values (Mono)   | 13px          | 500    | 0.02em         | 1.4         |

### Font Weights

| Weight | Token      | Usage                            |
|--------|------------|----------------------------------|
| 400    | Regular    | Body text, data values           |
| 500    | Medium     | Tab labels, prices, emphasis     |
| 600    | SemiBold   | Section headers, panel titles    |
| 700    | Bold       | Page titles, key metrics         |

### Monospace (for data/prices)

Trading data, order book prices, and numeric values use tabular/monospace figures:
```css
font-variant-numeric: tabular-nums;
```

---

## 5. Spacing System

The platform follows an 4px base grid (consistent with Material-UI defaults):

| Token | Value | Usage                       |
|-------|-------|-----------------------------|
| xs    | 4px   | Tight spacing, inline gaps  |
| sm    | 8px   | Component internal padding  |
| md    | 12px  | Card padding, list gaps     |
| base  | 16px  | Standard section padding    |
| lg    | 20px  | Panel padding               |
| xl    | 24px  | Section gaps                |
| 2xl   | 32px  | Major section spacing       |
| 3xl   | 40px  | Page-level spacing          |
| 4xl   | 48px  | Min-height for interactive  |

**Component Dimensions (confirmed from source):**
- Button / Tab min-height: `48px`
- Tab padding: `12px 16px`
- Tab max-width: `360px`
- Tab min-width: `90px`

---

## 6. Border Radius

| Token      | Value   | Usage                              |
|------------|---------|-------------------------------------|
| none       | `0px`   | Sharp-cornered elements (tabs)      |
| sm         | `2px`   | Subtle rounding on tags, badges     |
| base       | `4px`   | Buttons, inputs, cards              |
| md         | `6px`   | Modals, dropdowns                   |
| lg         | `8px`   | Larger cards, panels                |
| xl         | `12px`  | Marketing section cards             |
| 2xl        | `16px`  | Feature cards (landing page)        |
| 3xl        | `24px`  | Large marketing containers          |
| full       | `50%`   | Circular elements (avatars, dots)   |

*From the screenshot analysis, the trading interface uses minimal border-radius
(0-4px range) for a sharp, professional trading terminal aesthetic. The marketing
pages use larger radii (rounded-2xl, rounded-3xl per Tailwind classes observed).*

---

## 7. Button Styles

### Primary Button (Blue)
```css
background-color: #2894F9;
color: #FFFFFF;
font-weight: 500;
font-size: 14px;
padding: 8px 16px;
border-radius: 4px;
min-height: 36px;
border: none;
transition: background-color 300ms cubic-bezier(0.4, 0, 0.2, 1);
```
- Hover: `background-color: #3CA3FF`
- Active: `background-color: #1A7AD8`

### Buy Button (Green)
```css
background-color: #00D26A;
color: #FFFFFF;
font-weight: 600;
font-size: 14px;
padding: 10px 20px;
border-radius: 4px;
border: none;
```
- Hover: `background-color: #00E87A`
- Active: `background-color: #00B35A`

### Sell Button (Red)
```css
background-color: #FF3B3B;
color: #FFFFFF;
font-weight: 600;
font-size: 14px;
padding: 10px 20px;
border-radius: 4px;
border: none;
```
- Hover: `background-color: #FF5252`
- Active: `background-color: #E02020`

### Secondary / Outline Button
```css
background-color: transparent;
color: #2894F9;
border: 1px solid #2894F9;
font-weight: 500;
font-size: 14px;
padding: 8px 16px;
border-radius: 4px;
```
- Hover: `background-color: rgba(40,148,249,0.08)`

### Ghost / Text Button
```css
background-color: transparent;
color: #A0A0A8;
border: none;
font-weight: 500;
font-size: 14px;
padding: 8px 12px;
```
- Hover: `color: #FFFFFF; background-color: rgba(255,255,255,0.05)`

### Tab Button (from confirmed source)
```css
font-weight: 500;
font-size: 0.875rem;
line-height: 1.25;
letter-spacing: 0.02857em;
text-transform: uppercase;
min-height: 48px;
min-width: 90px;
max-width: 360px;
padding: 12px 16px;
```
- Active state: Blue underline bar (`height: 2px; background-color: #2894F9`)

---

## 8. Gradients

### Brand Gradient (Marketing Pages)
```css
background: linear-gradient(135deg, #2894F9, #6C5CE7);
/* Blue to purple gradient used on hero sections and CTAs */
```

### Feature Card Gradient
```css
background: linear-gradient(135deg, #6164D2, #7055C5 53%, #8342B4);
/* Purple/violet gradient observed on promotional banners */
```

### Surface Gradient (Subtle)
```css
background: linear-gradient(180deg, #141418 0%, #101013 100%);
/* Very subtle top-to-bottom darkening for depth */
```

### Green Gradient (Buy CTA)
```css
background: linear-gradient(135deg, #00D26A, #00E87A);
```

### Red Gradient (Sell CTA)
```css
background: linear-gradient(135deg, #FF3B3B, #FF5252);
```

### Indian Theme Gradient
```css
background: linear-gradient(135deg, #FD7D02, #FF9020);
/* Orange gradient for India-region variant */
```

---

## 9. Shadows & Elevation

| Token        | Value                                               | Usage              |
|--------------|-----------------------------------------------------|--------------------|
| elevation-0  | `none`                                              | Flat elements      |
| elevation-1  | `0 1px 3px rgba(0,0,0,0.3)`                        | Cards, panels      |
| elevation-2  | `0 4px 8px rgba(0,0,0,0.4)`                        | Dropdowns          |
| elevation-3  | `0 8px 24px rgba(0,0,0,0.5)`                       | Modals, dialogs    |
| elevation-4  | `0 16px 48px rgba(0,0,0,0.6)`                      | Overlays           |

*Dark themes rely more on border differentiation than shadow elevation.*

---

## 10. Trading Interface Layout Colors

Based on the screenshot analysis of the Options Chain interface:

### Options Chain Table
- **Background**: Deep dark (`#101013` to `#141418`)
- **Column headers**: Muted text (`#6B6B76`) on dark bg
- **Strike price column**: Centered, white text on slightly elevated bg
- **Calls side (left)**: Standard dark background
- **Puts side (right)**: Standard dark background
- **ATM row highlight**: Subtle warm/orange-tinted highlight row
- **In-the-money shading**: Very subtle green tint on ITM calls, red tint on ITM puts
- **Bid values**: White/light text
- **Ask values**: White/light text
- **Price changes positive**: Green (`#00D26A`)
- **Price changes negative**: Red (`#FF3B3B`)

### Tab Navigation (observed in screenshot)
- **Tab bar background**: Dark surface (`#141418`)
- **Active tab**: Highlighted with blue underline or accent bg
- **Inactive tabs**: Muted text, no highlight
- **Date selector tabs**: Row of date tabs ("16 Feb 26", "17 Feb 26", etc.)
- **Selected date**: Highlighted/bordered tab (`#2894F9` border or bg)
- **Asset selector tabs**: "BTC" / "ETH" with toggle style

### Header Bar
- **Background**: Darkest shade (`#0D0D10`)
- **Logo**: Delta Exchange branding (turquoise/green `#00B5EB`)
- **Nav links**: Light text (`#A0A0A8`), white on hover
- **Active nav**: White text with blue underline or bold
- **BTC price display**: Bright green when positive (`#00D26A`)

### Order Book (Typical Layout)
- **Ask/sell side**: Rows with subtle red-tinted backgrounds
- **Bid/buy side**: Rows with subtle green-tinted backgrounds
- **Spread indicator**: Centered, muted text
- **Volume bars**: Semi-transparent green/red overlays

### Chart Area
- **Background**: Matches base (`#101013`)
- **Grid lines**: Very subtle (`rgba(255,255,255,0.05)`)
- **Candles green**: `#00D26A`
- **Candles red**: `#FF3B3B`
- **Crosshair**: `rgba(255,255,255,0.3)`
- **TradingView integration**: Standard dark theme

---

## 11. Animation & Transitions

### Standard Transition
```css
transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
```

### Loading Animation (confirmed from source)
```css
/* Ellipsis loader dots */
.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background-color: var(--brand-bg-primary);
  animation-timing-function: cubic-bezier(0, 1, 1, 0);
  animation-duration: 0.6s;
  animation-iteration-count: infinite;
}
```

### Hover Transitions
- Duration: `150ms` to `300ms`
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` (Material standard)

---

## 12. Component Library

The platform is built with:
- **React** (Next.js framework, version 5.3.4 build observed)
- **Material-UI (MUI)** components (confirmed by `#1976d2` default blue, Roboto font)
- **TradingView** charting library (embedded charts)
- **Custom components** for order book, options chain, position panels

### Material-UI Defaults Observed
- Default primary: `#1976d2` (MUI blue, overridden to `#2894F9`)
- Default text: `rgba(0,0,0,0.6)` (light mode), `#FFFFFF` (dark mode)
- Default disabled: `rgba(0,0,0,0.38)` (light mode)
- Default border-radius: `4px`

---

## 13. Confirmed Values (Source-Verified)

These values were directly extracted from delta.exchange page source code:

| Property              | Value        | Source            |
|-----------------------|-------------|-------------------|
| Dark bg               | `#101013`   | CSS variable       |
| Light bg              | `#FAFAFA`   | CSS variable       |
| Primary theme (global)| `#2894F9`   | CSS variable       |
| Primary theme (India) | `#FD7D02`   | CSS variable       |
| Brand turquoise       | `#00B5EB`   | logotyp.us brand   |
| Brand green           | `#06F922`   | logotyp.us brand   |
| Font family           | Roboto      | MUI / page source  |
| Tab font weight       | 500         | CSS extracted      |
| Tab font size         | 0.875rem    | CSS extracted      |
| Tab min-height        | 48px        | CSS extracted      |
| Tab padding           | 12px 16px   | CSS extracted      |
| Active underline      | 2px #2894F9 | CSS extracted      |
| Transition timing     | 300ms cubic-bezier(0.4,0,0.2,1) | CSS |
| MUI default blue      | `#1976D2`   | MUI framework      |
| Banner gradient       | `linear-gradient(135deg, #6164D2, #7055C5 53%, #8342B4)` | bitdegree review page |
| CTA red               | `#FF3D64`   | bitdegree review page |

---

## 14. Design Tokens Summary (Quick Reference)

```css
:root {
  /* Backgrounds */
  --bg-base: #101013;
  --bg-surface: #1A1A1F;
  --bg-surface-alt: #141418;
  --bg-elevated: #1E1E24;
  --bg-header: #0D0D10;
  --bg-input: #1C1C22;

  /* Text */
  --text-primary: #FFFFFF;
  --text-secondary: #A0A0A8;
  --text-tertiary: #6B6B76;

  /* Accent */
  --accent-primary: #2894F9;
  --accent-primary-hover: #3CA3FF;
  --accent-primary-muted: rgba(40, 148, 249, 0.15);

  /* Trading */
  --color-buy: #00D26A;
  --color-buy-hover: #00E87A;
  --color-buy-muted: rgba(0, 210, 106, 0.12);
  --color-sell: #FF3B3B;
  --color-sell-hover: #FF5252;
  --color-sell-muted: rgba(255, 59, 59, 0.12);

  /* Borders */
  --border-default: #2A2A32;
  --border-subtle: #222228;
  --border-strong: #3A3A44;

  /* Brand */
  --brand-turquoise: #00B5EB;
  --brand-green: #06F922;

  /* Indian Theme Override */
  --accent-primary-india: #FD7D02;

  /* Typography */
  --font-primary: "Roboto", "Helvetica", "Arial", sans-serif;
  --font-size-base: 14px;

  /* Spacing */
  --space-unit: 4px;

  /* Border Radius */
  --radius-sm: 2px;
  --radius-base: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;

  /* Transitions */
  --transition-standard: 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## Sources

- delta.exchange page source (CSS variables extracted)
- logotyp.us/logo/delta-exchange (brand colors)
- Screenshot analysis: `.context/attachments/image.png` (options chain interface)
- bitdegree.org delta exchange review (banner gradient, CTA colors)
- nadcab.com case study (gradient and typography references)
- global.delta.exchange source (MUI component styles)
- App Store / Google Play listings (general UI description)
