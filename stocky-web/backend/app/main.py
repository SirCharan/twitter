import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.config import ALLOWED_ORIGINS
from app.database import (
    create_user,
    delete_conversation,
    get_conversation_list,
    get_conversation_messages,
    get_pending_action,
    get_user,
    get_user_count,
    init_db,
)
from app.handlers.chat import handle_chat
from app.handlers.trading import cancel_trade, confirm_trade
from app.kite_auth import auto_login, get_authenticated_kite
from app.models import (
    AlertRequest,
    ChatRequest,
    ChatResponse,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    TradeActionRequest,
)

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    logger.info("Stocky Web API started")
    yield
    logger.info("Stocky Web API shutting down")


app = FastAPI(title="Stocky AI", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Health ---

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "stocky-web"}


# --- Auth ---

@app.post("/api/auth/register", response_model=TokenResponse)
async def register(req: RegisterRequest):
    """Register a new user. Only works if no users exist yet (first-run setup)."""
    count = await get_user_count()
    if count > 0:
        existing = await get_user(req.username)
        if existing:
            raise HTTPException(400, "User already exists")
    await create_user(req.username, hash_password(req.password))
    token = create_access_token(req.username)
    return TokenResponse(access_token=token)


@app.post("/api/auth/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    user = await get_user(req.username)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = create_access_token(req.username)
    return TokenResponse(access_token=token)


@app.get("/api/auth/me")
async def me(username: str = Depends(get_current_user)):
    return {"username": username}


# --- Chat ---

@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, username: str = Depends(get_current_user)):
    result = await handle_chat(
        message=req.message,
        username=username,
        conversation_id=req.conversation_id,
    )
    return ChatResponse(
        type=result.get("type", "text"),
        content=result.get("content", ""),
        data=result.get("data"),
        action_id=result.get("action_id"),
        conversation_id=result.get("conversation_id", ""),
    )


# --- Trade confirmation ---

@app.post("/api/trade/confirm")
async def trade_action(req: TradeActionRequest, username: str = Depends(get_current_user)):
    if req.action == "confirm":
        return await confirm_trade(req.action_id, username)
    elif req.action == "cancel":
        return await cancel_trade(req.action_id, username)
    raise HTTPException(400, "action must be 'confirm' or 'cancel'")


# --- Conversations ---

@app.get("/api/conversations")
async def list_conversations(username: str = Depends(get_current_user)):
    return await get_conversation_list(username)


@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, username: str = Depends(get_current_user)):
    messages = await get_conversation_messages(conversation_id)
    return {"conversation_id": conversation_id, "messages": messages}


@app.delete("/api/conversations/{conversation_id}")
async def remove_conversation(conversation_id: str, username: str = Depends(get_current_user)):
    await delete_conversation(conversation_id, username)
    return {"status": "deleted"}


# --- Kite ---

@app.get("/api/kite/status")
async def kite_status(username: str = Depends(get_current_user)):
    kite_obj = await get_authenticated_kite()
    return {"connected": kite_obj is not None}


@app.post("/api/kite/login")
async def kite_login(username: str = Depends(get_current_user)):
    try:
        await auto_login()
        return {"status": "success", "message": "Kite login successful"}
    except Exception as e:
        raise HTTPException(500, f"Kite login failed: {e}")


# --- Alerts ---

@app.get("/api/alerts")
async def list_alerts(username: str = Depends(get_current_user)):
    from app.handlers.alerts import get_alerts
    return await get_alerts()


@app.post("/api/alerts")
async def create_alert_endpoint(req: AlertRequest, username: str = Depends(get_current_user)):
    from app.handlers.alerts import create_alert
    return await create_alert(req.symbol, req.direction, req.target_price)


@app.delete("/api/alerts/{alert_id}")
async def delete_alert_endpoint(alert_id: int, username: str = Depends(get_current_user)):
    from app.handlers.alerts import delete_alert
    return await delete_alert(alert_id)
