from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ==============================
# AUTH SCHEMAS
# ==============================
class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: Optional[str] = None


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class TelegramLoginRequest(BaseModel):
    id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int
    hash: str


class GoogleLoginRequest(BaseModel):
    id_token: Optional[str] = None
    code: Optional[str] = None
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(min_length=6)


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    email: Optional[str]
    full_name: Optional[str]
    avatar_url: Optional[str]
    is_active: bool
    is_verified: bool
    is_admin: bool
    linked_providers: List[str] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================
# STORE SCHEMAS
# ==============================
class StoreCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    slug: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None
    default_currency: str = "USD"
    theme_color: str = "#3b82f6"
    catalog_mode: str = "store"  # "store" or "price_list"
    business_type: str = "retail"  # "retail", "services", "design", "universal"
    enabled_features: Optional[Dict[str, bool]] = None
    contact_telegram: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_whatsapp: Optional[str] = None
    contact_email: Optional[str] = None


class StoreUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None
    default_currency: Optional[str] = None
    theme_color: Optional[str] = None
    catalog_mode: Optional[str] = None
    business_type: Optional[str] = None
    enabled_features: Optional[Dict[str, bool]] = None
    contact_telegram: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_whatsapp: Optional[str] = None
    contact_email: Optional[str] = None
    is_published: Optional[bool] = None


class StoreResponse(BaseModel):
    id: str
    owner_id: str
    name: str
    slug: str
    description: Optional[str]
    logo_url: Optional[str]
    cover_url: Optional[str]
    default_currency: str
    theme_color: str
    catalog_mode: str
    business_type: Optional[str] = "retail"
    enabled_features: Optional[Dict[str, bool]] = None
    is_published: bool
    contact_telegram: Optional[str]
    contact_phone: Optional[str]
    contact_whatsapp: Optional[str]
    contact_email: Optional[str]
    total_products: Optional[int] = 0
    created_at: datetime
    role: Optional[str] = "owner"

    model_config = ConfigDict(from_attributes=True)


# ==============================
# CATEGORY SCHEMAS
# ==============================
class CategoryCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[str] = None
    sort_order: int = 0


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[str] = None
    sort_order: Optional[int] = None


class CategoryResponse(BaseModel):
    id: str
    store_id: str
    name: str
    slug: str
    description: Optional[str]
    parent_id: Optional[str]
    sort_order: int
    product_count: Optional[int] = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================
# PRODUCT SCHEMAS
# ==============================
class ProductImageSchema(BaseModel):
    id: Optional[str] = None
    image_url: str
    sort_order: int = 0
    is_cover: bool = False


class ProductVariantSchema(BaseModel):
    id: Optional[str] = None
    title: str
    sku: Optional[str] = None
    price: float
    old_price: Optional[float] = None
    stock_quantity: int = 0
    attributes: Optional[Dict[str, Any]] = None


class ProductAttributeSchema(BaseModel):
    id: Optional[str] = None
    name: str
    type: str = "text"
    value_text: Optional[str] = None
    value_json: Optional[Any] = None


class ProductCreate(BaseModel):
    category_id: Optional[str] = None
    name: str
    slug: Optional[str] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    price: float = 0.0
    old_price: Optional[float] = None
    currency: str = "USD"
    stock_quantity: int = 1
    is_published: bool = True
    sort_order: int = 0
    video_url: Optional[str] = None
    item_type: str = "product"  # "product" or "service"
    service_duration_min: Optional[int] = None
    price_prefix: Optional[str] = None  # "от", "почасовая", "под ключ"
    service_format: Optional[str] = None  # "online", "in_person", "at_client"
    images: List[ProductImageSchema] = []
    variants: List[ProductVariantSchema] = []
    attributes: List[ProductAttributeSchema] = []


class ProductUpdate(BaseModel):
    category_id: Optional[str] = None
    name: Optional[str] = None
    slug: Optional[str] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    old_price: Optional[float] = None
    currency: Optional[str] = None
    stock_quantity: Optional[int] = None
    is_published: Optional[bool] = None
    is_archived: Optional[bool] = None
    sort_order: Optional[int] = None
    video_url: Optional[str] = None
    item_type: Optional[str] = None
    service_duration_min: Optional[int] = None
    price_prefix: Optional[str] = None
    service_format: Optional[str] = None
    images: Optional[List[ProductImageSchema]] = None
    variants: Optional[List[ProductVariantSchema]] = None
    attributes: Optional[List[ProductAttributeSchema]] = None


