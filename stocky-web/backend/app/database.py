import json
import uuid
from datetime import datetime

import aiosqlite

from app.config import DB_PATH


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS kite_session (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                access_token TEXT,
                login_time TEXT
            );

            INSERT OR IGNORE INTO kite_session (id) VALUES (1);

            CREATE TABLE IF NOT EXISTS web_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                username TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                message_type TEXT DEFAULT 'text',
                structured_data TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS pending_actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action_id TEXT UNIQUE NOT NULL,
                username TEXT NOT NULL,
                conversation_id TEXT NOT NULL,
                action_type TEXT NOT NULL,
                action_data TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TEXT DEFAULT (datetime('now')),
                resolved_at TEXT
            );

            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                target_price REAL NOT NULL,
                direction TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                triggered INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS trade_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id TEXT,
                symbol TEXT NOT NULL,
                exchange TEXT NOT NULL,
                transaction_type TEXT NOT NULL,
                order_type TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                price REAL,
                trigger_price REAL,
                product TEXT NOT NULL,
                status TEXT,
                placed_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS command_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                command TEXT NOT NULL,
                args TEXT,
                source TEXT DEFAULT 'web',
                ts TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS api_call_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service TEXT NOT NULL,
                endpoint TEXT NOT NULL,
                tokens INTEGER DEFAULT 0,
                ts TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS analytics_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                event_name TEXT NOT NULL,
                event_data TEXT,
                platform TEXT NOT NULL DEFAULT 'web',
                conversation_id TEXT,
                session_id TEXT,
                ts TEXT DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_analytics_ts ON analytics_events(ts);
            CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);

            CREATE TABLE IF NOT EXISTS watchlist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL UNIQUE,
                added_at TEXT DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_watchlist_symbol ON watchlist(symbol);

            CREATE TABLE IF NOT EXISTS shared_snapshots (
                id TEXT PRIMARY KEY,
                card_type TEXT NOT NULL,
                card_data TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            );
        """)
        await db.commit()


# --- Kite Session ---

async def save_session(access_token: str, login_time: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE kite_session SET access_token = ?, login_time = ? WHERE id = 1",
            (access_token, login_time),
        )
        await db.commit()


async def get_session() -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM kite_session WHERE id = 1")
        row = await cursor.fetchone()
        if row and row["access_token"]:
            return dict(row)
        return None


async def clear_session():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE kite_session SET access_token = NULL, login_time = NULL WHERE id = 1"
        )
        await db.commit()


# --- Web Users ---

async def create_user(username: str, password_hash: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO web_users (username, password_hash) VALUES (?, ?)",
            (username, password_hash),
        )
        await db.commit()


async def get_user(username: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM web_users WHERE username = ?", (username,)
        )
        row = await cursor.fetchone()
        return dict(row) if row else None


async def get_user_count() -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("SELECT COUNT(*) FROM web_users")
        return (await cursor.fetchone())[0]


# --- Conversations ---

async def save_message(
    conversation_id: str,
    username: str,
    role: str,
    content: str,
    message_type: str = "text",
    structured_data: dict | None = None,
):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO conversations
               (conversation_id, username, role, content, message_type, structured_data)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                conversation_id,
                username,
                role,
                content,
                message_type,
                json.dumps(structured_data) if structured_data else None,
            ),
        )
        await db.commit()


async def get_conversation_messages(
    conversation_id: str, username: str = "CK", limit: int = 50
) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT * FROM conversations
               WHERE conversation_id = ? AND username = ?
               ORDER BY id ASC LIMIT ?""",
            (conversation_id, username, limit),
        )
        rows = await cursor.fetchall()
        results = []
        for r in rows:
            d = dict(r)
            if d.get("structured_data"):
                d["structured_data"] = json.loads(d["structured_data"])
            results.append(d)
        return results


async def get_recent_history(conversation_id: str, limit: int = 10) -> list[dict]:
    """Get last N messages for Groq context."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT role, content FROM conversations
               WHERE conversation_id = ?
               ORDER BY id DESC LIMIT ?""",
            (conversation_id, limit),
        )
        rows = await cursor.fetchall()
        return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]


