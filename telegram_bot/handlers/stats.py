from aiogram import Router, types
from backend.app.core.database import AsyncSessionLocal
from backend.app.services.analytics_service import AnalyticsService
from telegram_bot.handlers.store import get_user_store

router = Router()


@router.message(lambda msg: msg.text == "📊 Статистика")
async def btn_stats(message: types.Message):
    user, store = await get_user_store(str(message.from_user.id))
    if not user or not store:
        await message.answer("⚠️ Сначала привяжите ваш аккаунт SELLER HUB через веб-панель.")
        return

    async with AsyncSessionLocal() as session:
        overview = await AnalyticsService.get_overview(session, store.id, period="7d")

    text = (
        f"📊 <b>Статистика магазина «{store.name}» (за 7 дней):</b>\n\n"
        f"👀 <b>Просмотров витрины:</b> {overview['store_views']}\n"
        f"📦 <b>Просмотров товаров:</b> {overview['product_views']}\n"
        f"💬 <b>Переходов к продавцу (лиды):</b> {overview['contact_clicks']}\n\n"
    )

    if overview["popular_products"]:
        text += "🔥 <b>Популярные товары:</b>\n"
        for idx, p in enumerate(overview["popular_products"][:3], 1):
            text += f"{idx}. {p['name']} — {p['views']} просм. ({p['price']} {p['currency']})\n"

    await message.answer(text, parse_mode="HTML")


@router.message(lambda msg: msg.text == "⚙️ Настройки")
async def btn_settings(message: types.Message):
    user, store = await get_user_store(str(message.from_user.id))
    if not user:
        await message.answer("⚠️ Аккаунт не привязан.")
        return

    await message.answer(
        f"⚙️ <b>Настройки аккаунта:</b>\n\n"
        f"👤 <b>Пользователь:</b> {user.full_name or user.email}\n"
        f"📧 <b>Email:</b> {user.email or 'не указан'}\n"
        f"🔔 <b>Уведомления:</b> Включены ✅\n\n"
        f"Для изменения пароля или данных перейдите в веб-версию личного кабинета.",
        parse_mode="HTML"
    )


@router.message(lambda msg: msg.text == "🌐 Открыть сайт")
async def btn_open_site(message: types.Message):
    from backend.app.core.config import settings
    await message.answer(
        f"🌐 <b>Перейти на платформу SELLER HUB:</b>\n\n"
        f"Личный кабинет: <a href='{settings.platform.base_url}/dashboard'>Панель продавца</a>\n"
        f"Главная страница: <a href='{settings.platform.base_url}'>{settings.platform.base_url}</a>",
        parse_mode="HTML",
        disable_web_page_preview=True
    )
