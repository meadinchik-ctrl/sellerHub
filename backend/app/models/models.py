import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, Float, ForeignKey, DateTime, JSON, Index, func
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=True)
    password_hash = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=True)
    avatar_url = Column(String(512), nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Relationships
    oauth_accounts = relationship("OAuthAccount", back_populates="user", cascade="all, delete-orphan")
    stores = relationship("Store", back_populates="owner", cascade="all, delete-orphan")
    memberships = relationship("StoreMember", back_populates="user", cascade="all, delete-orphan")
    telegram_connections = relationship("TelegramConnection", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")


class OAuthAccount(Base):
    __tablename__ = "oauth_accounts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(50), nullable=False)  # "google", "telegram"
    provider_user_id = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    username = Column(String(255), nullable=True)
    extra_data = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="oauth_accounts")

    __table_args__ = (
        Index("idx_oauth_provider_user", "provider", "provider_user_id", unique=True),
    )


class Store(Base):
    __tablename__ = "stores"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    logo_url = Column(String(512), nullable=True)
    cover_url = Column(String(512), nullable=True)
    default_currency = Column(String(10), default="USD")
    theme_color = Column(String(30), default="#3b82f6")  # Accent brand color
    is_published = Column(Boolean, default=True)
    catalog_mode = Column(String(50), default="store")  # "store" or "price_list"
    business_type = Column(String(50), default="retail")  # "retail", "services", "design", "universal"
    enabled_features = Column(JSON, default=lambda: {
        "products": True,
        "services": False,
        "booking": False,
        "portfolio": False,
        "briefs": False,
        "reviews": False
    })
    
    # Direct contact channels
    contact_telegram = Column(String(255), nullable=True)  # @username or t.me link
    contact_phone = Column(String(50), nullable=True)
    contact_whatsapp = Column(String(50), nullable=True)
    contact_email = Column(String(255), nullable=True)
    custom_domain = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    owner = relationship("User", back_populates="stores")
    members = relationship("StoreMember", back_populates="store", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="store", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="store", cascade="all, delete-orphan")
    customers = relationship("Customer", back_populates="store", cascade="all, delete-orphan")
    analytics = relationship("AnalyticsEvent", back_populates="store", cascade="all, delete-orphan")
    import_jobs = relationship("ImportJob", back_populates="store", cascade="all, delete-orphan")
    booking_slots = relationship("BookingSlot", back_populates="store", cascade="all, delete-orphan")
    portfolio_items = relationship("PortfolioItem", back_populates="store", cascade="all, delete-orphan")


class StoreMember(Base):
    __tablename__ = "store_members"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    store_id = Column(String(36), ForeignKey("stores.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    role = Column(String(50), default="manager")  # "owner", "admin", "manager", "viewer"
    invite_email = Column(String(255), nullable=True)
    invite_token = Column(String(255), nullable=True, index=True)
    status = Column(String(50), default="active")  # "active", "pending"
    created_at = Column(DateTime(timezone=True), default=utcnow)

    store = relationship("Store", back_populates="members")
    user = relationship("User", back_populates="memberships")


class Category(Base):
    __tablename__ = "categories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    store_id = Column(String(36), ForeignKey("stores.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_id = Column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    store = relationship("Store", back_populates="categories")
    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    store_id = Column(String(36), ForeignKey("stores.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), nullable=False)
    sku = Column(String(100), nullable=True, index=True)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False, default=0.0)
    old_price = Column(Float, nullable=True)
    currency = Column(String(10), default="USD")
    stock_quantity = Column(Integer, default=1)
    is_published = Column(Boolean, default=True, index=True)
    is_archived = Column(Boolean, default=False, index=True)
    sort_order = Column(Integer, default=0)
    video_url = Column(String(512), nullable=True)
    item_type = Column(String(50), default="product")  # "product", "service"
    service_duration_min = Column(Integer, nullable=True)  # e.g., 60 minutes
    price_prefix = Column(String(20), nullable=True)  # e.g. "от", "почасовая", "под ключ"
    service_format = Column(String(50), nullable=True)  # "online", "in_person", "at_client"
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    store = relationship("Store", back_populates="products")
    category = relationship("Category", back_populates="products")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.sort_order")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    attributes = relationship("ProductAttribute", back_populates="product", cascade="all, delete-orphan")


class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(String(512), nullable=False)
    sort_order = Column(Integer, default=0)
    is_cover = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    product = relationship("Product", back_populates="images")


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)  # e.g. "XL / Черный"
    sku = Column(String(100), nullable=True)
    price = Column(Float, nullable=False)
    old_price = Column(Float, nullable=True)
    stock_quantity = Column(Integer, default=0)
    attributes = Column(JSON, nullable=True)  # {"size": "XL", "color": "Черный"}
    created_at = Column(DateTime(timezone=True), default=utcnow)

    product = relationship("Product", back_populates="variants")


class ProductAttribute(Base):
    __tablename__ = "product_attributes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(50), default="text")  # "text", "number", "date", "boolean", "select", "multiselect", "link"
    value_text = Column(Text, nullable=True)
    value_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    product = relationship("Product", back_populates="attributes")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    store_id = Column(String(36), ForeignKey("stores.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    telegram_username = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    tags = Column(JSON, default=list)  # ["VIP", "Опт"]
    total_inquiries = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    store = relationship("Store", back_populates="customers")
    inquiries = relationship("CustomerInquiry", back_populates="customer", cascade="all, delete-orphan")


class CustomerInquiry(Base):
    __tablename__ = "customer_inquiries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    store_id = Column(String(36), ForeignKey("stores.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=True, index=True)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    channel = Column(String(50), default="telegram")
    message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    customer = relationship("Customer", back_populates="inquiries")


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    store_id = Column(String(36), ForeignKey("stores.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True)
    event_type = Column(String(50), nullable=False, index=True)  # "store_visit", "product_view", "contact_click"
    visitor_ip_hash = Column(String(64), nullable=True)
    user_agent = Column(String(512), nullable=True)
    referrer = Column(String(512), nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, index=True)

    store = relationship("Store", back_populates="analytics")


class ImportJob(Base):
    __tablename__ = "import_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    store_id = Column(String(36), ForeignKey("stores.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    filename = Column(String(255), nullable=False)
    file_format = Column(String(10), default="xlsx")
    status = Column(String(50), default="pending")  # "pending", "processing", "completed", "failed"
    total_rows = Column(Integer, default=0)
    processed_rows = Column(Integer, default=0)
    created_rows = Column(Integer, default=0)
    updated_rows = Column(Integer, default=0)
    skipped_rows = Column(Integer, default=0)
    error_log = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    store = relationship("Store", back_populates="import_jobs")


class Plan(Base):
    __tablename__ = "plans"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(50), unique=True, nullable=False)  # "free", "start", "pro", "business"
    price = Column(Float, default=0.0)
    max_products = Column(Integer, default=30)
    max_stores = Column(Integer, default=1)
    max_employees = Column(Integer, default=0)
    features = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = Column(String(36), ForeignKey("plans.id"), nullable=False)
    status = Column(String(50), default="active")  # "active", "canceled", "expired"
    start_date = Column(DateTime(timezone=True), default=utcnow)
    end_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="subscriptions")
    plan = relationship("Plan")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), nullable=True, index=True)
    store_id = Column(String(36), nullable=True, index=True)
    action = Column(String(100), nullable=False)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, index=True)


class TelegramConnection(Base):
    __tablename__ = "telegram_connections"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    telegram_user_id = Column(String(100), unique=True, index=True, nullable=False)
    telegram_username = Column(String(255), nullable=True)
    telegram_chat_id = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    notifications_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="telegram_connections")


