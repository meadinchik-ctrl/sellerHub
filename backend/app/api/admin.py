from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_admin
from backend.app.core.config import settings
from backend.app.models.models import User, Store, Product, AnalyticsEvent, Subscription, AuditLog, Plan

router = APIRouter(prefix="/admin", tags=["Admin Panel"])


@router.get("/stats")
async def get_admin_platform_stats(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    total_stores = (await db.execute(select(func.count(Store.id)))).scalar() or 0
    total_products = (await db.execute(select(func.count(Product.id)).where(Product.is_archived == False))).scalar() or 0
    total_visits = (await db.execute(select(func.count(AnalyticsEvent.id)).where(AnalyticsEvent.event_type == "store_visit"))).scalar() or 0
    total_clicks = (await db.execute(select(func.count(AnalyticsEvent.id)).where(AnalyticsEvent.event_type == "contact_click"))).scalar() or 0

    return {
        "total_users": total_users,
        "total_stores": total_stores,
        "total_products": total_products,
        "total_visits": total_visits,
        "total_contact_clicks": total_clicks,
        "maintenance_mode": settings.platform.maintenance_mode
    }


@router.get("/users")
async def list_users(
    query: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User)
    if query:
        q = f"%{query.strip()}%"
        stmt = stmt.where(User.email.ilike(q) | User.full_name.ilike(q))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    stmt = stmt.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    users = (await db.execute(stmt)).scalars().all()

    items = []
    for u in users:
        # Find active subscription
        q_sub = await db.execute(
            select(Plan.name)
            .join(Subscription, Subscription.plan_id == Plan.id)
            .where(Subscription.user_id == u.id, Subscription.status == "active")
        )
        plan_name = q_sub.scalar_one_or_none() or "free"
        items.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "avatar_url": u.avatar_url,
            "is_active": u.is_active,
            "is_admin": u.is_admin,
            "is_verified": u.is_verified,
            "plan_name": plan_name,
            "created_at": u.created_at
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.post("/users/{user_id}/toggle-status")
async def toggle_user_status(
    user_id: str,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Нельзя заблокировать самого себя")

    q = await db.execute(select(User).where(User.id == user_id))
    user = q.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    user.is_active = not user.is_active
    await db.commit()
    return {"message": f"Статус пользователя изменен на {'Активен' if user.is_active else 'Заблокирован'}"}


@router.post("/users/{user_id}/subscription/{plan_name}")
async def set_user_subscription(
    user_id: str,
    plan_name: str,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    q_user = await db.execute(select(User).where(User.id == user_id))
    user = q_user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    q_plan = await db.execute(select(Plan).where(Plan.name == plan_name.lower()))
    target_plan = q_plan.scalar_one_or_none()
    if not target_plan:
        raise HTTPException(status_code=404, detail=f"Тариф {plan_name} не найден")

    q_sub = await db.execute(select(Subscription).where(Subscription.user_id == user.id, Subscription.status == "active"))
    curr_sub = q_sub.scalar_one_or_none()
    if curr_sub:
        curr_sub.plan_id = target_plan.id
    else:
        new_sub = Subscription(user_id=user.id, plan_id=target_plan.id, status="active")
        db.add(new_sub)

    await db.commit()
    return {"message": f"Пользователю {user.email or user.full_name} успешно установлен тариф {target_plan.name.upper()}"}


@router.get("/stores")
async def list_all_stores(
    query: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Store)
    if query:
        q = f"%{query.strip()}%"
        stmt = stmt.where(Store.name.ilike(q) | Store.slug.ilike(q))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    stmt = stmt.order_by(Store.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    stores = (await db.execute(stmt)).scalars().all()

    items = []
    for s in stores:
        p_cnt = (await db.execute(select(func.count(Product.id)).where(Product.store_id == s.id))).scalar() or 0
        items.append({
            "id": s.id,
            "owner_id": s.owner_id,
            "name": s.name,
            "slug": s.slug,
            "is_published": s.is_published,
            "catalog_mode": s.catalog_mode,
            "total_products": p_cnt,
            "created_at": s.created_at
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/config")
async def get_platform_config(admin: User = Depends(get_current_admin)):
    return settings.platform.model_dump()


@router.put("/config")
async def update_platform_config(
    new_data: Dict[str, Any],
    admin: User = Depends(get_current_admin)
):
    updated = settings.update_platform_config(new_data)
    return {"message": "Конфигурация платформы успешно обновлена и сохранена в config.json", "config": updated.model_dump()}


@router.get("/audit-logs")
async def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    logs = (await db.execute(stmt)).scalars().all()
    total = (await db.execute(select(func.count(AuditLog.id)))).scalar() or 0
    return {"items": logs, "total": total}
