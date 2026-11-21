from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user, get_store_context
from backend.app.models.models import User, Store, StoreMember
from backend.app.schemas.schemas import StoreCreate, StoreUpdate, StoreResponse
from backend.app.services.store_service import StoreService

router = APIRouter(prefix="/stores", tags=["Stores"])


@router.get("", response_model=List[StoreResponse])
async def list_user_stores(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stores = await StoreService.get_user_stores(db, user.id)
    return stores


@router.post("", response_model=StoreResponse)
async def create_store(
    req: StoreCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    store = await StoreService.create_store(db, user, req)
    return {
        "id": store.id,
        "owner_id": store.owner_id,
        "name": store.name,
        "slug": store.slug,
        "description": store.description,
        "logo_url": store.logo_url,
        "cover_url": store.cover_url,
        "default_currency": store.default_currency,
        "theme_color": store.theme_color,
        "catalog_mode": store.catalog_mode,
        "is_published": store.is_published,
        "contact_telegram": store.contact_telegram,
        "contact_phone": store.contact_phone,
        "contact_whatsapp": store.contact_whatsapp,
        "contact_email": store.contact_email,
        "total_products": 0,
        "created_at": store.created_at,
        "role": "owner"
    }


@router.get("/{store_id}", response_model=StoreResponse)
async def get_store_details(
    store_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    q = await db.execute(select(Store).where(Store.id == store_id))
    store = q.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Магазин не найден")

    # Check access
    role = "owner" if store.owner_id == user.id else None
    if not role:
        q_m = await db.execute(select(StoreMember).where(StoreMember.store_id == store_id, StoreMember.user_id == user.id))
        m = q_m.scalar_one_or_none()
        if m:
            role = m.role
        elif not user.is_admin:
            raise HTTPException(status_code=403, detail="Нет доступа к магазину")
        else:
            role = "admin"

    return {
        "id": store.id,
        "owner_id": store.owner_id,
        "name": store.name,
        "slug": store.slug,
        "description": store.description,
        "logo_url": store.logo_url,
        "cover_url": store.cover_url,
        "default_currency": store.default_currency,
        "theme_color": store.theme_color,
        "catalog_mode": store.catalog_mode,
        "is_published": store.is_published,
        "contact_telegram": store.contact_telegram,
        "contact_phone": store.contact_phone,
        "contact_whatsapp": store.contact_whatsapp,
        "contact_email": store.contact_email,
        "total_products": len(store.products) if store.products else 0,
        "created_at": store.created_at,
        "role": role
    }


@router.put("/{store_id}", response_model=StoreResponse)
async def update_store(
    store_id: str,
    req: StoreUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    q = await db.execute(select(Store).where(Store.id == store_id))
    store = q.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Магазин не найден")

    if store.owner_id != user.id and not user.is_admin:
        # Check if user is admin role in store
        q_m = await db.execute(select(StoreMember).where(StoreMember.store_id == store_id, StoreMember.user_id == user.id, StoreMember.role.in_(["owner", "admin"])))
        if not q_m.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Недостаточно прав для редактирования магазина")

    updated = await StoreService.update_store(db, store, req)
    return {
        "id": updated.id,
        "owner_id": updated.owner_id,
        "name": updated.name,
        "slug": updated.slug,
        "description": updated.description,
        "logo_url": updated.logo_url,
        "cover_url": updated.cover_url,
        "default_currency": updated.default_currency,
        "theme_color": updated.theme_color,
        "catalog_mode": updated.catalog_mode,
        "is_published": updated.is_published,
        "contact_telegram": updated.contact_telegram,
        "contact_phone": updated.contact_phone,
        "contact_whatsapp": updated.contact_whatsapp,
        "contact_email": updated.contact_email,
        "total_products": 0,
        "created_at": updated.created_at,
        "role": "owner" if store.owner_id == user.id else "admin"
    }


@router.delete("/{store_id}")
async def delete_store(
    store_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    q = await db.execute(select(Store).where(Store.id == store_id))
    store = q.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Магазин не найден")

    if store.owner_id != user.id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Только владелец может удалить магазин")

    await db.delete(store)
    await db.commit()
    return {"message": "Магазин успешно удален"}