class TelegramLinkToken(Base):
    __tablename__ = "telegram_link_tokens"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(128), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class TelegramAuthToken(Base):
    """Temporary token for Telegram Bot-based Web Login"""
    __tablename__ = "telegram_auth_tokens"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    token = Column(String(128), unique=True, index=True, nullable=False)
    telegram_user_id = Column(String(100), nullable=True, index=True)
    telegram_username = Column(String(255), nullable=True)
    first_name = Column(String(255), nullable=True)
    last_name = Column(String(255), nullable=True)
    photo_url = Column(String(512), nullable=True)
    confirmed = Column(Boolean, default=False)
    used = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class BookingSlot(Base):
    """Онлайн-запись клиентов (для бьюти, косметологов, консультантов)"""
    __tablename__ = "booking_slots"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    store_id = Column(String(36), ForeignKey("stores.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True)
    client_name = Column(String(255), nullable=False)
    client_phone = Column(String(50), nullable=True)
    client_telegram = Column(String(255), nullable=True)
    booking_date = Column(String(20), nullable=False)  # "YYYY-MM-DD"
    booking_time = Column(String(20), nullable=False)  # "HH:MM"
    status = Column(String(50), default="pending")  # "pending", "confirmed", "completed", "cancelled"
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    store = relationship("Store", back_populates="booking_slots")
    product = relationship("Product")


class PortfolioItem(Base):
    """Портфолио / Кейсы / До-После (для дизайнеров, косметологов, фотографов)"""
    __tablename__ = "portfolio_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    store_id = Column(String(36), ForeignKey("stores.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    
    # Для слайдера До / После (косметологи, ретушеры, дизайн интерьеров)
    is_before_after = Column(Boolean, default=False)
    before_image_url = Column(String(512), nullable=True)
    after_image_url = Column(String(512), nullable=True)
    
    # Для обычных кейсов
    image_url = Column(String(512), nullable=True)
    project_url = Column(String(512), nullable=True)  # Behance, сайт и т.д.
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    store = relationship("Store", back_populates="portfolio_items")


