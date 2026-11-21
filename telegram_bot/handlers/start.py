from aiogram import Router, types
from aiogram.filters import Command, CommandStart, CommandObject
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.core.database import AsyncSessionLocal
from backend.app.core.config import settings
from backend.app.models.models import User, TelegramConnection
from backend.app.services.auth_service import AuthService
from telegram_bot.keyboards.keyboards import get_main_reply_keyboard

router = Router()


@router.message(CommandStart(deep_link=True))
async def cmd_start_deeplink(message: types.Message, command: CommandObject):
    payload = command.args
    tg_id = str(message.from_user.id)
    username = message.from_user.username
    chat_id = str(message.chat.id)

    if payload and payload.startswith("auth_"):
        token = payload.replace("auth_", "")
        confirm_markup = types.InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    types.InlineKeyboardButton(
                        text="✅ Подтвердить вход в SELLER HUB",
                        callback_data=f"confirm_auth:{token}"
                    )
                ],
                [
                    types.InlineKeyboardButton(
                        text="❌ Отклонить",
                        callback_data=f"cancel_auth:{token}"
                    )
                ]
            ]
        )
        await message.answer(
            "🔐 <b>Запрос на авторизацию в SELLER HUB</b>\n\n"
            "Вы запросили вход в веб-панель через этого бота.\n"
            "Если это вы, нажмите кнопку <b>«Подтвердить вход»</b> ниже.\n"
            "Срок действия запроса — 10 минут.",
            reply_markup=confirm_markup,
            parse_mode="HTML"
        )
        return

    if payload and payload.startswith("link_"):
        token = payload.replace("link_", "")
        async with AsyncSessionLocal() as session:
            user = await AuthService.verify_and_link_telegram_bot(
                session, token=token, telegram_user_id=tg_id, telegram_username=username, chat_id=chat_id
            )
            if user:
                await message.answer(
                    f"🎉 <b>Аккаунт успешно привязан!</b>\n\n"
                    f"Добро пожаловать в <b>SELLER HUB</b>, {user.full_name or 'Продавец'}!\n"
                    f"Теперь вы можете управлять магазином, товарами, просматривать аналитику и отправлять файлы для импорта прямо в этот чат.",
                    reply_markup=get_main_reply_keyboard(is_linked=True),
                    parse_mode="HTML"
                )
                return
            else:
                await message.answer(
                    "❌ <b>Ссылка устарела или недействительна.</b>\n"
                    "Пожалуйста, перейдите в личный кабинет на сайте и сгенерируйте новую ссылку для привязки Telegram-бота.",
                    reply_markup=get_main_reply_keyboard(is_linked=False),
                    parse_mode="HTML"
                )
                return

    # Regular start fallback
    await cmd_start(message)


@router.message(CommandStart())
async def cmd_start(message: types.Message):
    tg_id = str(message.from_user.id)
    async with AsyncSessionLocal() as session:
        q = await session.execute(
            select(TelegramConnection, User)
            .join(User, User.id == TelegramConnection.user_id)
            .where(TelegramConnection.telegram_user_id == tg_id, TelegramConnection.is_active == True)
        )
        row = q.first()

    if row:
        conn, user = row
        await message.answer(
            f"👋 С возвращением в <b>SELLER HUB</b>, {user.full_name}!\n\n"
            f"Выберите нужное действие в меню ниже:",
            reply_markup=get_main_reply_keyboard(is_linked=True),
            parse_mode="HTML"
        )
    else:
        site_url = settings.platform.base_url
        await message.answer(
            f"👋 Добро пожаловать в <b>SELLER HUB Assistant</b>!\n\n"
            f"Этот бот позволяет управлять вашим ассортиментом, изменять цены товаров, следить за просмотрами витрины и импортировать таблицы Excel/CSV.\n\n"
            f"Чтобы начать, войдите в личный кабинет на сайте <b>{site_url}</b> и привяжите бота в разделе <b>Настройки → Telegram</b>.",
            reply_markup=get_main_reply_keyboard(is_linked=False),
            parse_mode="HTML"
        )


@router.callback_query(lambda c: c.data and c.data.startswith("confirm_auth:"))
async def process_confirm_auth(callback: types.CallbackQuery):
    token = callback.data.split(":", 1)[1]
    tg_id = str(callback.from_user.id)
    username = callback.from_user.username
    first_name = callback.from_user.first_name
    last_name = callback.from_user.last_name

    async with AsyncSessionLocal() as session:
        success = await AuthService.confirm_telegram_auth_token(
            session,
            token=token,
            telegram_user_id=tg_id,
            telegram_username=username,
            first_name=first_name,
            last_name=last_name
        )

    if success:
        await callback.message.edit_text(
            "✅ <b>Вход подтвержден!</b>\n\n"
            "Вы можете вернуться в браузер — вы будете автоматически авторизованы в системе SELLER HUB.",
            parse_mode="HTML"
        )
    else:
        await callback.message.edit_text(
            "❌ <b>Ссылка устарела или уже была использована.</b>\n"
            "Попробуйте запросить вход заново на странице авторизации.",
            parse_mode="HTML"
        )
    await callback.answer()


@router.callback_query(lambda c: c.data and c.data.startswith("cancel_auth:"))
async def process_cancel_auth(callback: types.CallbackQuery):
    await callback.message.edit_text("❌ Вход отклонен.", parse_mode="HTML")
    await callback.answer()


@router.message(lambda msg: msg.text == "🔗 Привязать аккаунт SELLER HUB")
async def btn_link_account(message: types.Message):
    site_url = settings.platform.base_url
    await message.answer(
        f"Для привязки аккаунта:\n\n"
        f"1. Откройте панель управления: <a href='{site_url}/dashboard/settings'>Настройки магазина</a>\n"
        f"2. В блоке <b>Telegram</b> нажмите кнопку <b>«Подключить бота»</b>\n"
        f"3. Нажмите кнопку «Старт» в открывшемся диалоге с ботом.",
        parse_mode="HTML",
        disable_web_page_preview=True
    )