async def get_conversation_list(username: str, limit: int = 50) -> list[dict]:
    """Get list of conversations with first message preview."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT conversation_id,
                      MIN(created_at) as started_at,
                      MAX(created_at) as last_active,
                      (SELECT content FROM conversations c2
                       WHERE c2.conversation_id = c.conversation_id
                       AND c2.role = 'user'
                       ORDER BY c2.id ASC LIMIT 1) as preview
               FROM conversations c
               WHERE username = ?
               GROUP BY conversation_id
               ORDER BY MAX(id) DESC
               LIMIT ?""",
            (username, limit),
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]


async def delete_conversation(conversation_id: str, username: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "DELETE FROM conversations WHERE conversation_id = ? AND username = ?",
            (conversation_id, username),
        )
        await db.commit()


# --- Pending Actions ---

async def create_pending_action(
    username: str,
    conversation_id: str,
    action_type: str,
    action_data: dict,
) -> str:
    action_id = uuid.uuid4().hex[:12]
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO pending_actions
               (action_id, username, conversation_id, action_type, action_data)
               VALUES (?, ?, ?, ?, ?)""",
            (action_id, username, conversation_id, action_type, json.dumps(action_data)),
        )
        await db.commit()
    return action_id


async def get_pending_action(action_id: str, username: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT * FROM pending_actions
               WHERE action_id = ? AND username = ? AND status = 'pending'""",
            (action_id, username),
        )
        row = await cursor.fetchone()
        if not row:
            return None
        d = dict(row)
        d["action_data"] = json.loads(d["action_data"])
        return d


async def resolve_pending_action(action_id: str, status: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """UPDATE pending_actions
               SET status = ?, resolved_at = datetime('now')
               WHERE action_id = ?""",
            (status, action_id),
        )
        await db.commit()


# --- Alerts ---

async def add_alert(symbol: str, target_price: float, direction: str) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "INSERT INTO alerts (symbol, target_price, direction) VALUES (?, ?, ?)",
            (symbol, target_price, direction),
        )
        await db.commit()
        return cursor.lastrowid


async def get_active_alerts() -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM alerts WHERE triggered = 0")
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]


async def delete_alert(alert_id: int) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("DELETE FROM alerts WHERE id = ?", (alert_id,))
        await db.commit()
        return cursor.rowcount > 0


# --- Trade History ---

async def log_trade(
    order_id: str,
    symbol: str,
    exchange: str,
    transaction_type: str,
    order_type: str,
    quantity: int,
    price: float | None,
    trigger_price: float | None,
    product: str,
    status: str | None = None,
):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO trade_history
               (order_id, symbol, exchange, transaction_type, order_type,
                quantity, price, trigger_price, product, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (order_id, symbol, exchange, transaction_type, order_type,
             quantity, price, trigger_price, product, status),
        )
        await db.commit()


# --- Logging ---

async def log_command(command: str, args: str = "", source: str = "web"):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO command_log (command, args, source) VALUES (?, ?, ?)",
            (command, args, source),
        )
        await db.commit()


async def log_api_call(service: str, endpoint: str, tokens: int = 0):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO api_call_log (service, endpoint, tokens) VALUES (?, ?, ?)",
            (service, endpoint, tokens),
        )
        await db.commit()


async def get_api_usage_today() -> list[tuple]:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT service, endpoint, COUNT(*) as cnt FROM api_call_log "
            "WHERE date(ts) = date('now') GROUP BY service, endpoint ORDER BY cnt DESC"
        )
        return await cursor.fetchall()


async def get_api_totals() -> tuple[int, int]:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT COUNT(*) FROM api_call_log WHERE date(ts) = date('now')"
        )
        today = (await cursor.fetchone())[0]
        cursor = await db.execute("SELECT COUNT(*) FROM api_call_log")
        alltime = (await cursor.fetchone())[0]
        return today, alltime


# --- Watchlist ---

async def add_to_watchlist(symbol: str) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "INSERT OR IGNORE INTO watchlist (symbol) VALUES (?)", (symbol.upper(),)
        )
        await db.commit()
        return cursor.lastrowid


async def get_watchlist() -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM watchlist ORDER BY added_at DESC")
        return [dict(r) for r in await cursor.fetchall()]


