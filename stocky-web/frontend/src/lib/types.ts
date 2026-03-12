export type MessageType =
  | "text"
  | "analysis"
  | "portfolio"
  | "positions"
  | "holdings"
  | "orders"
  | "margins"
  | "price"
  | "news"
  | "overview"
  | "trade_confirm"
  | "order_result"
  | "alerts"
  | "usage"
  | "error"
  | "deep_research"
  | "progress"
  | "scan"
  | "chart"
  | "compare"
  | "ipo"
  | "macro"
  | "rrg"
  | "suggestion";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  type: MessageType;
  data?: Record<string, unknown>;
  actionId?: string;
  timestamp: string;
  conversationId: string;
}

export interface ChatResponse {
  type: MessageType;
  content: string;
  data?: Record<string, unknown>;
  action_id?: string;
  conversation_id: string;
}

export interface ConversationSummary {
  conversation_id: string;
  started_at: string;
  last_active: string;
  preview: string;
}

export interface AnalysisData {
  name: string;
  symbol: string;
  overall_score: number;
  fundamental: {
    score: number;
    sector?: string;
    industry?: string;
    market_cap?: number;
    pe?: number;
    forward_pe?: number;
    roe?: number;
    debt_to_equity?: number;
    earnings_growth?: number;
    revenue_growth?: number;
    profit_margin?: number;
    book_value?: number;
    pb?: number;
    dividend_yield?: number;
  };
  technical: {
    score: number;
    price?: number;
    rsi?: number;
    rsi_label?: string;
    macd?: number;
    macd_signal?: string;
    sma50?: number;
    sma200?: number;
    sma_signal?: string;
    changes?: { period: string; pct: number }[];
    range_52w?: { high: number; low: number; position: number };
    volume_ratio?: number;
  };
  news: {
    score: number;
    analysis?: string;
    articles: {
      source: string;
      title: string;
      date: string;
      sentiment: number;
      link?: string;
    }[];
  };
  quarterly?: {
    period: string;
    revenue?: number;
    net_income?: number;
    eps?: number;
    revenue_qoq?: number;
    revenue_yoy?: number;
    net_income_qoq?: number;
    net_income_yoy?: number;
    eps_qoq?: number;
    eps_yoy?: number;
  }[];
  shareholding?: { description: string; percentage: number | string }[];
  verdict: string;
}

export interface PriceData {
  symbol: string;
  ltp: number;
  change: number;
  pct_change: number;
  open: number;
  high: number;
  low: number;
  prev_close: number;
  volume: number;
}

export interface PortfolioData {
  investments: {
    invested: number;
    current: number;
    pnl: number;
    pct: number;
    count: number;
    top_holdings: {
      symbol: string;
      qty: number;
      avg: number;
      ltp: number;
      pnl: number;
      pct: number;
    }[];
  };
  trading: {
    day_pnl: number;
    realised: number;
    open_count: number;
    closed_count: number;
    positions: {
      symbol: string;
      exchange: string;
      product: string;
      qty: number;
      avg: number;
      ltp: number;
      pnl: number;
      buy_qty: number;
      sell_qty: number;
    }[];
  };
  day_pnl: number;
}

export interface PositionData {
  symbol: string;
  exchange: string;
  quantity: number;
  average_price: number;
  ltp: number;
  pnl: number;
  product: string;
}

export interface HoldingData {
  symbol: string;
  exchange: string;
  quantity: number;
  average_price: number;
  ltp: number;
  pnl: number;
}

export interface OrderData {
  order_id: string;
  symbol: string;
  exchange: string;
  txn_type: string;
  order_type: string;
  quantity: number;
  price: number;
  status: string;
  product: string;
}

export interface TradeConfirmData {
  action_id: string;
  symbol: string;
  exchange: string;
  qty: number;
  price: number | null;
  product: string;
  order_type: string;
  txn_type: string;
}

export interface NewsArticle {
  source: string;
  title: string;
  date: string;
  sentiment: number;
  link?: string;
  summary?: string;
}

export interface OverviewData {
  indices: {
    name: string;
    value: number;
    change: number;
    pct_change: number;
    open?: number;
    high?: number;
    low?: number;
  }[];
  gainers: { symbol: string; ltp: number; pct_change: number }[];
  losers: { symbol: string; ltp: number; pct_change: number }[];
  advances_declines?: {
    advances: number;
    declines: number;
    unchanged: number;
  };
  summary?: string;
}
