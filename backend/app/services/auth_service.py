import uuid
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from backend.app.core.config import settings
from backend.app.core.security import (
    get_password_hash, verify_password, verify_telegram_auth,
    create_access_token, create_refresh_token
)
from backend.app.models.models import (
    User, OAuthAccount, Store, Plan, Subscription, TelegramConnection, TelegramLinkToken, TelegramAuthToken
)


class AuthService:
    @staticmethod
    async def get_or_create_default_plan(db: AsyncSession) -> Plan:
        res = await db.execute(select(Plan).where(Plan.name == "free"))
        free_plan = res.scalar_one_or_none()
        if not free_plan:
            free_plan = Plan(
                id=str(uuid.uuid4()),
                name="free",
                price=0.0,
                max_products=30,
                max_stores=1,
                max_employees=0,
                features={"import": True, "analytics": True, "crm": True, "api": False}
            )
            db.add(free_plan)
            await db.flush()
        return free_plan

    @staticmethod
    async def create_user_with_store(
        db: AsyncSession,
        email: Optional[str] = None,
        password: Optional[str] = None,
        full_name: Optional[str] = None,
        avatar_url: Optional[str] = None,
        is_verified: bool = False,
        is_admin: bool = False
    ) -> User:
        user = User(
            id=str(uuid.uuid4()),
            email=email.lower() if email else None,
            password_hash=get_password_hash(password) if password else None,
            full_name=full_name or (email.split("@")[0] if email else "Пользователь"),
            avatar_url=avatar_url or settings.platform.default_store_avatar,
            is_active=True,
            is_verified=is_verified,
            is_admin=is_admin
        )
        db.add(user)
        await db.flush()

        # Create subscription to Free plan
        plan = await AuthService.get_or_create_default_plan(db)
        sub = Subscription(
            id=str(uuid.uuid4()),
            user_id=user.id,
            plan_id=plan.id,
            status="active"
        )
        db.add(sub)

        # Create initial default store
        base_slug = f"store-{user.id[:8]}"
        initial_store = Store(
            id=str(uuid.uuid4()),
            owner_id=user.id,
            name=settings.platform.default_store_name,
            slug=base_slug,
            description="Добро пожаловать в наш онлайн-каталог!",
            logo_url=settings.platform.default_store_avatar,
            cover_url=None,
            default_currency="USD",
            catalog_mode="store",
            is_published=True
        )
        db.add(initial_store)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def register_email(
        db: AsyncSession, email: str, password: str, full_name: Optional[str] = None
    ) -> Tuple[User, Dict[str, str]]:
        clean_email = email.strip().lower()
        res = await db.execute(select(User).where(User.email == clean_email))
        existing = res.scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Пользователь с таким email уже зарегистрирован")

        # First user is made platform admin automatically
        count_res = await db.execute(select(User))
        is_first_user = count_res.scalars().first() is None

        user = await AuthService.create_user_with_store(
            db, email=clean_email, password=password, full_name=full_name, is_admin=is_first_user
        )
        tokens = AuthService.build_tokens(user)
        return user, tokens

    @staticmethod
    async def login_email(db: AsyncSession, email: str, password: str) -> Tuple[User, Dict[str, str]]:
        clean_email = email.strip().lower()
        res = await db.execute(select(User).where(User.email == clean_email))
        user = res.scalar_one_or_none()
        if not user or not user.password_hash or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный email или пароль")
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ваш аккаунт заблокирован")
        tokens = AuthService.build_tokens(user)
        return user, tokens

    @staticmethod
    async def authenticate_telegram_widget(db: AsyncSession, auth_data: Dict[str, Any]) -> Tuple[User, Dict[str, str]]:
        bot_token = settings.TELEGRAM_BOT_TOKEN
        if not verify_telegram_auth(auth_data, bot_token):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Недействительная подпись Telegram")

        tg_id = str(auth_data["id"])
        username = auth_data.get("username")
        first_name = auth_data.get("first_name", "")
        last_name = auth_data.get("last_name", "")
        full_name = f"{first_name} {last_name}".strip() or username or f"Telegram User {tg_id}"
        photo_url = auth_data.get("photo_url")

        # Find existing OAuth record
        q_oauth = await db.execute(
            select(OAuthAccount).where(OAuthAccount.provider == "telegram", OAuthAccount.provider_user_id == tg_id)
        )
        oauth = q_oauth.scalar_one_or_none()

        if oauth:
            q_user = await db.execute(select(User).where(User.id == oauth.user_id))
            user = q_user.scalar_one_or_none()
            if not user or not user.is_active:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Аккаунт заблокирован")
        else:
            # Create new user
            count_res = await db.execute(select(User))
            is_first_user = count_res.scalars().first() is None
            user = await AuthService.create_user_with_store(
                db, full_name=full_name, avatar_url=photo_url, is_verified=True, is_admin=is_first_user
            )
            oauth = OAuthAccount(
                id=str(uuid.uuid4()),
                user_id=user.id,
                provider="telegram",
                provider_user_id=tg_id,
                username=username,
                extra_data=auth_data
            )
            db.add(oauth)
            await db.commit()

        tokens = AuthService.build_tokens(user)
        return user, tokens

    @staticmethod
    async def authenticate_google(
        db: AsyncSession,
        email: Optional[str],
        name: Optional[str],
        avatar_url: Optional[str],
        provider_user_id: Optional[str] = None
    ) -> Tuple[User, Dict[str, str]]:
        if not email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email не получен от Google")
        
        clean_email = email.strip().lower()
        google_id = provider_user_id or clean_email

        # 1. Check if OAuth account exists
        q_oauth = await db.execute(
            select(OAuthAccount).where(OAuthAccount.provider == "google", OAuthAccount.provider_user_id == google_id)
        )
        oauth = q_oauth.scalar_one_or_none()

        if oauth:
            q_user = await db.execute(select(User).where(User.id == oauth.user_id))
            user = q_user.scalar_one_or_none()
        else:
            # Check if user with this email already exists -> link
            q_user_email = await db.execute(select(User).where(User.email == clean_email))
            user = q_user_email.scalar_one_or_none()

            if not user:
                # Race condition guard: wrap user creation in try/except IntegrityError
                try:
                    count_res = await db.execute(select(User))
                    is_first_user = count_res.scalars().first() is None
                    user = await AuthService.create_user_with_store(
                        db, email=clean_email, full_name=name, avatar_url=avatar_url, is_verified=True, is_admin=is_first_user
                    )
                except IntegrityError:
                    # Another parallel request already created this user — roll back and fetch it
                    await db.rollback()
                    q_retry = await db.execute(select(User).where(User.email == clean_email))
                    user = q_retry.scalar_one_or_none()
                    if not user:
                        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Ошибка создания аккаунта")

            # Check if oauth link already exists (another parallel request may have created it)
            q_oauth_check = await db.execute(
                select(OAuthAccount).where(OAuthAccount.provider == "google", OAuthAccount.provider_user_id == google_id)
            )
            existing_oauth = q_oauth_check.scalar_one_or_none()

            if not existing_oauth:
                # Link Google provider
                oauth = OAuthAccount(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    provider="google",
                    provider_user_id=google_id,
                    email=clean_email,
                    username=name
                )
                db.add(oauth)
                try:
                    await db.commit()
                except IntegrityError:
                    await db.rollback()
            else:
                oauth = existing_oauth

        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Аккаунт заблокирован")

        tokens = AuthService.build_tokens(user)
        return user, tokens

    @staticmethod
    async def unlink_oauth_provider(db: AsyncSession, user: User, provider: str):
        # Check if user has password or other provider
        q_all = await db.execute(select(OAuthAccount).where(OAuthAccount.user_id == user.id))
        all_oauth = q_all.scalars().all()
        has_password = bool(user.password_hash)
        other_oauth = [o for o in all_oauth if o.provider != provider]

        if not has_password and len(other_oauth) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Нельзя отвязать единственный способ входа. Сначала установите пароль или привяжите другой аккаунт."
            )

        await db.execute(
            delete(OAuthAccount).where(OAuthAccount.user_id == user.id, OAuthAccount.provider == provider)
        )
        await db.commit()

    @staticmethod
    async def generate_telegram_link_token(db: AsyncSession, user_id: str) -> str:
        # Generate secure random token
        token = secrets.token_urlsafe(32)
        link_token = TelegramLinkToken(
            id=str(uuid.uuid4()),
            user_id=user_id,
            token=token,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
            used=False
        )
        db.add(link_token)
        await db.commit()
        return token

    @staticmethod
    async def verify_and_link_telegram_bot(
        db: AsyncSession, token: str, telegram_user_id: str, telegram_username: Optional[str], chat_id: str
    ) -> Optional[User]:
        q = await db.execute(
            select(TelegramLinkToken).where(
                TelegramLinkToken.token == token,
                TelegramLinkToken.used == False,
                TelegramLinkToken.expires_at > datetime.now(timezone.utc)
            )
        )
        record = q.scalar_one_or_none()
        if not record:
            return None

        record.used = True
        user_res = await db.execute(select(User).where(User.id == record.user_id))
        user = user_res.scalar_one_or_none()
        if not user:
            return None

        # Upsert TelegramConnection
        q_conn = await db.execute(
            select(TelegramConnection).where(TelegramConnection.telegram_user_id == str(telegram_user_id))
        )
        conn = q_conn.scalar_one_or_none()
        if conn:
            conn.user_id = user.id
            conn.telegram_username = telegram_username
            conn.telegram_chat_id = str(chat_id)
            conn.is_active = True
        else:
            conn = TelegramConnection(
                id=str(uuid.uuid4()),
                user_id=user.id,
                telegram_user_id=str(telegram_user_id),
                telegram_username=telegram_username,
                telegram_chat_id=str(chat_id),
                is_active=True
            )
            db.add(conn)

        # Also add or update OAuth account for telegram login if not present
        q_oauth = await db.execute(
            select(OAuthAccount).where(
                OAuthAccount.provider == "telegram",
                OAuthAccount.provider_user_id == str(telegram_user_id)
            )
        )
        if not q_oauth.scalar_one_or_none():
            oauth = OAuthAccount(
                id=str(uuid.uuid4()),
                user_id=user.id,
                provider="telegram",
                provider_user_id=str(telegram_user_id),
                username=telegram_username
            )
            db.add(oauth)

        await db.commit()
        return user

    @staticmethod
    async def create_telegram_auth_token(db: AsyncSession) -> Tuple[str, str]:
        """Creates a temporary secure token for Web Login via Telegram Bot"""
        token = secrets.token_urlsafe(32)
        record = TelegramAuthToken(
            id=str(uuid.uuid4()),
            token=token,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
            confirmed=False,
            used=False
        )
        db.add(record)
        await db.commit()
        bot_username = settings.TELEGRAM_BOT_USERNAME or settings.platform.telegram_bot.bot_username
        deep_link = f"https://t.me/{bot_username}?start=auth_{token}"
        return token, deep_link

    @staticmethod
    async def confirm_telegram_auth_token(
        db: AsyncSession,
        token: str,
        telegram_user_id: str,
        telegram_username: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        photo_url: Optional[str] = None
    ) -> bool:
        """Called by Telegram Bot when user clicks Confirm Login"""
        q = await db.execute(
            select(TelegramAuthToken).where(
                TelegramAuthToken.token == token,
                TelegramAuthToken.used == False,
                TelegramAuthToken.expires_at > datetime.now(timezone.utc)
            )
        )
        record = q.scalar_one_or_none()
        if not record:
            return False

        record.confirmed = True
        record.telegram_user_id = str(telegram_user_id)
        record.telegram_username = telegram_username
        record.first_name = first_name
        record.last_name = last_name
        record.photo_url = photo_url
        await db.commit()
        return True

    @staticmethod
    async def check_and_consume_telegram_auth(db: AsyncSession, token: str) -> Optional[Tuple[User, Dict[str, str]]]:
        """Checks if Telegram login token was confirmed, logs user in or creates user"""
        q = await db.execute(
            select(TelegramAuthToken).where(
                TelegramAuthToken.token == token,
                TelegramAuthToken.used == False,
                TelegramAuthToken.expires_at > datetime.now(timezone.utc)
            )
        )
        record = q.scalar_one_or_none()
        if not record or not record.confirmed or not record.telegram_user_id:
            return None

        # Mark token as used
        record.used = True

        tg_id = str(record.telegram_user_id)
        username = record.telegram_username
        full_name = f"{record.first_name or ''} {record.last_name or ''}".strip() or username or f"Telegram User {tg_id}"

        # Find or create user via OAuthAccount
        q_oauth = await db.execute(
            select(OAuthAccount).where(OAuthAccount.provider == "telegram", OAuthAccount.provider_user_id == tg_id)
        )
        oauth = q_oauth.scalar_one_or_none()

        if oauth:
            q_user = await db.execute(select(User).where(User.id == oauth.user_id))
            user = q_user.scalar_one_or_none()
            if not user or not user.is_active:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Аккаунт заблокирован")
        else:
            count_res = await db.execute(select(User))
            is_first_user = count_res.scalars().first() is None
            user = await AuthService.create_user_with_store(
                db, full_name=full_name, avatar_url=record.photo_url, is_verified=True, is_admin=is_first_user
            )
            oauth = OAuthAccount(
                id=str(uuid.uuid4()),
                user_id=user.id,
                provider="telegram",
                provider_user_id=tg_id,
                username=username
            )
            db.add(oauth)

        # Also link TelegramConnection if not exists
        q_conn = await db.execute(
            select(TelegramConnection).where(TelegramConnection.telegram_user_id == tg_id)
        )
        conn = q_conn.scalar_one_or_none()
        if not conn:
            conn = TelegramConnection(
                id=str(uuid.uuid4()),
                user_id=user.id,
                telegram_user_id=tg_id,
                telegram_username=username,
                telegram_chat_id=tg_id,
                is_active=True
            )
            db.add(conn)

        await db.commit()
        await db.refresh(user)
        tokens = AuthService.build_tokens(user)
        return user, tokens

    @staticmethod
    def build_tokens(user: User) -> Dict[str, str]:
        access_token = create_access_token(data={"sub": user.id, "email": user.email, "is_admin": user.is_admin})
        refresh_token = create_refresh_token(data={"sub": user.id})
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
