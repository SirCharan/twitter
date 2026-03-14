from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None


class ChatResponse(BaseModel):
    type: str
    content: str
    data: dict | None = None
    action_id: str | None = None
    conversation_id: str


class TradeActionRequest(BaseModel):
    action_id: str
    action: str  # "confirm" or "cancel"


class AlertRequest(BaseModel):
    symbol: str
    direction: str  # "above" or "below"
    target_price: float


class ResearchRequest(BaseModel):
    stock: str
    mode: str = "full"


class ScanRequest(BaseModel):
    scan_type: str = "volume_pump"


class ChartRequest(BaseModel):
    stock: str
    chart_type: str = "tradingview"


class CompareRequest(BaseModel):
    stocks: str  # comma-separated


class SummariseRequest(BaseModel):
    text: str


class AgentDebateRequest(BaseModel):
    query: str
    conversation_id: str | None = None


class AnalyticsEvent(BaseModel):
    event_type: str
    event_name: str
    event_data: dict | None = None
    platform: str = "web"
    conversation_id: str | None = None
    session_id: str | None = None


class AnalyticsBatchRequest(BaseModel):
    events: list[AnalyticsEvent]
