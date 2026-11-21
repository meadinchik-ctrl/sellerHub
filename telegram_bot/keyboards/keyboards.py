from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardMarkup, InlineKeyboardButton
from backend.app.core.config import settings


def get_main_reply_keyboard(is_linked: bool = True) -> ReplyKeyboardMarkup:
    if not is_linked:
        return ReplyKeyboardMarkup(
            keyboard=[
                [KeyboardButton(text="🔗 Привязать аккаунт SELLER HUB")]
            ],
            resize_keyboard=True
        )

    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🏪 Мой магазин"), KeyboardButton(text="📦 Товары")],
            [KeyboardButton(text="📊 Статистика"), KeyboardButton(text="📥 Импорт")],
            [KeyboardButton(text="⚙️ Настройки"), KeyboardButton(text="🌐 Открыть сайт")]
        ],
        resize_keyboard=True
    )


def get_store_inline_keyboard(store_slug: str, is_published: bool) -> InlineKeyboardMarkup:
    web_url = f"{settings.platform.base_url}/shop/{store_slug}"
    admin_url = f"{settings.platform.base_url}/dashboard"
    toggle_text = "🔴 Скрыть каталог" if is_published else "🟢 Опубликовать каталог"
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🌐 Открыть витрину магазина", url=web_url)],
            [InlineKeyboardButton(text=toggle_text, callback_data=f"toggle_pub_{store_slug}")],
            [InlineKeyboardButton(text="⚙️ Управление в веб-панели", url=admin_url)]
        ]
    )


def get_product_action_keyboard(product_id: str, is_published: bool) -> InlineKeyboardMarkup:
    toggle_text = "🔴 Снять с публикации" if is_published else "🟢 Опубликовать"
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="✏️ Изменить цену", callback_data=f"edit_price_{product_id}"),
                InlineKeyboardButton(text=toggle_text, callback_data=f"toggle_prod_{product_id}")
            ]
        ]
    )
