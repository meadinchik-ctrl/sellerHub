import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from backend.app.models.models import Customer, CustomerInquiry, Store
from backend.app.schemas.schemas import CustomerCreate, CustomerUpdate


class CRMService:
    @staticmethod
    async def record_customer_lead(
        db: AsyncSession,
        store_id: str,
        name: Optional[str] = None,
        phone: Optional[str] = None,
        email: Optional[str] = None,
        telegram_username: Optional[str] = None,
        product_id: Optional[str] = None,
        channel: str = "telegram",
        message: Optional[str] = None
    ) -> Customer:
        # Match customer by telegram or phone or email
        customer = None
        conditions = []
        if telegram_username:
            clean_tg = telegram_username.strip().lstrip("@")
            conditions.append(Customer.telegram_username.ilike(clean_tg))
        if phone:
            conditions.append(Customer.phone == phone.strip())
        if email:
            conditions.append(Customer.email == email.strip().lower())

        if conditions:
            q = await db.execute(
                select(Customer).where(Customer.store_id == store_id, or_(*conditions))
            )
            customer = q.scalars().first()

        if customer:
            customer.total_inquiries += 1
            if name and not customer.name:
                customer.name = name
            if phone and not customer.phone:
                customer.phone = phone
            if email and not customer.email:
                customer.email = email
            if telegram_username and not customer.telegram_username:
                customer.telegram_username = telegram_username.strip().lstrip("@")
        else:
            customer = Customer(
                id=str(uuid.uuid4()),
                store_id=store_id,
                name=name or (f"@{telegram_username.lstrip('@')}" if telegram_username else "Покупатель"),
                phone=phone,
                email=email,
                telegram_username=telegram_username.strip().lstrip("@") if telegram_username else None,
                tags=["Новый"],
                total_inquiries=1
            )
            db.add(customer)
            await db.flush()

        # Add inquiry record
        inquiry = CustomerInquiry(
            id=str(uuid.uuid4()),
            store_id=store_id,
            customer_id=customer.id,
            product_id=product_id,
            channel=channel,
            message=message
        )
        db.add(inquiry)
        await db.commit()
        await db.refresh(customer)
        return customer

    @staticmethod
    async def get_customers_list(
        db: AsyncSession,
        store_id: str,
        query: Optional[str] = None,
        tag: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Customer], int]:
        stmt = select(Customer).where(Customer.store_id == store_id)
        if query:
            q_clean = f"%{query.strip()}%"
            stmt = stmt.where(
                or_(
                    Customer.name.ilike(q_clean),
                    Customer.phone.ilike(q_clean),
                    Customer.email.ilike(q_clean),
                    Customer.telegram_username.ilike(q_clean),
                    Customer.notes.ilike(q_clean)
                )
            )

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        stmt = stmt.order_by(Customer.updated_at.desc())
        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)

        res = await db.execute(stmt)
        customers = res.scalars().all()
        return customers, total

    @staticmethod
    async def get_customer_by_id(db: AsyncSession, customer_id: str, store_id: str) -> Optional[Customer]:
        stmt = (
            select(Customer)
            .where(Customer.id == customer_id, Customer.store_id == store_id)
            .options(selectinload(Customer.inquiries))
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def update_customer(db: AsyncSession, customer: Customer, data: CustomerUpdate) -> Customer:
        for field, val in data.model_dump(exclude_unset=True).items():
            setattr(customer, field, val)
        await db.commit()
        await db.refresh(customer)
        return customer

    @staticmethod
    async def delete_customer(db: AsyncSession, customer: Customer):
        await db.delete(customer)
        await db.commit()