class ProductResponse(BaseModel):
    id: str
    store_id: str
    category_id: Optional[str]
    name: str
    slug: str
    sku: Optional[str]
    description: Optional[str]
    price: float
    old_price: Optional[float]
    currency: str
    stock_quantity: int
    is_published: bool
    is_archived: bool
    sort_order: int
    video_url: Optional[str]
    item_type: Optional[str] = "product"
    service_duration_min: Optional[int] = None
    price_prefix: Optional[str] = None
    service_format: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    images: List[ProductImageSchema] = []
    variants: List[ProductVariantSchema] = []
    attributes: List[ProductAttributeSchema] = []
    category_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class BulkProductAction(BaseModel):
    product_ids: List[str]
    action: str  # "publish", "unpublish", "archive", "unarchive", "delete", "change_category"
    target_category_id: Optional[str] = None


# ==============================
# IMPORT & EXPORT SCHEMAS
# ==============================
class ColumnMapping(BaseModel):
    name: str  # source file column header
    target_field: Optional[str] = None  # "name", "sku", "price", "old_price", "description", "category", "stock_quantity", "image_url"


class ImportExecuteRequest(BaseModel):
    file_id: str
    duplicate_strategy: str = "update"  # "update", "skip", "duplicate"
    column_mappings: Dict[str, str]  # { "Название": "name", "Цена": "price", ... }


class ImportJobResponse(BaseModel):
    id: str
    store_id: str
    filename: str
    file_format: str
    status: str
    total_rows: int
    processed_rows: int
    created_rows: int
    updated_rows: int
    skipped_rows: int
    error_log: List[Any] = []
    created_at: datetime
    completed_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


# ==============================
# CRM SCHEMAS
# ==============================
class CustomerCreate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    telegram_username: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = []


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    telegram_username: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class CustomerResponse(BaseModel):
    id: str
    store_id: str
    name: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    telegram_username: Optional[str]
    notes: Optional[str]
    tags: List[str] = []
    total_inquiries: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================
# ANALYTICS SCHEMAS
# ==============================
class TrackEventRequest(BaseModel):
    event_type: str  # "store_visit", "product_view", "contact_click"
    product_id: Optional[str] = None
    channel: Optional[str] = None  # "telegram", "whatsapp", "phone"
    referrer: Optional[str] = None
    customer_info: Optional[Dict[str, Any]] = None


class AnalyticsOverview(BaseModel):
    total_products: int
    active_products: int
    total_categories: int
    store_views: int
    product_views: int
    contact_clicks: int
    period: str
    views_by_day: List[Dict[str, Any]] = []
    popular_products: List[Dict[str, Any]] = []
    popular_categories: List[Dict[str, Any]] = []


# ==============================
# TEAM SCHEMAS
# ==============================
class TeamInviteRequest(BaseModel):
    email: EmailStr
    role: str = "manager"  # "admin", "manager", "viewer"


class TeamMemberResponse(BaseModel):
    id: str
    user_id: Optional[str]
    email: Optional[str]
    full_name: Optional[str]
    avatar_url: Optional[str]
    role: str
    status: str
    created_at: datetime


class TeamRoleUpdate(BaseModel):
    role: str


# ==============================
# PLANS & SUBSCRIPTIONS
# ==============================
class PlanResponse(BaseModel):
    id: str
    name: str
    price: float
    max_products: int
    max_stores: int
    max_employees: int
    features: Dict[str, Any]


class SubscriptionResponse(BaseModel):
    id: str
    plan_name: str
    status: str
    max_products: int
    max_stores: int
    max_employees: int
    current_products_count: int
    current_stores_count: int
    current_employees_count: int


# ==============================
# BOOKING & SERVICES SCHEMAS
# ==============================
class BookingSlotCreate(BaseModel):
    product_id: Optional[str] = None
    client_name: str
    client_phone: Optional[str] = None
    client_telegram: Optional[str] = None
    booking_date: str
    booking_time: str
    notes: Optional[str] = None


class BookingSlotUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class BookingSlotResponse(BaseModel):
    id: str
    store_id: str
    product_id: Optional[str]
    client_name: str
    client_phone: Optional[str] = None
    client_telegram: Optional[str] = None
    booking_date: str
    booking_time: str
    status: str
    notes: Optional[str]
    created_at: datetime
    product_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ==============================
# PORTFOLIO SCHEMAS
# ==============================
class PortfolioItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    is_before_after: bool = False
    before_image_url: Optional[str] = None
    after_image_url: Optional[str] = None
    image_url: Optional[str] = None
    project_url: Optional[str] = None
    sort_order: int = 0


class PortfolioItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    is_before_after: Optional[bool] = None
    before_image_url: Optional[str] = None
    after_image_url: Optional[str] = None
    image_url: Optional[str] = None
    project_url: Optional[str] = None
    sort_order: Optional[int] = None


class PortfolioItemResponse(BaseModel):
    id: str
    store_id: str
    title: str
    description: Optional[str]
    category: Optional[str]
    is_before_after: bool
    before_image_url: Optional[str]
    after_image_url: Optional[str]
    image_url: Optional[str]
    project_url: Optional[str]
    sort_order: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

