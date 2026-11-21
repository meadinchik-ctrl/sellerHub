from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user, get_store_context
from backend.app.models.models import User, Store, ImportJob
from backend.app.schemas.schemas import ImportExecuteRequest, ImportJobResponse
from backend.app.services.import_service import ImportService
from backend.app.services.export_service import ExportService

router = APIRouter(prefix="/import-export", tags=["Import and Export"])


@router.post("/analyze")
async def analyze_import_file(
    file: UploadFile = File(...),
    store_context: tuple = Depends(get_store_context)
):
    store, role = store_context
    if role in ["viewer"]:
        raise HTTPException(status_code=403, detail="Недостаточно прав для импорта")
    return await ImportService.analyze_file(store, file)


@router.post("/execute", response_model=ImportJobResponse)
async def execute_import(
    req: ImportExecuteRequest,
    store_context: tuple = Depends(get_store_context),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    store, role = store_context
    if role in ["viewer"]:
        raise HTTPException(status_code=403, detail="Недостаточно прав для импорта")

    job = await ImportService.execute_import(
        db,
        store=store,
        user_id=current_user.id,
        file_id=req.file_id,
        column_mappings=req.column_mappings,
        duplicate_strategy=req.duplicate_strategy
    )
    return job


@router.get("/history", response_model=List[ImportJobResponse])
async def get_import_history(
    store_context: tuple = Depends(get_store_context),
    db: AsyncSession = Depends(get_db)
):
    store, _ = store_context
    stmt = select(ImportJob).where(ImportJob.store_id == store.id).order_by(ImportJob.created_at.desc()).limit(20)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/export")
async def export_catalog(
    format: str = Query("xlsx", pattern="^(xlsx|csv)$"),
    category_id: Optional[str] = None,
    is_published: Optional[bool] = None,
    store_context: tuple = Depends(get_store_context),
    db: AsyncSession = Depends(get_db)
):
    store, _ = store_context
    buffer = await ExportService.export_products(
        db,
        store=store,
        format_type=format,
        category_id=category_id,
        is_published=is_published
    )

    filename = f"{store.slug}-catalog.{format}"
    media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" if format == "xlsx" else "text/csv; charset=utf-8"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}

    return StreamingResponse(buffer, media_type=media_type, headers=headers)
