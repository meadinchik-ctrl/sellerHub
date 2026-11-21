import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from backend.app.core.security import get_password_hash
from backend.app.models.models import (
    User, Store, Category, Product, ProductImage, ProductVariant,
    ProductAttribute, Customer, CustomerInquiry, AnalyticsEvent,
    Plan, Subscription
)
from backend.app.core.config import settings
from backend.app.api.plans import ensure_plans


async def seed_database(db: AsyncSession) -> dict:
    await ensure_plans(db)

    # 1. Superadmin User
    admin_email = settings.ADMIN_EMAIL or "admin@sellerhub.com"
    admin_password = settings.ADMIN_PASSWORD or "admin123456"

    admin_q = await db.execute(select(User).where(User.email == admin_email))
    admin = admin_q.scalar_one_or_none()
    if not admin:
        admin = User(
            id=str(uuid.uuid4()),
            email=admin_email,
            password_hash=get_password_hash(admin_password),
            full_name="Главный Администратор",
            avatar_url="/default-store-avatar.png",
            is_active=True,
            is_verified=True,
            is_admin=True
        )
        db.add(admin)
        await db.flush()

        # Business subscription
        pro_plan = (await db.execute(select(Plan).where(Plan.name == "business"))).scalar_one()
        db.add(Subscription(id=str(uuid.uuid4()), user_id=admin.id, plan_id=pro_plan.id, status="active"))
        await db.commit()

    # 2. Demo Seller User
    seller_q = await db.execute(select(User).where(User.email == "seller@sellerhub.com"))
    seller = seller_q.scalar_one_or_none()
    if not seller:
        seller = User(
            id=str(uuid.uuid4()),
            email="seller@sellerhub.com",
            password_hash=get_password_hash("seller123456"),
            full_name="Иван Продавец",
            avatar_url="/default-store-avatar.png",
            is_active=True,
            is_verified=True,
            is_admin=False
        )
        db.add(seller)
        await db.flush()

        pro_plan = (await db.execute(select(Plan).where(Plan.name == "pro"))).scalar_one()
        db.add(Subscription(id=str(uuid.uuid4()), user_id=seller.id, plan_id=pro_plan.id, status="active"))

    # 3. Demo Store: Urban Style
    store_q = await db.execute(select(Store).where(Store.slug == "urban-style"))
    store = store_q.scalar_one_or_none()
    if not store:
        store = Store(
            id=str(uuid.uuid4()),
            owner_id=seller.id,
            name="Urban Style Store",
            slug="urban-style",
            description="Стильная современная одежда, обувь и аксессуары. Доставка по всей стране. Оплата и передача товара лично с продавцом.",
            default_currency="RUB",
            theme_color="#2563eb",
            catalog_mode="store",
            contact_telegram="sellerhub_support",
            contact_phone="+7 (999) 123-45-67",
            contact_whatsapp="+79991234567",
            contact_email="urbanstyle@example.com",
            is_published=True,
            cover_url="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80",
            logo_url="https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=200&auto=format&fit=crop&q=80"
        )
        db.add(store)
        await db.flush()

    # 4. Categories
    cat_names = ["Одежда", "Обувь", "Аксессуары", "Спорт и отдых"]
    cats = {}
    for idx, cname in enumerate(cat_names):
        cq = await db.execute(select(Category).where(Category.store_id == store.id, Category.name == cname))
        cat = cq.scalar_one_or_none()
        if not cat:
            cat = Category(
                id=str(uuid.uuid4()),
                store_id=store.id,
                name=cname,
                slug=f"cat-{idx+1}",
                sort_order=idx
            )
            db.add(cat)
            await db.flush()
        cats[cname] = cat

    # 5. Products
    demo_products_data = [
      {
        "name": "Oversize Худи «Graphite Cloud»",
        "sku": "URB-HD-01",
        "category": "Одежда",
        "price": 4990.0,
        "old_price": 6490.0,
        "stock": 25,
        "img": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80",
        "desc": "Плотный трехниточный футер с начесом. 80% хлопок, 20% полиэстер. Сохраняет форму после стирок.",
        "variants": [
          {"title": "Размер S", "sku": "URB-HD-01-S", "price": 4990.0, "stock": 5},
          {"title": "Размер M", "sku": "URB-HD-01-M", "price": 4990.0, "stock": 10},
          {"title": "Размер L", "sku": "URB-HD-01-L", "price": 4990.0, "stock": 7},
          {"title": "Размер XL", "sku": "URB-HD-01-XL", "price": 4990.0, "stock": 3}
        ],
        "attrs": [
          {"name": "Материал", "value": "Хлопок 80%, полиэстер 20%"},
          {"name": "Цвет", "value": "Графитовый серый"},
          {"name": "Сезон", "value": "Демисезон / Зима"}
        ]
      },
      {
        "name": "Карго брюки с накладными карманами",
        "sku": "URB-CR-02",
        "category": "Одежда",
        "price": 5490.0,
        "old_price": None,
        "stock": 18,
        "img": "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&auto=format&fit=crop&q=80",
        "desc": "Удобные карго свободного кроя. Глубокие карманы, прочная ткань рипстоп.",
        "variants": [
          {"title": "Размер M / Черный", "sku": "URB-CR-02-M", "price": 5490.0, "stock": 8},
          {"title": "Размер L / Черный", "sku": "URB-CR-02-L", "price": 5490.0, "stock": 10}
        ],
        "attrs": [
          {"name": "Крой", "value": "Loose Fit"},
          {"name": "Ткань", "value": "Ripstop хлопок"}
        ]
      },
      {
        "name": "Кроссовки Urban Runner Street",
        "sku": "URB-SN-03",
        "category": "Обувь",
        "price": 8900.0,
        "old_price": 11500.0,
        "stock": 12,
        "img": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80",
        "desc": "Амортизирующая подошва EVA, дышащий верх из сетки и натуральной замши.",
        "variants": [
          {"title": "41 EU", "sku": "URB-SN-03-41", "price": 8900.0, "stock": 4},
          {"title": "42 EU", "sku": "URB-SN-03-42", "price": 8900.0, "stock": 4},
          {"title": "43 EU", "sku": "URB-SN-03-43", "price": 8900.0, "stock": 4}
        ],
        "attrs": [
          {"name": "Подошва", "value": "EVA + Резина"},
          {"name": "Амортизация", "value": "ActiveAir"}
        ]
      },
      {
        "name": "Кожаный рюкзак Urban Voyager",
        "sku": "URB-BG-04",
        "category": "Аксессуары",
        "price": 7990.0,
        "old_price": 9900.0,
        "stock": 15,
        "img": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80",
        "desc": "Отделение для ноутбука 15.6 дюймов, водоотталкивающая пропитка, усиленные молнии YKK.",
        "variants": [],
        "attrs": [
          {"name": "Вместимость", "value": "22 литра"},
          {"name": "Отсек для ноутбука", "value": "До 16 дюймов"}
        ]
      },
      {
        "name": "Солнцезащитные очки Matte Black",
        "sku": "URB-GL-05",
        "category": "Аксессуары",
        "price": 2490.0,
        "old_price": 3200.0,
        "stock": 30,
        "img": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80",
        "desc": "Поляризационные линзы UV400, прочная матовая оправа из ацетата.",
        "variants": [],
        "attrs": [
          {"name": "Защита", "value": "UV400 Polarized"},
          {"name": "Материал оправы", "value": "TR-90"}
        ]
      },
      {
        "name": "Фитнес-бутылка Thermal 750ml",
        "sku": "URB-BT-06",
        "category": "Спорт и отдых",
        "price": 1490.0,
        "old_price": None,
        "stock": 40,
        "img": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80",
        "desc": "Вакуумная изоляция, держит тепло 12 часов и холод 24 часа. Пищевая сталь 18/8.",
        "variants": [],
        "attrs": [
          {"name": "Объем", "value": "750 мл"},
          {"name": "Материал", "value": "Нержавеющая сталь"}
        ]
      }
    ]

    for pdata in demo_products_data:
        pq = await db.execute(select(Product).where(Product.store_id == store.id, Product.sku == pdata["sku"]))
        if not pq.scalar_one_or_none():
            p_id = str(uuid.uuid4())
            cat = cats.get(pdata["category"])
            product = Product(
                id=p_id,
                store_id=store.id,
                category_id=cat.id if cat else None,
                name=pdata["name"],
                slug=f"demo-{pdata['sku'].lower()}",
                sku=pdata["sku"],
                description=pdata["desc"],
                price=pdata["price"],
                old_price=pdata["old_price"],
                currency="RUB",
                stock_quantity=pdata["stock"],
                is_published=True
            )
            db.add(product)
            await db.flush()

            # Image
            db.add(ProductImage(
                id=str(uuid.uuid4()),
                product_id=p_id,
                image_url=pdata["img"],
                is_cover=True,
                sort_order=0
            ))

            # Variants
            for v in pdata["variants"]:
                db.add(ProductVariant(
                    id=str(uuid.uuid4()),
                    product_id=p_id,
                    title=v["title"],
                    sku=v["sku"],
                    price=v["price"],
                    stock_quantity=v["stock"]
                ))

            # Attributes
            for a in pdata["attrs"]:
                db.add(ProductAttribute(
                    id=str(uuid.uuid4()),
                    product_id=p_id,
                    name=a["name"],
                    type="text",
                    value_text=a["value"]
                ))

    # 6. Sample CRM Customers
    sample_customers = [
        {"name": "Алексей Смирнов", "tg": "alex_smirnov", "phone": "+7 (916) 111-22-33", "tags": ["VIP", "Опт"], "inquiries": 4, "note": "Крупный оптовый заказчик из Санкт-Петербурга."},
        {"name": "Елена Кузнецова", "tg": "elena_k", "phone": "+7 (926) 444-55-66", "tags": ["Новый"], "inquiries": 1, "note": "Уточняла размерную сетку для худи."},
        {"name": "Дмитрий Морозов", "tg": "dima_runner", "phone": "+7 (903) 777-88-99", "tags": ["Постоянный"], "inquiries": 3, "note": "Брал кроссовки, очень доволен качеством."}
    ]

    for cdata in sample_customers:
        cq = await db.execute(select(Customer).where(Customer.store_id == store.id, Customer.telegram_username == cdata["tg"]))
        if not cq.scalar_one_or_none():
            c_id = str(uuid.uuid4())
            customer = Customer(
                id=c_id,
                store_id=store.id,
                name=cdata["name"],
                telegram_username=cdata["tg"],
                phone=cdata["phone"],
                tags=cdata["tags"],
                total_inquiries=cdata["inquiries"],
                notes=cdata["note"]
            )
            db.add(customer)
            await db.flush()

            db.add(CustomerInquiry(
                id=str(uuid.uuid4()),
                store_id=store.id,
                customer_id=c_id,
                channel="telegram",
                message=f"Здравствуйте! Хочу заказать позицию из каталога. Контакт: @{cdata['tg']}"
            ))

    # 7. Sample 7-day Analytics Events
    now = datetime.now(timezone.utc)
    for day_offset in range(7):
        event_date = now - timedelta(days=day_offset, hours=2)
        # Visits
        for _ in range(8 + (day_offset * 3)):
            db.add(AnalyticsEvent(
                id=str(uuid.uuid4()),
                store_id=store.id,
                event_type="store_visit",
                created_at=event_date
            ))
        # Product views
        for _ in range(12 + (day_offset * 4)):
            db.add(AnalyticsEvent(
                id=str(uuid.uuid4()),
                store_id=store.id,
                event_type="product_view",
                created_at=event_date
            ))
        # Contact clicks
        for _ in range(2 + (day_offset % 3)):
            db.add(AnalyticsEvent(
                id=str(uuid.uuid4()),
                store_id=store.id,
                event_type="contact_click",
                created_at=event_date
            ))

    await db.commit()
    return {
        "status": "success",
        "message": "Demo data seeded successfully!",
        "admin_credentials": {"email": "admin@sellerhub.com", "password": "admin123456"},
        "seller_credentials": {"email": "seller@sellerhub.com", "password": "seller123456"},
        "demo_store": "/shop/urban-style"
    }
