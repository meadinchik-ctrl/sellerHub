import asyncio
import logging
import ssl
import certifi
from aiogram import Bot, Dispatcher
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties
from aiogram.client.session.aiohttp import AiohttpSession
from backend.app.core.config import settings
from backend.app.core.database import init_db
from telegram_bot.handlers import start, store, products, stats, importer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main():
    token = settings.TELEGRAM_BOT_TOKEN
    if not token or token == "test_token_sellerhub_bot":
        logger.warning("TELEGRAM_BOT_TOKEN is not set or using placeholder. Set token in .env to run real Telegram bot.")
        return

    # Initialize DB tables if not already done
    await init_db()

    session = AiohttpSession(proxy=settings.TELEGRAM_PROXY)
    ssl_context = ssl.create_default_context()
    ssl_context.load_verify_locations(cafile=certifi.where())
    session._connector_init["ssl"] = ssl_context
    bot = Bot(
        token=token,
        session=session,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML)
    )
    dp = Dispatcher()

    # Register Routers
    dp.include_router(start.router)
    dp.include_router(store.router)
    dp.include_router(products.router)
    dp.include_router(stats.router)
    dp.include_router(importer.router)

    logger.info("Starting SELLER HUB Telegram Bot polling...")
    try:
        await dp.start_polling(bot, skip_updates=True)
    finally:
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
