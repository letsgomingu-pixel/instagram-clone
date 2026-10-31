from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from app.dependencies import CurrentUser, DbSession
from app.schemas.order import OrderOut
from app.services.inicis import GOPAY_METHODS, close_page, complete_inicis_return
from app.services.orders import confirm_mock_payment, confirm_portone_payment, handle_portone_webhook

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/config")
def payment_config():
    from app.config import settings

    return {
        "provider": "inicis",
        "mock": False,
        "js_url": settings.inicis_js_url,
        "gopaymethod": GOPAY_METHODS,
    }


@router.post("/inicis/return", response_class=HTMLResponse)
async def inicis_return(request: Request, db: DbSession):
    form = await request.form()
    payload = {key: str(value) for key, value in form.items()}
    return await complete_inicis_return(db, payload)


@router.get("/inicis/close", response_class=HTMLResponse)
def inicis_close():
    return close_page()


@router.post("/portone/webhook")
async def portone_webhook(request: Request, db: DbSession):
    payload = await request.json()
    await handle_portone_webhook(db, payload)
    return {"ok": True}


@router.post("/mock/{order_id}/confirm", response_model=OrderOut)
def mock_confirm_payment(order_id: int, current_user: CurrentUser, db: DbSession):
    return confirm_mock_payment(db, order_id, current_user)


@router.post("/{order_id}/confirm", response_model=OrderOut)
async def portone_confirm_payment(order_id: int, current_user: CurrentUser, db: DbSession):
    return await confirm_portone_payment(db, order_id, current_user)
