import httpx
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.core.config import settings
from backend.app.models.models import TelegramConnection, User


class TelegramService:
    @staticmethod
    async def send_message_raw(chat_id: str, text: str, parse_mode: str = "HTML") -> bool:
        bot_token = settings.TELEGRAM_BOT_TOKEN
        if not bot_token or bot_token == "test_token_sellerhub_bot":
            print(f"[Telegram Dev Log] To: {chat_id} | Msg: {text}")
            return True

        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                return res.status_code == 200
        except Exception as e:
            print(f"[Telegram Send Error] {e}")
            return False

    @staticmethod
    async def send_user_notification(db: AsyncSession, user_id: str, text: str) -> bool:
        q = await db.execute(
            select(TelegramConnection).where(
                TelegramConnection.user_id == user_id,
                TelegramConnection.is_active == True,
                TelegramConnection.notifications_enabled == True
            )
        )
        conn = q.scalar_one_or_none()
        if not conn or not conn.telegram_chat_id:
            return False

        return await TelegramService.send_message_raw(conn.telegram_chat_id, text)
