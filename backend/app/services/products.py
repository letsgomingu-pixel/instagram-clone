from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Post, Product
from app.schemas.product import ProductCreate, ProductOut


def _is_in_season(product: Product, today: date | None = None) -> bool:
    if product.availability == "year_round":
        return True
    if not product.season_start or not product.season_end:
        return False
    today = today or date.today()
    start, end = product.season_start, product.season_end
    if start <= end:
        return start <= today <= end
    return today >= start or today <= end


def build_product_out(product: Product) -> ProductOut:
    in_season = _is_in_season(product)
    return ProductOut(
        id=product.id,
        name=product.name,
        price=product.price,
        unit=product.unit,
        storage_type=product.storage_type,
        availability=product.availability,
        season_start=product.season_start.isoformat() if product.season_start else None,
        season_end=product.season_end.isoformat() if product.season_end else None,
        stock=product.stock,
        is_active=product.is_active,
        is_in_season=in_season,
        is_available=product.is_active and product.stock > 0 and in_season,
    )


def _products_for_posts(db: Session, posts: list[Post]) -> dict[int, ProductOut]:
    if not posts:
        return {}

    product_post_ids = [p.id for p in posts if p.post_type == "product"]
    review_product_ids = [
        p.reviewed_product_id for p in posts if p.post_type == "review" and p.reviewed_product_id
    ]

    result: dict[int, ProductOut] = {}

    if product_post_ids:
        rows = db.scalars(select(Product).where(Product.post_id.in_(product_post_ids))).all()
        for row in rows:
            result[row.post_id] = build_product_out(row)

    if review_product_ids:
        rows = db.scalars(select(Product).where(Product.id.in_(review_product_ids))).all()
        by_id = {row.id: build_product_out(row) for row in rows}
        for post in posts:
            if post.post_type == "review" and post.reviewed_product_id in by_id:
                result[post.id] = by_id[post.reviewed_product_id]

    return result


def product_for_post(db: Session, post: Post) -> ProductOut | None:
    return _products_for_posts(db, [post]).get(post.id)


def create_product_listing(
    db: Session,
    seller_id: int,
    post: Post,
    data: ProductCreate,
) -> Product:
    product = Product(
        seller_id=seller_id,
        post_id=post.id,
        name=data.name.strip(),
        price=data.price,
        unit=data.unit.strip(),
        storage_type=data.storage_type,
        availability=data.availability,
        season_start=data.season_start,
        season_end=data.season_end,
        stock=data.stock,
        is_active=True,
    )
    db.add(product)
    db.flush()
    return product

