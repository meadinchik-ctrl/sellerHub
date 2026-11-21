import io
from typing import List, Optional
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from backend.app.models.models import Product, Store


class ExportService:
    @staticmethod
    async def export_products(
        db: AsyncSession,
        store: Store,
        format_type: str = "xlsx",  # "xlsx" or "csv"
        category_id: Optional[str] = None,
        is_published: Optional[bool] = None,
        product_ids: Optional[List[str]] = None
    ) -> io.BytesIO:
        stmt = (
            select(Product)
            .where(Product.store_id == store.id, Product.is_archived == False)
            .options(
                selectinload(Product.category),
                selectinload(Product.images),
                selectinload(Product.variants)
            )
            .order_by(Product.name.asc())
        )
        if category_id:
            stmt = stmt.where(Product.category_id == category_id)
        if is_published is not None:
            stmt = stmt.where(Product.is_published == is_published)
        if product_ids:
            stmt = stmt.where(Product.id.in_(product_ids))

        res = await db.execute(stmt)
        products = res.scalars().all()

        rows = []
        for p in products:
            cover_img = ""
            for img in p.images:
                if img.is_cover:
                    cover_img = img.image_url
                    break
            if not cover_img and p.images:
                cover_img = p.images[0].image_url

            # Format variants text if any: e.g. "S (45 USD, 10 шт); M (50 USD, 5 шт)"
            variants_str = ""
            if p.variants:
                var_parts = []
                for v in p.variants:
                    var_parts.append(f"{v.title}: {v.price} {p.currency} (склад: {v.stock_quantity})")
                variants_str = "; ".join(var_parts)

            rows.append({
                "Артикул (SKU)": p.sku or "",
                "Название": p.name,
                "Категория": p.category.name if p.category else "",
                "Цена": p.price,
                "Старая цена": p.old_price or "",
                "Валюта": p.currency,
                "Остаток": p.stock_quantity,
                "Варианты и остатки": variants_str,
                "Опубликован": "Да" if p.is_published else "Нет",
                "Описание": p.description or "",
                "Ссылка на изображение": cover_img
            })

        df = pd.DataFrame(rows)
        output = io.BytesIO()

        if format_type.lower() == "csv":
            df.to_csv(output, index=False, encoding="utf-8-sig")
        else:
            with pd.ExcelWriter(output, engine="openpyxl") as writer:
                df.to_excel(writer, index=False, sheet_name="Товары")

        output.seek(0)
        return output
