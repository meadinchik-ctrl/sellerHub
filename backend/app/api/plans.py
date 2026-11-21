from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user
from backend.app.models.models import User, Plan, Subscription, Store, Product, StoreMember
from backend.app.schemas.schemas import PlanResponse, SubscriptionResponse

router = APIRouter(prefix="/plans", tags=["Plans and Limits"])

DEFAULT_PLANS = [
    {
        "name": "free",
        "price": 0.0,
        "max_products": 30,
        "max_stores": 1,
        "max_employees": 0,
        "features": {
            "catalog": True,
            "price_list": True,
            "import_export": True,
            "analytics_days": 7,
            "crm": True,
            "telegram_bot": True,
            "api_access": False
        }
    },
    {
        "name": "start",
        "price": 5.0,
        "max_products": 300,
        "max_stores": 1,
        "max_employees": 2,
        "features": {
            "catalog": True,
            "price_list": True,
            "import_export": True,
            "analytics_days": 30,
            "crm": True,
            "telegram_bot": True,
            "api_access": False
        }
    },
    {
        "name": "pro",
        "price": 12.0,
        "max_products": 3000,
        "max_stores": 3,
        "max_employees": 10,
        "features": {
            "catalog": True,
            "price_list": True,
            "import_export": True,
            "analytics_days": 90,
            "crm": True,
            "telegram_bot": True,
            "custom_themes": True,
            "api_access": True
        }
    },
    {
        "name": "business",
        "price": 25.0,
        "max_products": 20000,
        "max_stores": 10,
        "max_employees": 50,
        "features": {
            "catalog": True,
            "price_list": True,
            "import_export": True,
            "analytics_days": 365,
            "crm": True,
            "telegram_bot": True,
            "custom_themes": True,
            "api_access": True,
            "priority_support": True
        }
    }
]


async def ensure_plans(db: AsyncSession):
    for p_data in DEFAULT_PLANS:
        q = await db.execute(select(Plan).where(Plan.name == p_data["name"]))
        existing = q.scalar_one_or_none()
        if not existing:
            plan = Plan(
                name=p_data["name"],
                price=p_data["price"],
                max_products=p_data["max_products"],
                max_stores=p_data["max_stores"],
                max_employees=p_data["max_employees"],
                features=p_data["features"]
            )
            db.add(plan)
    await db.commit()


@router.get("", response_model=List[PlanResponse])
async def list_plans(db: AsyncSession = Depends(get_db)):
    await ensure_plans(db)
    res = await db.execute(select(Plan).order_by(Plan.price.asc()))
    plans = res.scalars().all()
    return plans


@router.get("/current", response_model=SubscriptionResponse)
async def get_current_subscription(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await ensure_plans(db)
    q_sub = await db.execute(
        select(Subscription, Plan)
        .join(Plan, Plan.id == Subscription.plan_id)
        .where(Subscription.user_id == user.id, Subscription.status == "active")
    )
    row = q_sub.first()
    if not row:
        # Default to free
        free_plan = (await db.execute(select(Plan).where(Plan.name == "free"))).scalar_one()
        sub = Subscription(user_id=user.id, plan_id=free_plan.id, status="active")
        db.add(sub)
        await db.commit()
        plan = free_plan
    else:
        sub, plan = row

    # Usage stats
    p_count = (await db.execute(
        select(func.count(Product.id))
        .join(Store, Store.id == Product.store_id)
        .where(Store.owner_id == user.id, Product.is_archived == False)
    )).scalar() or 0

    s_count = (await db.execute(
        select(func.count(Store.id)).where(Store.owner_id == user.id)
    )).scalar() or 0

    e_count = (await db.execute(
        select(func.count(StoreMember.id))
        .join(Store, Store.id == StoreMember.store_id)
        .where(Store.owner_id == user.id)
    )).scalar() or 0

    return SubscriptionResponse(
        id=sub.id,
        plan_name=plan.name,
        status=sub.status,
        max_products=plan.max_products,
        max_stores=plan.max_stores,
        max_employees=plan.max_employees,
        current_products_count=p_count,
        current_stores_count=s_count,
        current_employees_count=e_count
    )


@router.post("/select/{plan_name}")
async def select_plan(
    plan_name: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Смена тарифов и выдача подписок доступна только администраторам платформы. Для подключения обратитесь к администратору."
        )
    await ensure_plans(db)
    q_plan = await db.execute(select(Plan).where(Plan.name == plan_name.lower()))
    target_plan = q_plan.scalar_one_or_none()
    if not target_plan:
        raise HTTPException(status_code=404, detail="Тариф не найден")

    # Update or insert subscription
    q_sub = await db.execute(select(Subscription).where(Subscription.user_id == user.id, Subscription.status == "active"))
    curr_sub = q_sub.scalar_one_or_none()
    if curr_sub:
        curr_sub.plan_id = target_plan.id
    else:
        new_sub = Subscription(user_id=user.id, plan_id=target_plan.id, status="active")
        db.add(new_sub)

    await db.commit()
    return {"message": f"Тариф успешно изменен на {target_plan.name.upper()}", "plan": target_plan.name}
