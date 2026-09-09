from fastapi import APIRouter, Request

from app.dependencies import CurrentUser, DbSession
from app.schemas.order import OrderOut
from app.services.orders import confirm_mock_payment, handle_portone_webhook

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/config")
def payment_config():
    from app.config import settings

    return {
        "mock": settings.use_mock_payments,
        "store_id": settings.portone_store_id or None,
        "channel_key": settings.portone_channel_key or None,
    }


@router.post("/portone/webhook")
async def portone_webhook(request: Request, db: DbSession):
    payload = await request.json()
    await handle_portone_webhook(db, payload)
    return {"ok": True}


@router.post("/mock/{order_id}/confirm", response_model=OrderOut)
def mock_confirm_payment(order_id: int, current_user: CurrentUser, db: DbSession):
    return confirm_mock_payment(db, order_id, current_user)