async def remove_from_watchlist(symbol: str) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "DELETE FROM watchlist WHERE symbol = ?", (symbol.upper(),)
        )
        await db.commit()
        return cursor.rowcount > 0


# --- Shared Snapshots ---

async def save_snapshot(snapshot_id: str, card_type: str, card_data: dict):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO shared_snapshots (id, card_type, card_data) VALUES (?, ?, ?)",
            (snapshot_id, card_type, json.dumps(card_data)),
        )
        await db.commit()


async def get_snapshot(snapshot_id: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM shared_snapshots WHERE id = ?", (snapshot_id,)
        )
        row = await cursor.fetchone()
        if not row:
            return None
        d = dict(row)
        d["card_data"] = json.loads(d["card_data"])
        return d


async def get_ai_token_totals() -> tuple[int, int]:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT COALESCE(SUM(tokens), 0) FROM api_call_log "
            "WHERE service IN ('groq', 'openrouter') AND date(ts) = date('now')"
        )
        today = (await cursor.fetchone())[0]
        cursor = await db.execute(
            "SELECT COALESCE(SUM(tokens), 0) FROM api_call_log "
            "WHERE service IN ('groq', 'openrouter')"
        )
        alltime = (await cursor.fetchone())[0]
        return today, alltime


# --- Analytics ---

async def log_analytics_batch(events: list[dict]):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executemany(
            """INSERT INTO analytics_events
               (event_type, event_name, event_data, platform, conversation_id, session_id)
               VALUES (?, ?, ?, ?, ?, ?)""",
            [
                (
                    e["event_type"],
                    e["event_name"],
                    json.dumps(e.get("event_data")) if e.get("event_data") else None,
                    e.get("platform", "web"),
                    e.get("conversation_id"),
                    e.get("session_id"),
                )
                for e in events
            ],
        )
        await db.commit()


async def get_analytics_daily_counts(days: int = 30) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            """SELECT date(ts) as day, COUNT(*) as count
               FROM analytics_events
               WHERE ts >= datetime('now', ?)
               GROUP BY date(ts) ORDER BY day""",
            (f"-{days} days",),
        )
        return [{"day": r[0], "count": r[1]} for r in await cursor.fetchall()]


async def get_analytics_feature_counts(days: int = 30) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            """SELECT event_name, COUNT(*) as count
               FROM analytics_events
               WHERE ts >= datetime('now', ?)
               GROUP BY event_name ORDER BY count DESC LIMIT 20""",
            (f"-{days} days",),
        )
        return [{"name": r[0], "count": r[1]} for r in await cursor.fetchall()]


async def get_analytics_hourly_distribution(days: int = 30) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            """SELECT CAST(strftime('%%H', ts) AS INTEGER) as hour, COUNT(*) as count
               FROM analytics_events
               WHERE ts >= datetime('now', ?)
               GROUP BY hour ORDER BY hour""",
            (f"-{days} days",),
        )
        return [{"hour": r[0], "count": r[1]} for r in await cursor.fetchall()]


async def get_analytics_platform_breakdown(days: int = 30) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            """SELECT platform, COUNT(*) as count
               FROM analytics_events
               WHERE ts >= datetime('now', ?)
               GROUP BY platform""",
            (f"-{days} days",),
        )
        return [{"platform": r[0], "count": r[1]} for r in await cursor.fetchall()]


async def get_analytics_recent(limit: int = 50) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM analytics_events ORDER BY id DESC LIMIT ?", (limit,)
        )
        rows = await cursor.fetchall()
        results = []
        for r in rows:
            d = dict(r)
            if d.get("event_data"):
                d["event_data"] = json.loads(d["event_data"])
            results.append(d)
        return results


async def get_analytics_summary() -> dict:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT COUNT(*) FROM analytics_events WHERE date(ts) = date('now')"
        )
        today = (await cursor.fetchone())[0]
        cursor = await db.execute("SELECT COUNT(*) FROM analytics_events")
        alltime = (await cursor.fetchone())[0]
        cursor = await db.execute(
            "SELECT COUNT(DISTINCT session_id) FROM analytics_events WHERE date(ts) = date('now') AND session_id IS NOT NULL"
        )
        sessions_today = (await cursor.fetchone())[0]
        return {"today": today, "alltime": alltime, "sessions_today": sessions_today}
