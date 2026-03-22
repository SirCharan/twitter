import os
import secrets

from dotenv import load_dotenv

load_dotenv()

# Zerodha Kite Connect
KITE_API_KEY = os.environ.get("KITE_API_KEY", "")
KITE_API_SECRET = os.environ.get("KITE_API_SECRET", "")
KITE_USER_ID = os.environ.get("KITE_USER_ID", "")
KITE_PASSWORD = os.environ.get("KITE_PASSWORD", "")
KITE_TOTP_SECRET = os.environ.get("KITE_TOTP_SECRET", "")

# Database
DB_PATH = os.environ.get("DB_PATH", "stocky_web.db")

# Groq AI
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_API_KEY_2 = os.environ.get("GROQ_API_KEY_2", "")
GROQ_API_KEY_3 = os.environ.get("GROQ_API_KEY_3", "")
GROQ_API_KEY_4 = os.environ.get("GROQ_API_KEY_4", "")
GROQ_API_KEY_5 = os.environ.get("GROQ_API_KEY_5", "")
GROQ_API_KEY_6 = os.environ.get("GROQ_API_KEY_6", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_TRIAD_MODEL = os.environ.get("GROQ_TRIAD_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")
# Council: heavy model for critical agents (TS, FA, CSO), light for speed agents (MP, RG, ME)
GROQ_COUNCIL_MODEL_HEAVY = os.environ.get("GROQ_COUNCIL_MODEL_HEAVY", "llama-3.3-70b-versatile")
GROQ_COUNCIL_MODEL_LIGHT = os.environ.get("GROQ_COUNCIL_MODEL_LIGHT", GROQ_TRIAD_MODEL)

# GNews API
GNEWS_API_KEY = os.environ.get("GNEWS_API_KEY", "")

# OpenRouter AI (Deep Research)
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "google/gemini-2.5-pro-preview")
GROQ_CONV_MODEL = os.environ.get("GROQ_CONV_MODEL", "openai/gpt-oss-120b")

# Web auth
WEB_SECRET_KEY = os.environ.get("WEB_SECRET_KEY", secrets.token_urlsafe(32))
ACCESS_TOKEN_EXPIRE_DAYS = int(os.environ.get("ACCESS_TOKEN_EXPIRE_DAYS", "30"))

# CORS
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]
