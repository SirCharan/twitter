from app import database


async def get_alerts() -> list[dict]:
    return await database.get_active_alerts()


async def create_alert(symbol: str, direction: str, target_price: float) -> dict:
    alert_id = await database.add_alert(symbol.upper(), target_price, direction.lower())
    return {
        "id": alert_id,
        "symbol": symbol.upper(),
        "direction": direction.lower(),
        "target_price": target_price,
    }


async def delete_alert(alert_id: int) -> dict:
    deleted = await database.delete_alert(alert_id)
    if deleted:
        return {"status": "deleted", "id": alert_id}
    return {"error": f"Alert {alert_id} not found"}
