from fastapi import APIRouter

from app.config import settings

router = APIRouter()


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "Instagram clone API is running",
        "email_delivery_ready": settings.email_delivery_ready,
        "payments_mock": settings.use_mock_payments,
    }
