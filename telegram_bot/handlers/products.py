from aiogram import Router, types, F
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from backend.app.core.database import AsyncSessionLocal
from backend.app.models.models import Store, Product
from telegram_bot.handlers.store import get_user_store
from telegram_bot.keyboards.keyboards import get_product_action_keyboard

router = Router()


class EditPriceState(StatesGroup):
    waiting_for_price = State()
    product_id = State()


@router.message(lambda msg: msg.text == "📦 Товары")
async def btn_products(message: types.Message):
    user, store = await get_user_store(str(message.from_user.id))
    if not user or not store:
        await message.answer("⚠️ Привяжите ваш аккаунт SELLER HUB через веб-панель.")
        return

    async with AsyncSessionLocal() as session:
        q = await session.execute(
            select(Product)
            .where(Product.store_id == store.id, Product.is_archived == False)
            .order_by(Product.created_at.desc())
            .limit(6)
        )
        products = q.scalars().all()

    if not products:
        await message.answer(
            f"В вашем магазине <b>{store.name}</b> пока нет добавленных товаров.\n"
            f"Вы можете добавить их вручную на сайте или отправить сюда файл Excel/CSV с товарами!",
            parse_mode="HTML"
        )
        return

    await message.answer(f"📦 <b>Последние товары магазина «{store.name}»:</b>", parse_mode="HTML")
    for p in products:
        status_emoji = "🟢" if p.is_published else "🔴"
        caption = (
            f"{status_emoji} <b>{p.name}</b>\n"
            f"💰 <b>Цена:</b> {p.price} {p.currency}\n"
            f"🏷 <b>SKU:</b> {p.sku or 'б/н'}\n"
            f"📊 <b>Остаток:</b> {p.stock_quantity} шт."
        )
        await message.answer(
            caption,
            reply_markup=get_product_action_keyboard(p.id, p.is_published),
            parse_mode="HTML"
        )


@router.callback_query(F.data.startswith("toggle_prod_"))
async def cb_toggle_product(callback: types.CallbackQuery):
    p_id = callback.data.replace("toggle_prod_", "")
    user, store = await get_user_store(str(callback.from_user.id))
    if not user or not store:
        await callback.answer("Ошибка доступа", show_alert=True)
        return

    async with AsyncSessionLocal() as session:
        q = await session.execute(select(Product).where(Product.id == p_id, Product.store_id == store.id))
        p = q.scalar_one_or_none()
        if not p:
            await callback.answer("Товар не найден", show_alert=True)
            return
        p.is_published = not p.is_published
        new_status = p.is_published
        await session.commit()

    await callback.answer(f"Товар {'опубликован' if new_status else 'снят с публикации'}")
    await callback.message.edit_reply_markup(reply_markup=get_product_action_keyboard(p_id, new_status))


@router.callback_query(F.data.startswith("edit_price_"))
async def cb_edit_price(callback: types.CallbackQuery, state: FSMContext):
    p_id = callback.data.replace("edit_price_", "")
    user, store = await get_user_store(str(callback.from_user.id))
    if not user or not store:
        await callback.answer("Ошибка доступа", show_alert=True)
        return

    await state.set_state(EditPriceState.waiting_for_price)
    await state.update_data(product_id=p_id)
    await callback.message.reply("✏️ Введите новую цену товара (число):")
    await callback.answer()


@router.message(EditPriceState.waiting_for_price)
async def process_new_price(message: types.Message, state: FSMContext):
    data = await state.get_data()
    p_id = data.get("product_id")
    raw_text = message.text.strip().replace(" ", "").replace(",", ".")

    try:
        new_price = float(raw_text)
        if new_price < 0:
            raise ValueError
    except ValueError:
        await message.answer("⚠️ Пожалуйста, введите корректное положительное число (например: 1500 или 29.90):")
        return

    async with AsyncSessionLocal() as session:
        q = await session.execute(select(Product).where(Product.id == p_id))
        p = q.scalar_one_or_none()
        if p:
            p.price = new_price
            await session.commit()
            await message.answer(f"✅ Цена товара <b>«{p.name}»</b> обновлена: <b>{new_price} {p.currency}</b>", parse_mode="HTML")
        else:
            await message.answer("❌ Товар не найден.")

    await state.clear()
