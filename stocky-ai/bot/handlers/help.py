from telegram import Update
from telegram.ext import ContextTypes

from bot.auth_check import authorized

HELP_TEXT = """<b>Stocky</b> — data and execution, no fluff.

Talk to me in plain English or use commands.

<b>Examples:</b>
  "how is reliance doing"
  "price of INFY"
  "buy 10 TCS at 3500"
  "my portfolio"
  "alert NIFTY above 24000"

<b>Commands:</b>

<b>Trade:</b>
  /buy &lt;symbol&gt; &lt;qty&gt; [price] [product]
  /sell &lt;symbol&gt; &lt;qty&gt; [price] [product]
  /sl &lt;symbol&gt; &lt;qty&gt; &lt;trigger&gt; [limit]

<b>Portfolio:</b>
  /portfolio / /positions / /holdings / /orders / /margins

<b>Market:</b>
  /price &lt;symbol&gt;
  /analyse &lt;symbol&gt;
  /news [symbol] — market headlines (or stock-specific)
  /overview — market snapshot (indices, gainers, losers, breadth)

<b>Alerts:</b>
  /alert &lt;symbol&gt; &lt;above|below&gt; &lt;price&gt;
  /alerts / /delalert &lt;id&gt;

<b>Exit Rules:</b>
  /exitrule &lt;option&gt; &lt;qty&gt; &lt;exitabove|exitbelow&gt; &lt;price&gt; &lt;underlying&gt;
  /exitrules / /delexitrule &lt;id&gt;

<b>Risk:</b>
  /maxloss [daily|overall &lt;amount&gt; | off]

<b>Other:</b>
  /usage — API token usage (today + all time)
  /login / /status"""


@authorized
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    name = update.effective_user.first_name or "boss"
    await update.message.reply_text(
        f"{name}. I'm <b>Stocky</b>.\n\n"
        "Analyse stocks. Execute trades. Track your portfolio. Watch price levels. "
        "Enforce risk limits.\n\n"
        "Just tell me what you need. No commands necessary — but they work too.\n\n"
        "Type <b>help</b> for the full list.",
        parse_mode="HTML",
    )


@authorized
async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(HELP_TEXT, parse_mode="HTML")
