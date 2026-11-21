import os
import uuid
from aiogram import Router, types, Bot, F
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.database import AsyncSessionLocal
from backend.app.core.config import settings
from backend.app.services.import_service import ImportService
from telegram_bot.handlers.store import get_user_store

router = Router()


@router.message(lambda msg: msg.text == "📥 Импорт")
async def btn_import_prompt(message: types.Message):
    user, store = await get_user_store(str(message.from_user.id))
    if not user or not store:
        await message.answer("⚠️ Сначала привяжите ваш аккаунт SELLER HUB через веб-панель.")
        return

    await message.answer(
        f"📥 <b>Быстрый импорт товаров в магазин «{store.name}»</b>\n\n"
        f"Просто прикрепите и отправьте сюда файл таблицы <b>Excel (.xlsx)</b> или <b>CSV (.csv)</b>.\n\n"
        f"Бот автоматически распознает колонки (Название, Цена, SKU, Категория, Описание, Остаток, Ссылка на фото) "
        f"и добавит товары в ваш каталог!",
        parse_mode="HTML"
    )


@router.message(F.document)
async def handle_document_upload(message: types.Message, bot: Bot):
    user, store = await get_user_store(str(message.from_user.id))
    if not user or not store:
        await message.answer("⚠️ Сначала привяжите ваш аккаунт SELLER HUB через веб-панель.")
        return

    doc = message.document
    filename = doc.file_name or "file.xlsx"
    ext = filename.split(".")[-1].lower()

    if ext not in ["xlsx", "xls", "csv"]:
        await message.answer("⚠️ Пожалуйста, отправьте файл в формате .xlsx или .csv")
        return

    wait_msg = await message.answer("⏳ <i>Загружаю и анализирую таблицу...</i>", parse_mode="HTML")

    # Download file
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    temp_filename = f"import_tg_{uuid.uuid4().hex[:12]}.{ext}"
    dest_path = os.path.join(settings.STORAGE_DIR, temp_filename)

    file_info = await bot.get_file(doc.file_id)
    await bot.download_file(file_info.file_path, dest_path)

    try:
        df = ImportService.read_dataframe(dest_path, ext)
        columns = [str(c).strip() for c in df.columns]
        suggested = ImportService.detect_column_mappings(columns)

        # Check if name is present
        name_col = None
        for col, target in suggested.items():
            if target == "name":
                name_col = col
                break

        if not name_col:
            # Fallback to first column as name
            name_col = columns[0]
            suggested[name_col] = "name"

        # Build execution mappings
        column_mappings = {col: target for col, target in suggested.items() if target}

        await wait_msg.edit_text("⚙️ <i>Обрабатываю строки и обновляю каталог...</i>", parse_mode="HTML")

        async with AsyncSessionLocal() as session:
            job = await ImportService.execute_import(
                db=session,
                store=store,
                user_id=user.id,
                file_id=temp_filename,
                column_mappings=column_mappings,
                duplicate_strategy="update"
            )

        report = (
            f"✅ <b>Импорт успешно завершен!</b>\n\n"
            f"🏪 Магазин: <b>{store.name}</b>\n"
            f"📦 Добавлено новых товаров: <b>{job.created_rows}</b>\n"
            f"🔄 Обновлено существующих: <b>{job.updated_rows}</b>\n"
            f"⏭ Пропущено: <b>{job.skipped_rows}</b>\n"
            f"Всего строк в таблице: <b>{job.total_rows}</b>\n\n"
            f"🔗 <a href='{settings.platform.base_url}/dashboard/products'>Открыть товары в панели управления</a>"
        )
        await wait_msg.edit_text(report, parse_mode="HTML", disable_web_page_preview=True)

    except Exception as e:
        await wait_msg.edit_text(f"❌ <b>Ошибка при обработке файла:</b>\n{str(e)}", parse_mode="HTML")
        if os.path.exists(dest_path):
            try:
                os.remove(dest_path)
            except Exception:
                pass
