from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user, get_store_context
from backend.app.models.models import User, Store, BookingSlot, PortfolioItem, Product
from backend.app.schemas.schemas import (
    BookingSlotCreate, BookingSlotUpdate, BookingSlotResponse,
    PortfolioItemCreate, PortfolioItemUpdate, PortfolioItemResponse
)

router = APIRouter(tags=["Modules (Booking & Portfolio)"])


# ==============================
# BOOKING SLOTS (Private Store CRM)
# ==============================
@router.get("/booking/slots", response_model=List[BookingSlotResponse])
async def list_booking_slots(
    db: AsyncSession = Depends(get_db),
    store_ctx = Depends(get_store_context),
    current_user: User = Depends(get_current_user)
):
    current_store, _ = store_ctx
    stmt = (
        select(BookingSlot, Product.name.label("product_name"))
        .outerjoin(Product, Product.id == BookingSlot.product_id)
        .where(BookingSlot.store_id == current_store.id)
        .order_by(desc(BookingSlot.created_at))
    )
    result = await db.execute(stmt)
    rows = result.all()
    slots = []
    for slot, prod_name in rows:
        d = BookingSlotResponse.model_validate(slot)
        d.product_name = prod_name
        slots.append(d)
    return slots


@router.post("/booking/slots", response_model=BookingSlotResponse)
async def create_booking_slot(
    data: BookingSlotCreate,
    db: AsyncSession = Depends(get_db),
    store_ctx = Depends(get_store_context),
    current_user: User = Depends(get_current_user)
):
    current_store, _ = store_ctx
    if not (data.client_phone and data.client_phone.strip()) and not (data.client_telegram and data.client_telegram.strip()):
        raise HTTPException(status_code=400, detail="Укажите номер телефона или Telegram для связи")
    slot = BookingSlot(
        store_id=current_store.id,
        product_id=data.product_id,
        client_name=data.client_name,
        client_phone=data.client_phone.strip() if data.client_phone else None,
        client_telegram=data.client_telegram.strip() if data.client_telegram else None,
        booking_date=data.booking_date,
        booking_time=data.booking_time,
        notes=data.notes,
        status="pending"
    )
    db.add(slot)
    await db.commit()
    await db.refresh(slot)
    return slot


@router.put("/booking/slots/{slot_id}", response_model=BookingSlotResponse)
async def update_booking_slot(
    slot_id: str,
    data: BookingSlotUpdate,
    db: AsyncSession = Depends(get_db),
    store_ctx = Depends(get_store_context),
    current_user: User = Depends(get_current_user)
):
    current_store, _ = store_ctx
    stmt = select(BookingSlot).where(BookingSlot.id == slot_id, BookingSlot.store_id == current_store.id)
    result = await db.execute(stmt)
    slot = result.scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Запись не найдена")

    if data.status is not None:
        slot.status = data.status
    if data.notes is not None:
        slot.notes = data.notes

    await db.commit()
    await db.refresh(slot)
    return slot


@router.delete("/booking/slots/{slot_id}")
async def delete_booking_slot(
    slot_id: str,
    db: AsyncSession = Depends(get_db),
    store_ctx = Depends(get_store_context),
    current_user: User = Depends(get_current_user)
):
    current_store, _ = store_ctx
    stmt = select(BookingSlot).where(BookingSlot.id == slot_id, BookingSlot.store_id == current_store.id)
    result = await db.execute(stmt)
    slot = result.scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Запись не найдена")

    await db.delete(slot)
    await db.commit()
    return {"status": "ok", "message": "Запись удалена"}


# ==============================
# PORTFOLIO (Cases, Before/After)
# ==============================
@router.get("/portfolio", response_model=List[PortfolioItemResponse])
async def list_portfolio_items(
    db: AsyncSession = Depends(get_db),
    store_ctx = Depends(get_store_context),
    current_user: User = Depends(get_current_user)
):
    current_store, _ = store_ctx
    stmt = (
        select(PortfolioItem)
        .where(PortfolioItem.store_id == current_store.id)
        .order_by(PortfolioItem.sort_order.asc(), desc(PortfolioItem.created_at))
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/portfolio", response_model=PortfolioItemResponse)
async def create_portfolio_item(
    data: PortfolioItemCreate,
    db: AsyncSession = Depends(get_db),
    store_ctx = Depends(get_store_context),
    current_user: User = Depends(get_current_user)
):
    current_store, _ = store_ctx
    item = PortfolioItem(
        store_id=current_store.id,
        title=data.title,
        description=data.description,
        category=data.category,
        is_before_after=data.is_before_after,
        before_image_url=data.before_image_url,
        after_image_url=data.after_image_url,
        image_url=data.image_url,
        project_url=data.project_url,
        sort_order=data.sort_order
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/portfolio/{item_id}", response_model=PortfolioItemResponse)
async def update_portfolio_item(
    item_id: str,
    data: PortfolioItemUpdate,
    db: AsyncSession = Depends(get_db),
    store_ctx = Depends(get_store_context),
    current_user: User = Depends(get_current_user)
):
    current_store, _ = store_ctx
    stmt = select(PortfolioItem).where(PortfolioItem.id == item_id, PortfolioItem.store_id == current_store.id)
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Кейс не найден")

    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(item, k, v)

    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/portfolio/{item_id}")
async def delete_portfolio_item(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    store_ctx = Depends(get_store_context),
    current_user: User = Depends(get_current_user)
):
    current_store, _ = store_ctx
    stmt = select(PortfolioItem).where(PortfolioItem.id == item_id, PortfolioItem.store_id == current_store.id)
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Кейс не найден")

    await db.delete(item)
    await db.commit()
    return {"status": "ok", "message": "Элемент удален"}
