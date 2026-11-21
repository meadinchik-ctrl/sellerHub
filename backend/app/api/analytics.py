from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_store_context
from backend.app.schemas.schemas import AnalyticsOverview
from backend.app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview", response_model=AnalyticsOverview)
async def get_analytics_overview(
    period: str = Query("7d", pattern="^(today|7d|30d|90d)$"),
    store_context: tuple = Depends(get_store_context),
    db: AsyncSession = Depends(get_db)
):
    store, _ = store_context
    return await AnalyticsService.get_overview(db, store.id, period=period)
