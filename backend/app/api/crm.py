from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_store_context
from backend.app.schemas.schemas import CustomerCreate, CustomerUpdate, CustomerResponse
from backend.app.services.crm_service import CRMService

router = APIRouter(prefix="/crm", tags=["CRM"])


@router.get("/customers")
async def list_customers(
    query: Optional[str] = None,
    tag: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    store_context: tuple = Depends(get_store_context),
    db: AsyncSession = Depends(get_db)
):
    store, _ = store_context
    customers, total = await CRMService.get_customers_list(
        db,
        store_id=store.id,
        query=query,
        tag=tag,
        page=page,
        page_size=page_size
    )
    return {
        "items": [
            {
                "id": c.id,
                "store_id": c.store_id,
                "name": c.name,
                "phone": c.phone,
                "email": c.email,
                "telegram_username": c.telegram_username,
                "notes": c.notes,
                "tags": c.tags or [],
                "total_inquiries": c.total_inquiries,
                "created_at": c.created_at,
                "updated_at": c.updated_at
            }
            for c in customers
        ],
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/customers/{customer_id}")
async def get_customer(
    customer_id: str,
    store_context: tuple = Depends(get_store_context),
    db: AsyncSession = Depends(get_db)
):
    store, _ = store_context
    customer = await CRMService.get_customer_by_id(db, customer_id, store.id)
    if not customer:
        raise HTTPException(status_code=404, detail="Клиент не найден")

    return {
        "id": customer.id,
        "store_id": customer.store_id,
        "name": customer.name,
        "phone": customer.phone,
        "email": customer.email,
        "telegram_username": customer.telegram_username,
        "notes": customer.notes,
        "tags": customer.tags or [],
        "total_inquiries": customer.total_inquiries,
        "created_at": customer.created_at,
        "updated_at": customer.updated_at,
        "inquiries": [
            {
                "id": inq.id,
                "product_id": inq.product_id,
                "channel": inq.channel,
                "message": inq.message,
                "created_at": inq.created_at
            }
            for inq in (customer.inquiries or [])
        ]
    }


@router.put("/customers/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: str,
    req: CustomerUpdate,
    store_context: tuple = Depends(get_store_context),
    db: AsyncSession = Depends(get_db)
):
    store, role = store_context
    if role in ["viewer"]:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    customer = await CRMService.get_customer_by_id(db, customer_id, store.id)
    if not customer:
        raise HTTPException(status_code=404, detail="Клиент не найден")

    return await CRMService.update_customer(db, customer, req)


@router.delete("/customers/{customer_id}")
async def delete_customer(
    customer_id: str,
    store_context: tuple = Depends(get_store_context),
    db: AsyncSession = Depends(get_db)
):
    store, role = store_context
    if role in ["viewer"]:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    customer = await CRMService.get_customer_by_id(db, customer_id, store.id)
    if not customer:
        raise HTTPException(status_code=404, detail="Клиент не найден")

    await CRMService.delete_customer(db, customer)
    return {"message": "Клиент успешно удален"}
