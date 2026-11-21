from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from backend.app.core.database import get_db
from backend.app.models.models import Store, Product, Category, ProductImage, ProductVariant, ProductAttribute, BookingSlot, PortfolioItem
from backend.app.schemas.schemas import TrackEventRequest, BookingSlotCreate
from backend.app.services.analytics_service import AnalyticsService
from backend.app.services.crm_service import CRMService

router = APIRouter(prefix="/public", tags=["Public Store"])


@router.get("/store/{slug}")
async def get_public_store(slug: str, db: AsyncSession = Depends(get_db)):
    q = await db.execute(select(Store).where(Store.slug == slug, Store.is_published == True))
    store = q.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Магазин не найден или временно скрыт")

    p_count = (await db.execute(
        select(func.count(Product.id)).where(Product.store_id == store.id, Product.is_published == True, Product.is_archived == False)
    )).scalar() or 0

    return {
        "id": store.id,
        "name": store.name,
        "slug": store.slug,
        "description": store.description,
        "logo_url": store.logo_url,
        "cover_url": store.cover_url,
        "default_currency": store.default_currency,
        "theme_color": store.theme_color,
        "catalog_mode": store.catalog_mode,
        "business_type": store.business_type or "retail",
        "enabled_features": store.enabled_features or {
            "products": True,
            "services": False,
            "booking": False,
            "portfolio": False,
            "briefs": False,
            "reviews": False
        },
        "contact_telegram": store.contact_telegram,
        "contact_phone": store.contact_phone,
        "contact_whatsapp": store.contact_whatsapp,
        "contact_email": store.contact_email,
        "total_products": p_count
    }


@router.get("/store/{slug}/categories")
async def get_public_store_categories(slug: str, db: AsyncSession = Depends(get_db)):
    q_store = await db.execute(select(Store).where(Store.slug == slug, Store.is_published == True))
    store = q_store.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Магазин не найден")

    q_cats = await db.execute(
        select(Category).where(Category.store_id == store.id).order_by(Category.sort_order.asc(), Category.name.asc())
    )
    categories = q_cats.scalars().all()

    result = []
    for c in categories:
        cnt = (await db.execute(
            select(func.count(Product.id)).where(
                Product.category_id == c.id,
                Product.is_published == True,
                Product.is_archived == False
            )
        )).scalar() or 0
        if cnt > 0:
            result.append({
                "id": c.id,
                "name": c.name,
                "slug": c.slug,
                "description": c.description,
                "product_count": cnt
            })
    return result


