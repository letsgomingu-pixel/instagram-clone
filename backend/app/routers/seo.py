from fastapi import APIRouter
from fastapi.responses import Response

from app.dependencies import DbSession
from app.services.sitemap import build_content_sitemap

router = APIRouter()


@router.get("/sitemap.xml")
def sitemap_xml(db: DbSession):
    xml = build_content_sitemap(db)
    return Response(
        content=xml,
        media_type="application/xml; charset=utf-8",
        headers={"Cache-Control": "public, max-age=300"},
    )
