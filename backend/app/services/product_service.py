import re
import uuid
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, delete, update
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from backend.app.models.models import (
    Product, ProductImage, ProductVariant, ProductAttribute, Category, Store, Plan, Subscription
)
from backend.app.schemas.schemas import ProductCreate, ProductUpdate, BulkProductAction


class ProductService:
    @staticmethod
    def slugify(text: str) -> str:
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
        return slug or "product"

    @staticmethod
    async def check_plan_product_limit(db: AsyncSession, store: Store):
        # Query owner's plan limit
        q = await db.execute(
            select(Plan.max_products)
            .join(Subscription, Subscription.plan_id == Plan.id)
            .where(Subscription.user_id == store.owner_id, Subscription.status == "active")
        )
        max_p = q.scalar() or 30

        count_q = await db.execute(
            select(func.count(Product.id)).where(Product.store_id == store.id, Product.is_archived == False)
        )
        current_count = count_q.scalar() or 0
        if current_count >= max_p:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Достигнут лимит товаров ({max_p}) для вашего тарифа. Обновите тариф в разделе 'Тарифы' для добавления новых товаров."
            )

    @staticmethod
    async def get_products_list(
        db: AsyncSession,
        store_id: str,
        query: Optional[str] = None,
        category_id: Optional[str] = None,
        is_published: Optional[bool] = None,
        is_archived: bool = False,
        in_stock_only: bool = False,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        sort_by: str = "created_at",
        sort_desc: bool = True,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Product], int]:
        stmt = (
            select(Product)
            .where(Product.store_id == store_id, Product.is_archived == is_archived)
            .options(
                selectinload(Product.images),
                selectinload(Product.variants),
                selectinload(Product.attributes),
                selectinload(Product.category)
            )
        )

        if query:
            clean_q = f"%{query.strip()}%"
            stmt = stmt.where(or_(Product.name.ilike(clean_q), Product.sku.ilike(clean_q), Product.description.ilike(clean_q)))
        
        if category_id:
            stmt = stmt.where(Product.category_id == category_id)

        if is_published is not None:
            stmt = stmt.where(Product.is_published == is_published)

        if in_stock_only:
            stmt = stmt.where(Product.stock_quantity > 0)

        if min_price is not None:
            stmt = stmt.where(Product.price >= min_price)

        if max_price is not None:
            stmt = stmt.where(Product.price <= max_price)

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        # Sorting
        sort_column = getattr(Product, sort_by, Product.created_at)
        if sort_desc:
            stmt = stmt.order_by(sort_column.desc())
        else:
            stmt = stmt.order_by(sort_column.asc())

        # Pagination
        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)

        result = await db.execute(stmt)
        products = result.scalars().all()
        return products, total

    @staticmethod
    async def get_product_by_id(db: AsyncSession, product_id: str, store_id: Optional[str] = None) -> Optional[Product]:
        stmt = (
            select(Product)
            .where(Product.id == product_id)
            .options(
                selectinload(Product.images),
                selectinload(Product.variants),
                selectinload(Product.attributes),
                selectinload(Product.category)
            )
        )
        if store_id:
            stmt = stmt.where(Product.store_id == store_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def create_product(db: AsyncSession, store: Store, data: ProductCreate) -> Product:
        await ProductService.check_plan_product_limit(db, store)

        slug = data.slug or ProductService.slugify(data.name)
        # Check slug uniqueness within store
        base_slug = slug
        c = 1
        while True:
            chk = await db.execute(select(Product).where(Product.store_id == store.id, Product.slug == slug))
            if not chk.scalar_one_or_none():
                break
            c += 1
            slug = f"{base_slug}-{c}"

        product = Product(
            id=str(uuid.uuid4()),
            store_id=store.id,
            category_id=data.category_id,
            name=data.name,
            slug=slug,
            sku=data.sku,
            description=data.description,
            price=data.price,
            old_price=data.old_price,
            currency=data.currency or store.default_currency,
            stock_quantity=data.stock_quantity,
            is_published=data.is_published,
            sort_order=data.sort_order,
            video_url=data.video_url,
            item_type=data.item_type or "product",
            service_duration_min=data.service_duration_min,
            price_prefix=data.price_prefix,
            service_format=data.service_format
        )
        db.add(product)
        await db.flush()

        # Add images
        for idx, img in enumerate(data.images):
            image = ProductImage(
                id=str(uuid.uuid4()),
                product_id=product.id,
                image_url=img.image_url,
                sort_order=img.sort_order if img.sort_order is not None else idx,
                is_cover=img.is_cover or (idx == 0)
            )
            db.add(image)

        # Add variants
        for v in data.variants:
            variant = ProductVariant(
                id=str(uuid.uuid4()),
                product_id=product.id,
                title=v.title,
                sku=v.sku,
                price=v.price,
                old_price=v.old_price,
                stock_quantity=v.stock_quantity,
                attributes=v.attributes
            )
            db.add(variant)

        # Add attributes
        for a in data.attributes:
            attr = ProductAttribute(
                id=str(uuid.uuid4()),
                product_id=product.id,
                name=a.name,
                type=a.type,
                value_text=a.value_text,
                value_json=a.value_json
            )
            db.add(attr)

        await db.commit()
        return await ProductService.get_product_by_id(db, product.id)

    @staticmethod
    async def update_product(db: AsyncSession, product: Product, data: ProductUpdate) -> Product:
        update_data = data.model_dump(exclude_unset=True)

        # Pop relations
        images_data = update_data.pop("images", None)
        variants_data = update_data.pop("variants", None)
        attributes_data = update_data.pop("attributes", None)

        if "name" in update_data and "slug" not in update_data:
            # Optionally update slug if requested or keep stable
            pass

        for field, val in update_data.items():
            setattr(product, field, val)

        # Replace images if provided
        if images_data is not None:
            await db.execute(delete(ProductImage).where(ProductImage.product_id == product.id))
            for idx, img in enumerate(images_data):
                image = ProductImage(
                    id=str(uuid.uuid4()),
                    product_id=product.id,
                    image_url=img["image_url"],
                    sort_order=img.get("sort_order", idx),
                    is_cover=img.get("is_cover", idx == 0)
                )
                db.add(image)

        # Replace variants if provided
        if variants_data is not None:
            await db.execute(delete(ProductVariant).where(ProductVariant.product_id == product.id))
            for v in variants_data:
                variant = ProductVariant(
                    id=str(uuid.uuid4()),
                    product_id=product.id,
                    title=v["title"],
                    sku=v.get("sku"),
                    price=v["price"],
                    old_price=v.get("old_price"),
                    stock_quantity=v.get("stock_quantity", 0),
                    attributes=v.get("attributes")
                )
                db.add(variant)

        # Replace attributes if provided
        if attributes_data is not None:
            await db.execute(delete(ProductAttribute).where(ProductAttribute.product_id == product.id))
            for a in attributes_data:
                attr = ProductAttribute(
                    id=str(uuid.uuid4()),
                    product_id=product.id,
                    name=a["name"],
                    type=a.get("type", "text"),
                    value_text=a.get("value_text"),
                    value_json=a.get("value_json")
                )
                db.add(attr)

        await db.commit()
        return await ProductService.get_product_by_id(db, product.id)

    @staticmethod
    async def delete_product(db: AsyncSession, product: Product):
        await db.delete(product)
        await db.commit()

    @staticmethod
    async def duplicate_product(db: AsyncSession, product_id: str, store: Store) -> Product:
        orig = await ProductService.get_product_by_id(db, product_id, store.id)
        if not orig:
            raise HTTPException(status_code=404, detail="Товар не найден")
        
        await ProductService.check_plan_product_limit(db, store)

        dup_name = f"{orig.name} (Копия)"
        dup_slug = ProductService.slugify(dup_name)
        base_slug = dup_slug
        c = 1
        while True:
            chk = await db.execute(select(Product).where(Product.store_id == store.id, Product.slug == dup_slug))
            if not chk.scalar_one_or_none():
                break
            c += 1
            dup_slug = f"{base_slug}-{c}"

        new_product = Product(
            id=str(uuid.uuid4()),
            store_id=store.id,
            category_id=orig.category_id,
            name=dup_name,
            slug=dup_slug,
            sku=f"{orig.sku}-copy" if orig.sku else None,
            description=orig.description,
            price=orig.price,
            old_price=orig.old_price,
            currency=orig.currency,
            stock_quantity=orig.stock_quantity,
            is_published=False,  # Unpublish duplicate by default
            sort_order=orig.sort_order,
            video_url=orig.video_url
        )
        db.add(new_product)
        await db.flush()

        # Copy images
        for img in orig.images:
            db.add(ProductImage(
                id=str(uuid.uuid4()),
                product_id=new_product.id,
                image_url=img.image_url,
                sort_order=img.sort_order,
                is_cover=img.is_cover
            ))

        # Copy variants
        for v in orig.variants:
            db.add(ProductVariant(
                id=str(uuid.uuid4()),
                product_id=new_product.id,
                title=v.title,
                sku=f"{v.sku}-copy" if v.sku else None,
                price=v.price,
                old_price=v.old_price,
                stock_quantity=v.stock_quantity,
                attributes=v.attributes
            ))

        # Copy attributes
        for a in orig.attributes:
            db.add(ProductAttribute(
                id=str(uuid.uuid4()),
                product_id=new_product.id,
                name=a.name,
                type=a.type,
                value_text=a.value_text,
                value_json=a.value_json
            ))

        await db.commit()
        return await ProductService.get_product_by_id(db, new_product.id)

    @staticmethod
    async def bulk_action(db: AsyncSession, store_id: str, action_data: BulkProductAction) -> int:
        p_ids = action_data.product_ids
        if not p_ids:
            return 0

        action = action_data.action
        if action == "publish":
            res = await db.execute(update(Product).where(Product.store_id == store_id, Product.id.in_(p_ids)).values(is_published=True))
        elif action == "unpublish":
            res = await db.execute(update(Product).where(Product.store_id == store_id, Product.id.in_(p_ids)).values(is_published=False))
        elif action == "archive":
            res = await db.execute(update(Product).where(Product.store_id == store_id, Product.id.in_(p_ids)).values(is_archived=True))
        elif action == "unarchive":
            res = await db.execute(update(Product).where(Product.store_id == store_id, Product.id.in_(p_ids)).values(is_archived=False))
        elif action == "delete":
            res = await db.execute(delete(Product).where(Product.store_id == store_id, Product.id.in_(p_ids)))
        elif action == "change_category":
            res = await db.execute(update(Product).where(Product.store_id == store_id, Product.id.in_(p_ids)).values(category_id=action_data.target_category_id))
        else:
            raise HTTPException(status_code=400, detail="Неизвестное массовое действие")

        await db.commit()
        return res.rowcount
