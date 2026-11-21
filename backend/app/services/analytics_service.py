from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from backend.app.models.models import AnalyticsEvent, Product, Category, Store, Customer, CustomerInquiry


class AnalyticsService:
    @staticmethod
    async def record_event(
        db: AsyncSession,
        store_id: str,
        event_type: str,
        product_id: Optional[str] = None,
        visitor_ip_hash: Optional[str] = None,
        user_agent: Optional[str] = None,
        referrer: Optional[str] = None,
        metadata_json: Optional[Dict[str, Any]] = None
    ):
        event = AnalyticsEvent(
            store_id=store_id,
            event_type=event_type,
            product_id=product_id,
            visitor_ip_hash=visitor_ip_hash,
            user_agent=user_agent,
            referrer=referrer,
            metadata_json=metadata_json
        )
        db.add(event)
        await db.commit()

    @staticmethod
    async def get_overview(
        db: AsyncSession,
        store_id: str,
        period: str = "7d"  # "today", "7d", "30d", "90d"
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        if period == "today":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            days_count = 1
        elif period == "30d":
            start_date = now - timedelta(days=30)
            days_count = 30
        elif period == "90d":
            start_date = now - timedelta(days=90)
            days_count = 90
        else:  # default 7d
            start_date = now - timedelta(days=7)
            days_count = 7

        # Total products
        total_p_res = await db.execute(select(func.count(Product.id)).where(Product.store_id == store_id, Product.is_archived == False))
        total_products = total_p_res.scalar() or 0

        # Active products
        active_p_res = await db.execute(select(func.count(Product.id)).where(Product.store_id == store_id, Product.is_published == True, Product.is_archived == False))
        active_products = active_p_res.scalar() or 0

        # Total categories
        cat_res = await db.execute(select(func.count(Category.id)).where(Category.store_id == store_id))
        total_categories = cat_res.scalar() or 0

        # Store views
        store_views_res = await db.execute(
            select(func.count(AnalyticsEvent.id)).where(
                AnalyticsEvent.store_id == store_id,
                AnalyticsEvent.event_type == "store_visit",
                AnalyticsEvent.created_at >= start_date
            )
        )
        store_views = store_views_res.scalar() or 0

        # Product views
        prod_views_res = await db.execute(
            select(func.count(AnalyticsEvent.id)).where(
                AnalyticsEvent.store_id == store_id,
                AnalyticsEvent.event_type == "product_view",
                AnalyticsEvent.created_at >= start_date
            )
        )
        product_views = prod_views_res.scalar() or 0

        # Contact clicks (leads)
        clicks_res = await db.execute(
            select(func.count(AnalyticsEvent.id)).where(
                AnalyticsEvent.store_id == store_id,
                AnalyticsEvent.event_type == "contact_click",
                AnalyticsEvent.created_at >= start_date
            )
        )
        contact_clicks = clicks_res.scalar() or 0

        # Dynamic views by day
        # Query event counts grouped by day
        views_by_day = []
        for i in range(days_count):
            day_start = (now - timedelta(days=days_count - 1 - i)).replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            day_views_q = await db.execute(
                select(func.count(AnalyticsEvent.id)).where(
                    AnalyticsEvent.store_id == store_id,
                    AnalyticsEvent.event_type.in_(["store_visit", "product_view"]),
                    AnalyticsEvent.created_at >= day_start,
                    AnalyticsEvent.created_at < day_end
                )
            )
            day_clicks_q = await db.execute(
                select(func.count(AnalyticsEvent.id)).where(
                    AnalyticsEvent.store_id == store_id,
                    AnalyticsEvent.event_type == "contact_click",
                    AnalyticsEvent.created_at >= day_start,
                    AnalyticsEvent.created_at < day_end
                )
            )
            views_by_day.append({
                "date": day_start.strftime("%Y-%m-%d"),
                "views": day_views_q.scalar() or 0,
                "clicks": day_clicks_q.scalar() or 0
            })

        # Popular products
        pop_q = await db.execute(
            select(Product.id, Product.name, Product.price, Product.currency, func.count(AnalyticsEvent.id).label("views_count"))
            .join(Product, Product.id == AnalyticsEvent.product_id)
            .where(AnalyticsEvent.store_id == store_id, AnalyticsEvent.event_type == "product_view", AnalyticsEvent.created_at >= start_date)
            .group_by(Product.id, Product.name, Product.price, Product.currency)
            .order_by(desc("views_count"))
            .limit(5)
        )
        popular_products = [
            {"id": row[0], "name": row[1], "price": row[2], "currency": row[3], "views": row[4]}
            for row in pop_q.all()
        ]

        # Popular categories
        pop_cat_q = await db.execute(
            select(Category.id, Category.name, func.count(AnalyticsEvent.id).label("views_count"))
            .join(Product, Product.id == AnalyticsEvent.product_id)
            .join(Category, Category.id == Product.category_id)
            .where(AnalyticsEvent.store_id == store_id, AnalyticsEvent.event_type == "product_view", AnalyticsEvent.created_at >= start_date)
            .group_by(Category.id, Category.name)
            .order_by(desc("views_count"))
            .limit(5)
        )
        popular_categories = [
            {"id": row[0], "name": row[1], "views": row[2]}
            for row in pop_cat_q.all()
        ]

        return {
            "total_products": total_products,
            "active_products": active_products,
            "total_categories": total_categories,
            "store_views": store_views,
            "product_views": product_views,
            "contact_clicks": contact_clicks,
            "period": period,
            "views_by_day": views_by_day,
            "popular_products": popular_products,
            "popular_categories": popular_categories
        }
