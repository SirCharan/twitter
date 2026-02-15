import aiosqlite

from bot.config import DB_PATH


async def init_db():
    """Create tables if they don't exist."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                target_price REAL NOT NULL,
                direction TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                triggered INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS exit_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                option_symbol TEXT NOT NULL,
                option_exchange TEXT NOT NULL DEFAULT 'NFO',
                qty INTEGER NOT NULL,
                direction TEXT NOT NULL,
                trigger_price REAL NOT NULL,
                underlying_symbol TEXT NOT NULL,
                underlying_exchange TEXT NOT NULL DEFAULT 'NSE',
                product TEXT NOT NULL DEFAULT 'NRML',
                executed INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now'))
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

            CREATE TABLE IF NOT EXISTS max_loss_config (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                daily_limit REAL DEFAULT 0,
                overall_limit REAL DEFAULT 0,
                trades_blocked INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS kite_session (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                access_token TEXT,
                login_time TEXT
            );

            INSERT OR IGNORE INTO max_loss_config (id, daily_limit, overall_limit, trades_blocked)
            VALUES (1, 0, 0, 0);

            INSERT OR IGNORE INTO kite_session (id) VALUES (1);

            CREATE TABLE IF NOT EXISTS command_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                command TEXT NOT NULL,
                args TEXT,
                source TEXT DEFAULT 'command',
                ts TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS api_call_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service TEXT NOT NULL,
                endpoint TEXT NOT NULL,
                tokens INTEGER DEFAULT 0,
                ts TEXT DEFAULT (datetime('now'))
            );
        """)
        # Migration: add tokens column if missing (for existing DBs)
        try:
            await db.execute("ALTER TABLE api_call_log ADD COLUMN tokens INTEGER DEFAULT 0")
        except Exception:
            pass  # column already exists
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


async def mark_alert_triggered(alert_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE alerts SET triggered = 1 WHERE id = ?", (alert_id,))
        await db.commit()


async def delete_alert(alert_id: int) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("DELETE FROM alerts WHERE id = ?", (alert_id,))
        await db.commit()
        return cursor.rowcount > 0


# --- Exit Rules ---

async def add_exit_rule(
    option_symbol: str,
    option_exchange: str,
    qty: int,
    direction: str,
    trigger_price: float,
    underlying_symbol: str,
    underlying_exchange: str,
    product: str,
) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            """INSERT INTO exit_rules
               (option_symbol, option_exchange, qty, direction, trigger_price,
                underlying_symbol, underlying_exchange, product)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (option_symbol, option_exchange, qty, direction, trigger_price,
             underlying_symbol, underlying_exchange, product),
        )
        await db.commit()
        return cursor.lastrowid


async def get_active_exit_rules() -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM exit_rules WHERE executed = 0")
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]


async def mark_exit_rule_executed(rule_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE exit_rules SET executed = 1 WHERE id = ?", (rule_id,))
        await db.commit()


async def delete_exit_rule(rule_id: int) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("DELETE FROM exit_rules WHERE id = ?", (rule_id,))
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


async def get_recent_trades(limit: int = 10) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM trade_history ORDER BY id DESC LIMIT ?", (limit,)
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]


# --- Max Loss Config ---

async def get_max_loss_config() -> dict:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM max_loss_config WHERE id = 1")
        row = await cursor.fetchone()
        return dict(row)


async def update_max_loss_config(daily_limit: float | None = None, overall_limit: float | None = None):
    async with aiosqlite.connect(DB_PATH) as db:
        if daily_limit is not None:
            await db.execute("UPDATE max_loss_config SET daily_limit = ? WHERE id = 1", (daily_limit,))
        if overall_limit is not None:
            await db.execute("UPDATE max_loss_config SET overall_limit = ? WHERE id = 1", (overall_limit,))
        await db.commit()


async def set_trades_blocked(blocked: bool):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE max_loss_config SET trades_blocked = ? WHERE id = 1", (int(blocked),)
        )
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


# --- Command Log ---

async def log_command(command: str, args: str = "", source: str = "command"):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO command_log (command, args, source) VALUES (?, ?, ?)",
            (command, args, source),
        )
        await db.commit()


async def get_usage_today() -> list[tuple[str, int]]:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT command, COUNT(*) as cnt FROM command_log "
            "WHERE date(ts) = date('now') GROUP BY command ORDER BY cnt DESC"
        )
        return await cursor.fetchall()


async def get_usage_alltime() -> list[tuple[str, int]]:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT command, COUNT(*) as cnt FROM command_log "
            "GROUP BY command ORDER BY cnt DESC"
        )
        return await cursor.fetchall()


async def get_usage_totals() -> tuple[int, int]:
    """Returns (today_total, alltime_total)."""
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT COUNT(*) FROM command_log WHERE date(ts) = date('now')"
        )
        today = (await cursor.fetchone())[0]
        cursor = await db.execute("SELECT COUNT(*) FROM command_log")
        alltime = (await cursor.fetchone())[0]
        return today, alltime


# --- API Call Log ---

async def log_api_call(service: str, endpoint: str, tokens: int = 0):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO api_call_log (service, endpoint, tokens) VALUES (?, ?, ?)",
            (service, endpoint, tokens),
        )
        await db.commit()


async def get_api_usage_today() -> list[tuple[str, str, int]]:
    """Returns [(service, endpoint, count)] for today."""
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT service, endpoint, COUNT(*) as cnt FROM api_call_log "
            "WHERE date(ts) = date('now') GROUP BY service, endpoint ORDER BY cnt DESC"
        )
        return await cursor.fetchall()


async def get_api_usage_alltime() -> list[tuple[str, str, int]]:
    """Returns [(service, endpoint, count)] all time."""
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT service, endpoint, COUNT(*) as cnt FROM api_call_log "
            "GROUP BY service, endpoint ORDER BY cnt DESC"
        )
        return await cursor.fetchall()


async def get_api_totals() -> tuple[int, int]:
    """Returns (today_total, alltime_total) API calls."""
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT COUNT(*) FROM api_call_log WHERE date(ts) = date('now')"
        )
        today = (await cursor.fetchone())[0]
        cursor = await db.execute("SELECT COUNT(*) FROM api_call_log")
        alltime = (await cursor.fetchone())[0]
        return today, alltime


async def get_api_totals_by_service() -> tuple[list[tuple[str, int]], list[tuple[str, int]]]:
    """Returns (today_by_service, alltime_by_service) as [(service, count)]."""
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT service, COUNT(*) as cnt FROM api_call_log "
            "WHERE date(ts) = date('now') GROUP BY service ORDER BY cnt DESC"
        )
        today = await cursor.fetchall()
        cursor = await db.execute(
            "SELECT service, COUNT(*) as cnt FROM api_call_log "
            "GROUP BY service ORDER BY cnt DESC"
        )
        alltime = await cursor.fetchall()
        return today, alltime


async def get_ai_token_totals() -> tuple[int, int]:
    """Returns (today_tokens, alltime_tokens) for groq AI calls."""
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT COALESCE(SUM(tokens), 0) FROM api_call_log "
            "WHERE service = 'groq' AND date(ts) = date('now')"
        )
        today = (await cursor.fetchone())[0]
        cursor = await db.execute(
            "SELECT COALESCE(SUM(tokens), 0) FROM api_call_log "
            "WHERE service = 'groq'"
        )
        alltime = (await cursor.fetchone())[0]
        return today, alltime
