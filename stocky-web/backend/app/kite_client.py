import asyncio
import logging

from kiteconnect import KiteConnect

from app.kite_auth import get_authenticated_kite

logger = logging.getLogger(__name__)


class NotLoggedInError(Exception):
    pass


class KiteClient:
    """Async wrapper around the KiteConnect SDK."""

    async def _get_kite(self) -> KiteConnect:
        kite = await get_authenticated_kite()
        if not kite:
            raise NotLoggedInError("Not logged in. Trigger /api/kite/login first.")
        return kite

    async def _run(self, func, *args, **kwargs):
        loop = asyncio.get_event_loop()
        try:
            from app.database import log_api_call
            endpoint = getattr(func, "__name__", str(func))
            await log_api_call("kite", endpoint)
        except Exception:
            pass
        return await loop.run_in_executor(None, lambda: func(*args, **kwargs))

    # --- Orders ---

    async def place_order(
        self,
        symbol: str,
        exchange: str,
        txn_type: str,
        quantity: int,
        order_type: str,
        product: str,
        price: float | None = None,
        trigger_price: float | None = None,
        variety: str = "regular",
    ) -> str:
        kite = await self._get_kite()
        params = dict(
            variety=variety,
            tradingsymbol=symbol,
            exchange=exchange,
            transaction_type=txn_type,
            quantity=quantity,
            order_type=order_type,
            product=product,
        )
        if price is not None:
            params["price"] = price
        if trigger_price is not None:
            params["trigger_price"] = trigger_price
        return await self._run(kite.place_order, **params)

    async def get_orders(self) -> list:
        kite = await self._get_kite()
        return await self._run(kite.orders)

    async def cancel_order(self, order_id: str, variety: str = "regular") -> str:
        kite = await self._get_kite()
        return await self._run(kite.cancel_order, variety, order_id)

    # --- Portfolio ---

    async def get_positions(self) -> dict:
        kite = await self._get_kite()
        return await self._run(kite.positions)

    async def get_holdings(self) -> list:
        kite = await self._get_kite()
        return await self._run(kite.holdings)

    # --- Market Data ---

    async def get_ltp(self, *instruments: str) -> dict:
        kite = await self._get_kite()
        return await self._run(kite.ltp, list(instruments))

    async def get_quote(self, *instruments: str) -> dict:
        kite = await self._get_kite()
        return await self._run(kite.quote, list(instruments))

    # --- Account ---

    async def get_margins(self) -> dict:
        kite = await self._get_kite()
        return await self._run(kite.margins)

    async def get_profile(self) -> dict:
        kite = await self._get_kite()
        return await self._run(kite.profile)


# Singleton instance
kite = KiteClient()