@router.get("/store/{slug}/products")
async def get_public_products(
    slug: str,
    query: Optional[str] = None,
    category_id: Optional[str] = None,
    in_stock_only: bool = False,
    sort_by: str = "sort_order",  # "sort_order", "price_asc", "price_desc", "newest"
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    q_store = await db.execute(select(Store).where(Store.slug == slug, Store.is_published == True))
    store = q_store.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Магазин не найден")

    stmt = (
        select(Product)
        .where(Product.store_id == store.id, Product.is_published == True, Product.is_archived == False)
        .options(
            selectinload(Product.images),
            selectinload(Product.variants),
            selectinload(Product.category)
        )
    )

    if query:
        clean_q = f"%{query.strip()}%"
        stmt = stmt.where(or_(Product.name.ilike(clean_q), Product.sku.ilike(clean_q), Product.description.ilike(clean_q)))

    if category_id:
        stmt = stmt.where(Product.category_id == category_id)

    if in_stock_only:
        stmt = stmt.where(Product.stock_quantity > 0)

    # Sorting
    if sort_by == "price_asc":
        stmt = stmt.order_by(Product.price.asc())
    elif sort_by == "price_desc":
        stmt = stmt.order_by(Product.price.desc())
    elif sort_by == "newest":
        stmt = stmt.order_by(Product.created_at.desc())
    else:
        stmt = stmt.order_by(Product.sort_order.asc(), Product.created_at.desc())

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size)

    result = await db.execute(stmt)
    products = result.scalars().all()

    items = []
    for p in products:
        cover_image = None
        for img in p.images:
            if img.is_cover:
                cover_image = img.image_url
                break
        if not cover_image and p.images:
            cover_image = p.images[0].image_url

        items.append({
            "id": p.id,
            "name": p.name,
            "slug": p.slug,
            "sku": p.sku,
            "description": p.description,
            "price": p.price,
            "old_price": p.old_price,
            "currency": p.currency,
            "stock_quantity": p.stock_quantity,
            "item_type": p.item_type or "product",
            "service_duration_min": p.service_duration_min,
            "price_prefix": p.price_prefix,
            "service_format": p.service_format,
            "cover_image": cover_image,
            "category_name": p.category.name if p.category else None,
            "variants_count": len(p.variants) if p.variants else 0
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size if total > 0 else 1
    }


@router.get("/store/{slug}/products/{product_slug}")
async def get_public_product_detail(
    slug: str,
    product_slug: str,
    db: AsyncSession = Depends(get_db)
):
    q_store = await db.execute(select(Store).where(Store.slug == slug, Store.is_published == True))
    store = q_store.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Магазин не найден")

    stmt = (
        select(Product)
        .where(
            Product.store_id == store.id,
            or_(Product.slug == product_slug, Product.id == product_slug),
            Product.is_published == True,
            Product.is_archived == False
        )
        .options(
            selectinload(Product.images),
            selectinload(Product.variants),
            selectinload(Product.attributes),
            selectinload(Product.category)
        )
    )
    result = await db.execute(stmt)
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Товар не найден")

    # Generate prefilled message for Telegram/WhatsApp
    tg_contact = store.contact_telegram or ""
    prefilled_text = f"Здравствуйте! Меня интересует товар: {p.name} (Артикул: {p.sku or 'б/н'}, Цена: {p.price} {p.currency})"

    return {
        "id": p.id,
        "name": p.name,
        "slug": p.slug,
        "sku": p.sku,
        "description": p.description,
        "price": p.price,
        "old_price": p.old_price,
        "currency": p.currency,
        "stock_quantity": p.stock_quantity,
        "item_type": p.item_type or "product",
        "service_duration_min": p.service_duration_min,
        "price_prefix": p.price_prefix,
        "service_format": p.service_format,
        "video_url": p.video_url,
        "category_name": p.category.name if p.category else None,
        "prefilled_message": prefilled_text,
        "images": [
            {"id": img.id, "image_url": img.image_url, "sort_order": img.sort_order, "is_cover": img.is_cover}
            for img in (p.images or [])
        ],
        "variants": [
            {"id": v.id, "title": v.title, "sku": v.sku, "price": v.price, "old_price": v.old_price, "stock_quantity": v.stock_quantity, "attributes": v.attributes}
            for v in (p.variants or [])
        ],
        "attributes": [
            {"id": a.id, "name": a.name, "type": a.type, "value_text": a.value_text, "value_json": a.value_json}
            for a in (p.attributes or [])
        ],
        "store": {
            "name": store.name,
            "slug": store.slug,
            "contact_telegram": store.contact_telegram,
            "contact_phone": store.contact_phone,
            "contact_whatsapp": store.contact_whatsapp,
            "contact_email": store.contact_email
        }
    }


@router.post("/store/{slug}/track")
async def track_store_event(
    slug: str,
    req: TrackEventRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    q_store = await db.execute(select(Store).where(Store.slug == slug))
    store = q_store.scalar_one_or_none()
    if not store:
        return {"status": "ignored"}

    ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")

    await AnalyticsService.record_event(
        db,
        store_id=store.id,
        event_type=req.event_type,
        product_id=req.product_id,
        visitor_ip_hash=str(hash(ip)),
        user_agent=user_agent,
        referrer=req.referrer,
        metadata_json={"channel": req.channel}
    )

    # If contact clicked or customer details provided, register CRM lead
    if req.event_type == "contact_click" and req.customer_info:
        info = req.customer_info
        await CRMService.record_customer_lead(
            db,
            store_id=store.id,
            name=info.get("name"),
            phone=info.get("phone"),
            email=info.get("email"),
            telegram_username=info.get("telegram"),
            product_id=req.product_id,
            channel=req.channel or "telegram",
            message=info.get("message")
        )

    return {"status": "ok"}


@router.get("/store/{slug}/portfolio")
async def get_public_store_portfolio(slug: str, db: AsyncSession = Depends(get_db)):
    q_store = await db.execute(select(Store).where(Store.slug == slug, Store.is_published == True))
    store = q_store.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Магазин не найден")

    stmt = select(PortfolioItem).where(PortfolioItem.store_id == store.id).order_by(PortfolioItem.sort_order.asc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/store/{slug}/book")
async def public_book_service(
    slug: str,
    req: BookingSlotCreate,
    db: AsyncSession = Depends(get_db)
):
    q_store = await db.execute(select(Store).where(Store.slug == slug, Store.is_published == True))
    store = q_store.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Магазин не найден")

    if not (req.client_phone and req.client_phone.strip()) and not (req.client_telegram and req.client_telegram.strip()):
        raise HTTPException(status_code=400, detail="Укажите номер телефона или Telegram для связи")

    slot = BookingSlot(
        store_id=store.id,
        product_id=req.product_id,
        client_name=req.client_name,
        client_phone=req.client_phone.strip() if req.client_phone else None,
        client_telegram=req.client_telegram.strip() if req.client_telegram else None,
        booking_date=req.booking_date,
        booking_time=req.booking_time,
        notes=req.notes,
        status="pending"
    )
    db.add(slot)

    # Register in CRM as well
    await CRMService.record_customer_lead(
        db,
        store_id=store.id,
        name=req.client_name,
        phone=req.client_phone.strip() if req.client_phone else None,
        telegram_username=req.client_telegram.strip() if req.client_telegram else None,
        product_id=req.product_id,
        channel="booking",
        message=f"Запись на {req.booking_date} в {req.booking_time}. Примечание: {req.notes or 'нет'}"
    )

    await db.commit()
    await db.refresh(slot)
    return {"status": "ok", "message": "Вы успешно записаны! Специалист свяжется с вами для подтверждения.", "booking_id": slot.id}

