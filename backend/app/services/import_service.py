import io
import os
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from fastapi import UploadFile, HTTPException
from backend.app.core.config import settings
from backend.app.models.models import (
    ImportJob, Store, Product, Category, ProductImage, ProductVariant, TelegramConnection
)
from backend.app.services.product_service import ProductService


FIELD_SYNONYMS = {
    "name": ["название", "наименование", "товар", "имя", "title", "name", "product_name", "item"],
    "sku": ["артикул", "код", "sku", "код товара", "article", "code", "id"],
    "price": ["цена", "стоимость", "price", "розничная цена", "цена продажи"],
    "old_price": ["старая цена", "зачеркнутая цена", "old price", "старая_цена", "скидочная цена"],
    "category": ["категория", "раздел", "группа", "category", "group", "folder"],
    "description": ["описание", "детали", "характеристики", "description", "details", "info"],
    "stock_quantity": ["остаток", "количество", "наличие", "кол-во", "stock", "quantity", "qty", "count"],
    "image_url": ["фото", "картинка", "изображение", "ссылка на фото", "image", "photo", "picture", "url"],
    "variants": ["варианты", "варианты и остатки", "модификации", "variants", "options"]
}


class ImportService:
    @staticmethod
    def detect_column_mappings(columns: List[str]) -> Dict[str, Optional[str]]:
        mapping = {}
        for col in columns:
            col_lower = str(col).strip().lower()
            detected_field = None
            for field, synonyms in FIELD_SYNONYMS.items():
                if any(syn == col_lower or syn in col_lower for syn in synonyms):
                    detected_field = field
                    break
            mapping[col] = detected_field
        return mapping

    @staticmethod
    def read_dataframe(file_path: str, file_ext: str) -> pd.DataFrame:
        if file_ext == "csv":
            # Auto-detect delimiter: comma or semicolon or tab
            for sep in [",", ";", "\t"]:
                try:
                    df = pd.read_csv(file_path, sep=sep, nrows=10)
                    if len(df.columns) > 1:
                        return pd.read_csv(file_path, sep=sep)
                except Exception:
                    continue
            return pd.read_csv(file_path)
        else:
            return pd.read_excel(file_path)

    @staticmethod
    async def analyze_file(store: Store, file: UploadFile) -> Dict[str, Any]:
        ext = file.filename.split(".")[-1].lower()
        if ext not in ["xlsx", "xls", "csv"]:
            raise HTTPException(status_code=400, detail="Поддерживаются только форматы XLSX, XLS или CSV")

        # Save to temporary storage
        os.makedirs(settings.STORAGE_DIR, exist_ok=True)
        temp_filename = f"import_{uuid.uuid4().hex[:12]}.{ext}"
        save_path = os.path.join(settings.STORAGE_DIR, temp_filename)

        content = await file.read()
        if len(content) > 25 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Размер файла превышает лимит 25 МБ")

        with open(save_path, "wb") as f:
            f.write(content)

        try:
            df = ImportService.read_dataframe(save_path, ext)
        except Exception as e:
            if os.path.exists(save_path):
                os.remove(save_path)
            raise HTTPException(status_code=400, detail=f"Ошибка чтения файла: {str(e)}")

        columns = [str(c).strip() for c in df.columns]
        suggested_mappings = ImportService.detect_column_mappings(columns)

        # Replace NaN with None for clean JSON serialization
        preview_data = df.head(5).fillna("").to_dict(orient="records")

        return {
            "file_id": temp_filename,
            "filename": file.filename,
            "file_format": ext,
            "total_rows": len(df),
            "columns": columns,
            "suggested_mappings": suggested_mappings,
            "preview_rows": preview_data
        }

    @staticmethod
    async def execute_import(
        db: AsyncSession,
        store: Store,
        user_id: Optional[str],
        file_id: str,
        column_mappings: Dict[str, str],
        duplicate_strategy: str = "update"  # "update", "skip", "duplicate"
    ) -> ImportJob:
        file_path = os.path.join(settings.STORAGE_DIR, file_id)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Загруженный файл не найден или истек срок его хранения")

        ext = file_id.split(".")[-1].lower()
        df = ImportService.read_dataframe(file_path, ext).fillna("")

        job = ImportJob(
            id=str(uuid.uuid4()),
            store_id=store.id,
            user_id=user_id,
            filename=file_id,
            file_format=ext,
            status="processing",
            total_rows=len(df),
            processed_rows=0,
            created_rows=0,
            updated_rows=0,
            skipped_rows=0,
            error_log=[]
        )
        db.add(job)
        await db.commit()

        # Invert column mapping: { "name": "ColumnName", ... }
        field_to_col = {v: k for k, v in column_mappings.items() if v}

        name_col = field_to_col.get("name")
        sku_col = field_to_col.get("sku")
        price_col = field_to_col.get("price")
        old_price_col = field_to_col.get("old_price")
        cat_col = field_to_col.get("category")
        desc_col = field_to_col.get("description")
        stock_col = field_to_col.get("stock_quantity")
        img_col = field_to_col.get("image_url")
        var_col = field_to_col.get("variants")

        if not name_col:
            job.status = "failed"
            job.error_log = [{"error": "Колонка для 'Название' обязательна для импорта"}]
            await db.commit()
            return job

        # Cache existing categories for store
        q_cats = await db.execute(select(Category).where(Category.store_id == store.id))
        categories = {c.name.strip().lower(): c for c in q_cats.scalars().all()}

        # Load existing products by SKU and name
        q_prods = await db.execute(select(Product).where(Product.store_id == store.id, Product.is_archived == False))
        existing_products = q_prods.scalars().all()
        products_by_sku = {p.sku.strip().lower(): p for p in existing_products if p.sku}
        products_by_name = {p.name.strip().lower(): p for p in existing_products if p.name}

        error_log = []
        created_count = 0
        updated_count = 0
        skipped_count = 0

        for row_idx, row in df.iterrows():
            row_num = row_idx + 2  # Excel row 1 is header
            raw_name = str(row.get(name_col, "")).strip()
            if not raw_name:
                skipped_count += 1
                continue

            raw_sku = str(row.get(sku_col, "")).strip() if sku_col else ""
            raw_sku = raw_sku if raw_sku and raw_sku != "nan" else None

            # Parse price
            raw_price = str(row.get(price_col, "0")).strip().replace(" ", "").replace(",", ".") if price_col else "0"
            try:
                price = float(raw_price) if raw_price and raw_price != "nan" else 0.0
            except ValueError:
                price = 0.0

            raw_old_price = str(row.get(old_price_col, "")).strip().replace(" ", "").replace(",", ".") if old_price_col else ""
            try:
                old_price = float(raw_old_price) if raw_old_price and raw_old_price != "nan" else None
            except ValueError:
                old_price = None

            raw_stock = str(row.get(stock_col, "1")).strip().replace(" ", "") if stock_col else "1"
            try:
                stock_quantity = int(float(raw_stock)) if raw_stock and raw_stock != "nan" else 1
            except ValueError:
                stock_quantity = 1

            description = str(row.get(desc_col, "")).strip() if desc_col else None
            description = None if description == "nan" else description

            # Handle category
            category_id = None
            if cat_col:
                raw_cat_name = str(row.get(cat_col, "")).strip()
                if raw_cat_name and raw_cat_name != "nan":
                    cat_key = raw_cat_name.lower()
                    if cat_key in categories:
                        category_id = categories[cat_key].id
                    else:
                        # Create new category automatically
                        new_cat = Category(
                            id=str(uuid.uuid4()),
                            store_id=store.id,
                            name=raw_cat_name,
                            slug=ProductService.slugify(raw_cat_name),
                            sort_order=len(categories)
                        )
                        db.add(new_cat)
                        await db.flush()
                        categories[cat_key] = new_cat
                        category_id = new_cat.id

            # Duplicate check
            existing_product = None
            if raw_sku and raw_sku.lower() in products_by_sku:
                existing_product = products_by_sku[raw_sku.lower()]
            elif raw_name.lower() in products_by_name:
                existing_product = products_by_name[raw_name.lower()]

            if existing_product:
                if duplicate_strategy == "skip":
                    skipped_count += 1
                    continue
                elif duplicate_strategy == "update":
                    existing_product.price = price
                    if old_price is not None:
                        existing_product.old_price = old_price
                    if description:
                        existing_product.description = description
                    if category_id:
                        existing_product.category_id = category_id
                    existing_product.stock_quantity = stock_quantity
                    updated_count += 1
                    continue

            # Create new product
            slug = ProductService.slugify(raw_name)
            p_id = str(uuid.uuid4())
            new_p = Product(
                id=p_id,
                store_id=store.id,
                category_id=category_id,
                name=raw_name,
                slug=f"{slug}-{p_id[:6]}",
                sku=raw_sku,
                description=description,
                price=price,
                old_price=old_price,
                currency=store.default_currency,
                stock_quantity=stock_quantity,
                is_published=True
            )
            db.add(new_p)

            # Handle image url
            if img_col:
                raw_img = str(row.get(img_col, "")).strip()
                if raw_img and raw_img != "nan" and raw_img.startswith("http"):
                    img_rec = ProductImage(
                        id=str(uuid.uuid4()),
                        product_id=p_id,
                        image_url=raw_img,
                        sort_order=0,
                        is_cover=True
                    )
                    db.add(img_rec)

            # Handle variants if provided in format: "XL: 100 USD (склад: 5); L: 90 USD (склад: 2)" or "Red, Blue"
            if var_col:
                raw_var = str(row.get(var_col, "")).strip()
                if raw_var and raw_var != "nan":
                    # Split by semicolon or comma
                    parts = [p.strip() for p in raw_var.replace(";", ",").split(",") if p.strip()]
                    for part in parts:
                        var_title = part
                        var_price = price
                        var_stock = stock_quantity
                        # Try parsing: Title: Price (склад: Qty)
                        try:
                            if ":" in part:
                                title_part, rest = part.split(":", 1)
                                var_title = title_part.strip()
                                # check for stock in parens
                                if "(" in rest and ")" in rest:
                                    price_sub = rest[:rest.find("(")].strip()
                                    stock_sub = rest[rest.find("(")+1:rest.find(")")].replace("склад:", "").strip()
                                    num_p = "".join(ch for ch in price_sub if ch.isdigit() or ch == '.')
                                    if num_p:
                                        var_price = float(num_p)
                                    num_s = "".join(ch for ch in stock_sub if ch.isdigit())
                                    if num_s:
                                        var_stock = int(num_s)
                                else:
                                    num_p = "".join(ch for ch in rest if ch.isdigit() or ch == '.')
                                    if num_p:
                                        var_price = float(num_p)
                        except Exception:
                            pass

                        v_rec = ProductVariant(
                            id=str(uuid.uuid4()),
                            product_id=p_id,
                            title=var_title,
                            price=var_price,
                            stock_quantity=var_stock
                        )
                        db.add(v_rec)

            created_count += 1
            if raw_sku:
                products_by_sku[raw_sku.lower()] = new_p
            products_by_name[raw_name.lower()] = new_p

        job.status = "completed"
        job.processed_rows = len(df)
        job.created_rows = created_count
        job.updated_rows = updated_count
        job.skipped_rows = skipped_count
        job.error_log = error_log
        job.completed_at = datetime.now(timezone.utc)
        await db.commit()

        # Delete temp file
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

        # Send Telegram notification if user has connected bot
        if user_id:
            try:
                from backend.app.services.telegram_service import TelegramService
                msg = (
                    f"✅ <b>Импорт завершен успешно!</b>\n\n"
                    f"🏪 Магазин: <b>{store.name}</b>\n"
                    f"📦 Создано товаров: <b>{created_count}</b>\n"
                    f"🔄 Обновлено: <b>{updated_count}</b>\n"
                    f"⏭ Пропущено: <b>{skipped_count}</b>\n"
                    f"Всего строк: <b>{len(df)}</b>"
                )
                await TelegramService.send_user_notification(db, user_id, msg)
            except Exception as e:
                print(f"[Telegram Notification Error] {e}")

        return job
