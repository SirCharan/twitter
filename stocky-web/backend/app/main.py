import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.config import ALLOWED_ORIGINS
from app.database import (
    delete_conversation,
    get_conversation_list,
    get_conversation_messages,
    init_db,
)
from app.handlers.chat import handle_chat
from app.handlers.trading import cancel_trade, confirm_trade
from app.kite_auth import auto_login, get_authenticated_kite
from app.models import (
    AgentDebateRequest,
    AlertRequest,
    AnalyticsBatchRequest,
    ChartRequest,
    ChatRequest,
    ChatResponse,
    CompareRequest,
    ResearchRequest,
    ScanRequest,
    SummariseRequest,
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
    from app.config import OPENROUTER_API_KEY
    logger.info("Stocky Web API started | OpenRouter configured: %s", bool(OPENROUTER_API_KEY))
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

@app.get("/api/auth/me")
async def me():
    return {"username": "CK"}


# --- Chat ---

@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    username = "CK"
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


# --- Deep Research (SSE streaming) ---

@app.post("/api/research")
async def research_stream(req: ResearchRequest):
    """Stream deep research via Server-Sent Events."""
    from app.handlers.deep_research import stream_deep_research
    return StreamingResponse(
        stream_deep_research(req.stock, req.mode),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# --- General Deep Research (Agent Debate SSE) ---

@app.post("/api/deep-research")
async def deep_research_general(req: AgentDebateRequest):
    """Stream general deep research via dual-agent debate SSE."""
    import json as _json
    from app.handlers.agent_debate import stream_agent_debate

    async def safe_stream():
        try:
            async for chunk in stream_agent_debate(req.query):
                yield chunk
        except Exception as e:
            logger.error(f"Deep research stream error: {e}", exc_info=True)
            yield f"data: {_json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        safe_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# --- Feature endpoints ---

@app.post("/api/scan")
async def scan_endpoint(req: ScanRequest):
    from app.handlers.scan import run_scan
    try:
        data = await run_scan(req.scan_type)
        return {"type": "scan", "data": data}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/chart")
async def chart_endpoint(req: ChartRequest):
    from app.handlers.chart import generate_chart
    try:
        data = await generate_chart(req.stock, req.chart_type)
        return {"type": "chart", "data": data}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/compare")
async def compare_endpoint(req: CompareRequest):
    from app.handlers.compare import compare_stocks
    try:
        data = await compare_stocks(req.stocks)
        return {"type": "compare", "data": data}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/api/ipo")
async def ipo_endpoint():
    from app.handlers.ipo import get_ipo_data
    try:
        data = await get_ipo_data()
        return {"type": "ipo", "data": data}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/api/macro")
async def macro_endpoint():
    from app.handlers.macro import get_macro_data
    try:
        data = await get_macro_data()
        return {"type": "macro", "data": data}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/api/rrg")
async def rrg_endpoint():
    from app.handlers.rrg import get_rrg_data
    try:
        data = await get_rrg_data()
        return {"type": "rrg", "data": data}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/summarise")
async def summarise_endpoint(req: SummariseRequest):
    from app import ai_client
    try:
        prompt = (
            f"Summarise the following in 3 bullet points + 1-line TL;DR. "
            f"Be concise and specific:\n\n{req.text[:3000]}"
        )
        summary = await ai_client.chat(prompt)
        return {"type": "text", "content": summary}
    except Exception as e:
        raise HTTPException(500, str(e))


# --- Trade confirmation ---

@app.post("/api/trade/confirm")
async def trade_action(req: TradeActionRequest):
    username = "CK"
    if req.action == "confirm":
        return await confirm_trade(req.action_id, username)
    elif req.action == "cancel":
        return await cancel_trade(req.action_id, username)
    raise HTTPException(400, "action must be 'confirm' or 'cancel'")


# --- Conversations ---

@app.get("/api/conversations")
async def list_conversations():
    return await get_conversation_list("CK")


@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    messages = await get_conversation_messages(conversation_id, "CK")
    return {"conversation_id": conversation_id, "messages": messages}


@app.delete("/api/conversations/{conversation_id}")
async def remove_conversation(conversation_id: str):
    await delete_conversation(conversation_id, "CK")
    return {"status": "deleted"}


# --- Kite ---

@app.get("/api/kite/status")
async def kite_status():
    kite_obj = await get_authenticated_kite()
    return {"connected": kite_obj is not None}


@app.post("/api/kite/login")
async def kite_login():
    try:
        await auto_login()
        return {"status": "success", "message": "Kite login successful"}
    except Exception as e:
        raise HTTPException(500, f"Kite login failed: {e}")


# --- Alerts ---

@app.get("/api/alerts")
async def list_alerts():
    from app.handlers.alerts import get_alerts
    return await get_alerts()


@app.post("/api/alerts")
async def create_alert_endpoint(req: AlertRequest):
    from app.handlers.alerts import create_alert
    return await create_alert(req.symbol, req.direction, req.target_price)


@app.delete("/api/alerts/{alert_id}")
async def delete_alert_endpoint(alert_id: int):
    from app.handlers.alerts import delete_alert
    return await delete_alert(alert_id)


# --- Analytics ---

@app.post("/api/analytics/track")
async def track_analytics(req: AnalyticsBatchRequest):
    from app.database import log_analytics_batch
    events = [e.model_dump() for e in req.events]
    await log_analytics_batch(events)
    return {"status": "ok", "count": len(events)}


@app.get("/api/analytics/dashboard")
async def analytics_dashboard(days: int = 30):
    from app.database import (
        get_analytics_daily_counts,
        get_analytics_feature_counts,
        get_analytics_hourly_distribution,
        get_analytics_platform_breakdown,
        get_analytics_recent,
        get_analytics_summary,
    )
    return {
        "daily_counts": await get_analytics_daily_counts(days),
        "feature_counts": await get_analytics_feature_counts(days),
        "hourly_distribution": await get_analytics_hourly_distribution(days),
        "platform_breakdown": await get_analytics_platform_breakdown(days),
        "recent_activity": await get_analytics_recent(),
        "summary": await get_analytics_summary(),
    }
