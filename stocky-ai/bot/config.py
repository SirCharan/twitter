import os
from dotenv import load_dotenv

load_dotenv()

# Telegram
TELEGRAM_BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
ALLOWED_USER_IDS = [int(x) for x in os.environ.get("ALLOWED_USER_IDS", "").split(",") if x]

# Zerodha Kite Connect
KITE_API_KEY = os.environ["KITE_API_KEY"]
KITE_API_SECRET = os.environ["KITE_API_SECRET"]
KITE_USER_ID = os.environ["KITE_USER_ID"]
KITE_PASSWORD = os.environ["KITE_PASSWORD"]
KITE_TOTP_SECRET = os.environ["KITE_TOTP_SECRET"]

# Database
DB_PATH = os.environ.get("DB_PATH", "stocky.db")

# Alerts & exit rules check interval
ALERT_CHECK_INTERVAL_SECONDS = int(os.environ.get("ALERT_CHECK_INTERVAL_SECONDS", "15"))

# Max Loss defaults
DEFAULT_MAX_LOSS_DAILY = float(os.environ.get("DEFAULT_MAX_LOSS_DAILY", "0"))
DEFAULT_MAX_LOSS_OVERALL = float(os.environ.get("DEFAULT_MAX_LOSS_OVERALL", "0"))
