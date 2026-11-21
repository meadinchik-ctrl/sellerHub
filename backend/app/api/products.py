from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user, get_store_context
from backend.app.models.models import Store, Product
from backend.app.schemas.schemas import (
    ProductCreate, ProductUpdate, ProductResponse, BulkProductAction
)
from backend.app.services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["Products"])


def serialize_product(p: Product) -> Dict[str, Any]:
    return {
        "id": p.id,
        "store_id": p.store_id,
        "category_id": p.category_id,
        "name": p.name,
        "slug": p.slug,
        "sku": p.sku,
        "description": p.description,
        "price": p.price,
        "old_price": p.old_price,
        "currency": p.currency,
        "stock_quantity": p.stock_quantity,
        "is_published": p.is_published,
        "is_archived": p.is_archived,
        "sort_order": p.sort_order,
        "video_url": p.video_url,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
        "category_name": p.category.name if p.category else None,
        "images": [
            {
                "id": img.id,
                "image_url": img.image_url,
                "sort_order": img.sort_order,
                "is_cover": img.is_cover
            }
            for img in (p.images or [])
        ],
        "variants": [
            {
                "id": v.id,
                "title": v.title,
                "sku": v.sku,
                "price": v.price,
                "old_price": v.old_price,
                "stock_quantity": v.stock_quantity,
                "attributes": v.attributes
            }
            for v in (p.variants or [])
        ],
        "attributes": [
            {
                "id": a.id,
                "name": a.name,
                "type": a.type,
                "value_text": a.value_text,
                "value_json": a.value_json
            }
            for a in (p.attributes or [])
        ]
    }


@router.get("")
async def list_products(
    query: Optional[str] = None,
    category_id: Optional[str] = None,
    is_published: Optional[bool] = None,
    is_archived: bool = False,
    in_stock_only: bool = False,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by: str = "created_at",
    sort_desc: bool = True,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    store_context: tuple = Depends(get_store_context),
    db: AsyncSession = Depends(get_db)
):
    store, role = store_context
    products, total = await ProductService.get_products_list(
        db,
        store_id=store.id,
        query=query,
        category_id=category_id,
        is_published=is_published,
        is_archived=is_archived,
        in_stock_only=in_stock_only,
        min_price=min_price,
        max_price=max_price,
        sort_by=sort_by,
        sort_desc=sort_desc,
        page=page,
        page_size=page_size
    )

    items = [serialize_product(p) for p in products]
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size if total > 0 else 1
    }


@router.post("", response_model=ProductResponse)
async def create_product(
    req: ProductCreate,
    store_context: tuple = Depends(get_store_context),
    db: AsyncSession = Depends(get_db)
):
    store, role = store_context
    if role == "viewer":
        raise HTTPException(status_code=403, detail="Роль наблюдателя не позволяет создавать товары")

    product = await ProductService.create_product(db, store, req)
    return serialize_product(product)


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    store_context: tuple = Depends(get_store_context),
    db: AsyncSession = Depends(get_db)
):
    store, _ = store_context
    product = await ProductService.get_product_by_id(db, product_id, store.id)
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return serialize_product(product)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    req: ProductUpdate,
    store_context: tuple = Depends(get_store_context),
    db: AsyncSession = Depends(get_db)
):
    store, role = store_context
    if role == "viewer":
        raise HTTPException(status_code=403, detail="Роль наблюдателя не позволяет изменять товары")

    product = await ProductService.get_product_by_id(db, product_id, store.id)
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")

    updated = await ProductService.update_product(db, product, req)
    return serialize_product(updated)


@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    store_context: tuple = Depends(get_store_context),
    db: AsyncSession = Depends(get_db)
):
    store, role = store_context
    if role in ["viewer"]:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    product = await ProductService.get_product_by_id(db, product_id, store.id)
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")

    await ProductService.delete_product(db, product)
    return {"message": "Товар успешно удален"}


@router.post("/{product_id}/duplicate", response_model=ProductResponse)
async def duplicate_product(
    product_id: str,
    store_context: tuple = Depends(get_store_context),
    db: AsyncSession = Depends(get_db)
):
    store, role = store_context
    if role == "viewer":
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    dup = await ProductService.duplicate_product(db, product_id, store)
    return serialize_product(dup)


@router.post("/bulk")
async def bulk_products_action(
    req: BulkProductAction,
    store_context: tuple = Depends(get_store_context),
    db: AsyncSession = Depends(get_db)
):
    store, role = store_context
    if role in ["viewer"]:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    affected = await ProductService.bulk_action(db, store.id, req)
    return {"message": f"Действие применено к {affected} товарам", "affected": affected}
