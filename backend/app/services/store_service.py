import re
import uuid
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from fastapi import HTTPException, status
from backend.app.models.models import Store, StoreMember, Product, User, Plan, Subscription
from backend.app.schemas.schemas import StoreCreate, StoreUpdate


class StoreService:
    @staticmethod
    def slugify(text: str) -> str:
        # Simple transliteration / slugify for cyrillic and latin
        translit_map = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
            'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
            'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
            'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
            'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
        }
        res = []
        for char in text.lower():
            res.append(translit_map.get(char, char))
        slug = "".join(res)
        slug = re.sub(r'[^a-z0-9\-]+', '-', slug).strip('-')
        return slug or "store"

    @staticmethod
    async def generate_unique_slug(db: AsyncSession, name: str) -> str:
        base_slug = StoreService.slugify(name)
        candidate = base_slug
        counter = 1
        while True:
            q = await db.execute(select(Store).where(Store.slug == candidate))
            if not q.scalar_one_or_none():
                return candidate
            counter += 1
            candidate = f"{base_slug}-{counter}"

    @staticmethod
    async def get_user_stores(db: AsyncSession, user_id: str) -> List[dict]:
        # Owned stores
        q_owned = await db.execute(select(Store).where(Store.owner_id == user_id).order_by(Store.created_at.desc()))
        owned_stores = q_owned.scalars().all()

        # Member stores
        q_member = await db.execute(
            select(Store, StoreMember.role)
            .join(StoreMember, StoreMember.store_id == Store.id)
            .where(StoreMember.user_id == user_id, StoreMember.status == "active")
        )
        member_rows = q_member.all()

        results = []
        for s in owned_stores:
            p_count_res = await db.execute(select(func.count(Product.id)).where(Product.store_id == s.id, Product.is_archived == False))
            p_count = p_count_res.scalar() or 0
            results.append({
                "id": s.id,
                "owner_id": s.owner_id,
                "name": s.name,
                "slug": s.slug,
                "description": s.description,
                "logo_url": s.logo_url,
                "cover_url": s.cover_url,
                "default_currency": s.default_currency,
                "theme_color": s.theme_color,
                "catalog_mode": s.catalog_mode,
                "business_type": s.business_type or "retail",
                "enabled_features": s.enabled_features,
                "is_published": s.is_published,
                "contact_telegram": s.contact_telegram,
                "contact_phone": s.contact_phone,
                "contact_whatsapp": s.contact_whatsapp,
                "contact_email": s.contact_email,
                "total_products": p_count,
                "created_at": s.created_at,
                "role": "owner"
            })

        for s, role in member_rows:
            if s.id not in [r["id"] for r in results]:
                p_count_res = await db.execute(select(func.count(Product.id)).where(Product.store_id == s.id, Product.is_archived == False))
                p_count = p_count_res.scalar() or 0
                results.append({
                    "id": s.id,
                    "owner_id": s.owner_id,
                    "name": s.name,
                    "slug": s.slug,
                    "description": s.description,
                    "logo_url": s.logo_url,
                    "cover_url": s.cover_url,
                    "default_currency": s.default_currency,
                    "theme_color": s.theme_color,
                    "catalog_mode": s.catalog_mode,
                    "business_type": s.business_type or "retail",
                    "enabled_features": s.enabled_features,
                    "is_published": s.is_published,
                    "contact_telegram": s.contact_telegram,
                    "contact_phone": s.contact_phone,
                    "contact_whatsapp": s.contact_whatsapp,
                    "contact_email": s.contact_email,
                    "total_products": p_count,
                    "created_at": s.created_at,
                    "role": role
                })
        return results

    @staticmethod
    async def create_store(db: AsyncSession, user: User, data: StoreCreate) -> Store:
        # Check plan limits for max_stores
        q_sub = await db.execute(
            select(Subscription, Plan)
            .join(Plan, Plan.id == Subscription.plan_id)
            .where(Subscription.user_id == user.id, Subscription.status == "active")
        )
        sub_row = q_sub.first()
        max_stores = sub_row[1].max_stores if sub_row else 1

        owned_count_res = await db.execute(select(func.count(Store.id)).where(Store.owner_id == user.id))
        owned_count = owned_count_res.scalar() or 0
        if owned_count >= max_stores and not user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Достигнут лимит магазинов для вашего тарифа ({max_stores}). Перейдите на тариф Pro или Business для создания дополнительных магазинов."
            )

        slug = data.slug.strip() if data.slug else await StoreService.generate_unique_slug(db, data.name)
        # Check uniqueness of slug
        q_slug = await db.execute(select(Store).where(Store.slug == slug))
        if q_slug.scalar_one_or_none():
            slug = await StoreService.generate_unique_slug(db, data.name)

        store = Store(
            id=str(uuid.uuid4()),
            owner_id=user.id,
            name=data.name,
            slug=slug,
            description=data.description,
            logo_url=data.logo_url,
            cover_url=data.cover_url,
            default_currency=data.default_currency,
            theme_color=data.theme_color,
            catalog_mode=data.catalog_mode,
            business_type=data.business_type or "retail",
            enabled_features=data.enabled_features,
            contact_telegram=data.contact_telegram,
            contact_phone=data.contact_phone,
            contact_whatsapp=data.contact_whatsapp,
            contact_email=data.contact_email,
            is_published=True
        )
        db.add(store)
        await db.commit()
        await db.refresh(store)
        return store

    @staticmethod
    async def update_store(db: AsyncSession, store: Store, data: StoreUpdate) -> Store:
        update_data = data.model_dump(exclude_unset=True)
        if "slug" in update_data and update_data["slug"]:
            new_slug = StoreService.slugify(update_data["slug"])
            if new_slug != store.slug:
                q_slug = await db.execute(select(Store).where(Store.slug == new_slug, Store.id != store.id))
                if q_slug.scalar_one_or_none():
                    raise HTTPException(status_code=400, detail="Этот адрес магазина (slug) уже занят")
                update_data["slug"] = new_slug

        for field, val in update_data.items():
            setattr(store, field, val)
        await db.commit()
        await db.refresh(store)
        return store

    @staticmethod
    async def get_public_store_by_slug(db: AsyncSession, slug: str) -> Optional[Store]:
        q = await db.execute(select(Store).where(Store.slug == slug, Store.is_published == True))
        return q.scalar_one_or_none()
