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
        "portone_enabled": settings.portone_enabled,
        "seed_demo_users": settings.seed_demo_users,
        "max_image_upload_mb": settings.max_upload_size_mb,
        "max_video_upload_mb": settings.max_video_upload_size_mb,
    }
