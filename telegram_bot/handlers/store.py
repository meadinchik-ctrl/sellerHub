from aiogram import Router, types, F
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from backend.app.core.database import AsyncSessionLocal
from backend.app.core.config import settings
from backend.app.models.models import User, Store, Product, TelegramConnection
from telegram_bot.keyboards.keyboards import get_store_inline_keyboard

router = Router()


async def get_user_store(tg_id: str) -> tuple[User | None, Store | None]:
    async with AsyncSessionLocal() as session:
        q = await session.execute(
            select(User)
            .join(TelegramConnection, TelegramConnection.user_id == User.id)
            .where(TelegramConnection.telegram_user_id == tg_id, TelegramConnection.is_active == True)
        )
        user = q.scalar_one_or_none()
        if not user:
            return None, None

        q_store = await session.execute(
            select(Store).where(Store.owner_id == user.id).order_by(Store.created_at.asc())
        )
        store = q_store.scalars().first()
        return user, store


@router.message(lambda msg: msg.text == "🏪 Мой магазин")
async def btn_my_store(message: types.Message):
    user, store = await get_user_store(str(message.from_user.id))
    if not user or not store:
        await message.answer("⚠️ Сначала привяжите ваш аккаунт SELLER HUB через веб-панель.")
        return

    async with AsyncSessionLocal() as session:
        p_count = (await session.execute(
            select(func.count(Product.id)).where(Product.store_id == store.id, Product.is_archived == False)
        )).scalar() or 0
        pub_count = (await session.execute(
            select(func.count(Product.id)).where(Product.store_id == store.id, Product.is_published == True, Product.is_archived == False)
        )).scalar() or 0

    status_badge = "🟢 Опубликован" if store.is_published else "🔴 Скрыт от покупателей"
    mode_text = "Компактный прайс-лист" if store.catalog_mode == "price_list" else "Витрина товаров"
    store_url = f"{settings.platform.base_url}/shop/{store.slug}"

    text = (
        f"🏪 <b>{store.name}</b>\n\n"
        f"<b>Статус:</b> {status_badge}\n"
        f"<b>Режим:</b> {mode_text}\n"
        f"<b>Валюта:</b> {store.default_currency}\n"
        f"<b>Товаров в каталоге:</b> {p_count} (активных: {pub_count})\n"
        f"<b>Контакт для заказов:</b> {store.contact_telegram or 'не указан'}\n\n"
        f"🔗 <b>Публичная ссылка для клиентов:</b>\n{store_url}"
    )

    await message.answer(
        text,
        reply_markup=get_store_inline_keyboard(store.slug, store.is_published),
        parse_mode="HTML"
    )


@router.callback_query(F.data.startswith("toggle_pub_"))
async def cb_toggle_store_publication(callback: types.CallbackQuery):
    slug = callback.data.replace("toggle_pub_", "")
    user, store = await get_user_store(str(callback.from_user.id))
    if not user or not store or store.slug != slug:
        await callback.answer("Ошибка доступа", show_alert=True)
        return

    async with AsyncSessionLocal() as session:
        q = await session.execute(select(Store).where(Store.id == store.id))
        st = q.scalar_one()
        st.is_published = not st.is_published
        new_status = st.is_published
        await session.commit()

    await callback.answer(f"Статус изменен на: {'Опубликован' if new_status else 'Скрыт'}")
    # Refresh message
    await callback.message.edit_reply_markup(
        reply_markup=get_store_inline_keyboard(store.slug, new_status)
    )
