import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_store_context
from backend.app.models.models import Category, Product
from backend.app.schemas.schemas import CategoryCreate, CategoryUpdate, CategoryResponse
from backend.app.services.product_service import ProductService

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=List[CategoryResponse])
async def list_categories(
    store_context: tuple = Depends(get_store_context),
    db: AsyncSession = Depends(get_db)
):
    store, _ = store_context
    stmt = select(Category).where(Category.store_id == store.id).order_by(Category.sort_order.asc(), Category.name.asc())
    res = await db.execute(stmt)
    categories = res.scalars().all()

    result = []
    for c in categories:
        count_res = await db.execute(select(func.count(Product.id)).where(Product.category_id == c.id, Product.is_archived == False))
        p_count = count_res.scalar() or 0
        result.append(CategoryResponse(
            id=c.id,
            store_id=c.store_id,
            name=c.name,
            slug=c.slug,
            description=c.description,
            parent_id=c.parent_id,
            sort_order=c.sort_order,
            product_count=p_count,
            created_at=c.created_at
        ))
    return result


@router.post("", response_model=CategoryResponse)
async def create_category(
    req: CategoryCreate,
    store_context: tuple = Depends(get_store_context),
    db: AsyncSession = Depends(get_db)
):
    store, role = store_context
    if role in ["viewer"]:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    slug = req.slug or ProductService.slugify(req.name)
    base_slug = slug
    c = 1
    while True:
        chk = await db.execute(select(Category).where(Category.store_id == store.id, Category.slug == slug))
        if not chk.scalar_one_or_none():
            break
        c += 1
        slug = f"{base_slug}-{c}"

    category = Category(
        id=str(uuid.uuid4()),
        store_id=store.id,
        name=req.name,
        slug=slug,
        description=req.description,
        parent_id=req.parent_id,
        sort_order=req.sort_order
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)

    return CategoryResponse(
        id=category.id,
        store_id=category.store_id,
        name=category.name,
        slug=category.slug,
        description=category.description,
        parent_id=category.parent_id,
        sort_order=category.sort_order,
        product_count=0,
        created_at=category.created_at
    )


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    req: CategoryUpdate,
    store_context: tuple = Depends(get_store_context),
    db: AsyncSession = Depends(get_db)
):
    store, role = store_context
    if role in ["viewer"]:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    q = await db.execute(select(Category).where(Category.id == category_id, Category.store_id == store.id))
    cat = q.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Категория не найдена")

    for field, val in req.model_dump(exclude_unset=True).items():
        setattr(cat, field, val)

    await db.commit()
    await db.refresh(cat)

    count_res = await db.execute(select(func.count(Product.id)).where(Product.category_id == cat.id, Product.is_archived == False))
    p_count = count_res.scalar() or 0

    return CategoryResponse(
        id=cat.id,
        store_id=cat.store_id,
        name=cat.name,
        slug=cat.slug,
        description=cat.description,
        parent_id=cat.parent_id,
        sort_order=cat.sort_order,
        product_count=p_count,
        created_at=cat.created_at
    )


@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    store_context: tuple = Depends(get_store_context),
    db: AsyncSession = Depends(get_db)
):
    store, role = store_context
    if role in ["viewer"]:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    q = await db.execute(select(Category).where(Category.id == category_id, Category.store_id == store.id))
    cat = q.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Категория не найдена")

    await db.delete(cat)
    await db.commit()
    return {"message": "Категория успешно удалена"}
