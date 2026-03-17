"""Share handler — create and retrieve shareable card snapshots."""

import logging
import uuid

from app.database import get_snapshot, save_snapshot

logger = logging.getLogger(__name__)


async def create_share(card_type: str, data: dict) -> dict:
    """Create a shareable snapshot and return its ID + URL."""
    snapshot_id = uuid.uuid4().hex[:8]
    await save_snapshot(snapshot_id, card_type, data)
    return {
        "id": snapshot_id,
        "card_type": card_type,
        "url": f"/share/{snapshot_id}",
    }


async def get_share(snapshot_id: str) -> dict | None:
    """Retrieve a shared snapshot by ID."""
    snapshot = await get_snapshot(snapshot_id)
    if not snapshot:
        return None
    return {
        "id": snapshot["id"],
        "card_type": snapshot["card_type"],
        "data": snapshot["card_data"],
        "created_at": snapshot.get("created_at", ""),
    }
