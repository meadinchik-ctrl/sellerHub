import secrets
from typing import Dict, Any, Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.core.database import get_db
from backend.app.core.security import verify_password, get_password_hash
from backend.app.core.dependencies import get_current_user
from backend.app.core.config import settings
from backend.app.models.models import User, OAuthAccount, TelegramConnection
from backend.app.schemas.schemas import (
    UserRegisterRequest, UserLoginRequest, TelegramLoginRequest,
    GoogleLoginRequest, TokenResponse, ChangePasswordRequest,
    UserProfileUpdate, UserResponse
)
from backend.app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


def set_auth_cookies(response: Response, tokens: Dict[str, str]):
    """Set persistent HttpOnly cookies for session storage"""
    # 30 days cookie
    max_age = 30 * 24 * 3600
    response.set_cookie(
        key="access_token",
        value=tokens["access_token"],
        max_age=max_age,
        path="/",
        httponly=True,
        samesite="lax",
        secure=False  # Allow local HTTP testing; in production HTTPS handles it
    )
    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh_token"],
        max_age=max_age,
        path="/",
        httponly=True,
        samesite="lax",
        secure=False
    )


def clear_auth_cookies(response: Response):
    # Overwrite with empty value and max_age=0, expired date and explicit paths
    response.set_cookie(
        key="access_token",
        value="",
        max_age=0,
        expires=0,
        path="/",
        httponly=True,
        samesite="lax",
        secure=False
    )
    response.set_cookie(
        key="refresh_token",
        value="",
        max_age=0,
        expires=0,
        path="/",
        httponly=True,
        samesite="lax",
        secure=False
    )
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")


@router.post("/register", response_model=TokenResponse)
async def register(req: UserRegisterRequest, response: Response, db: AsyncSession = Depends(get_db)):
    user, tokens = await AuthService.register_email(db, req.email, req.password, req.full_name)
    set_auth_cookies(response, tokens)
    return {
        **tokens,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "is_admin": user.is_admin,
            "is_verified": user.is_verified
        }
    }


@router.post("/login", response_model=TokenResponse)
async def login(req: UserLoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    user, tokens = await AuthService.login_email(db, req.email, req.password)
    set_auth_cookies(response, tokens)
    return {
        **tokens,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "is_admin": user.is_admin,
            "is_verified": user.is_verified
        }
    }


@router.post("/telegram-login", response_model=TokenResponse)
async def telegram_login(req: TelegramLoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    auth_data = req.model_dump()
    user, tokens = await AuthService.authenticate_telegram_widget(db, auth_data)
    set_auth_cookies(response, tokens)
    return {
        **tokens,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "is_admin": user.is_admin,
            "is_verified": user.is_verified
        }
    }


@router.post("/telegram/request-auth")
async def telegram_request_auth(db: AsyncSession = Depends(get_db)):
    """Initiates login via Telegram Bot, returning auth token and deep link"""
    token, deep_link = await AuthService.create_telegram_auth_token(db)
    bot_username = settings.TELEGRAM_BOT_USERNAME or settings.platform.telegram_bot.bot_username
    return {
        "token": token,
        "bot_url": deep_link,
        "bot_username": bot_username,
        "expires_in_minutes": 10
    }


@router.get("/telegram/check-auth")
async def telegram_check_auth(token: str, response: Response, db: AsyncSession = Depends(get_db)):
    """Polls or verifies if user confirmed Telegram login via bot"""
    result = await AuthService.check_and_consume_telegram_auth(db, token)
    if not result:
        return {"status": "pending", "confirmed": False}

    user, tokens = result
    set_auth_cookies(response, tokens)
    return {
        "status": "confirmed",
        "confirmed": True,
        **tokens,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "is_admin": user.is_admin,
            "is_verified": user.is_verified
        }
    }


@router.get("/google/url")
async def get_google_auth_url():
    """Generates real Google OAuth 2.0 authorization URL"""
    client_id = settings.GOOGLE_CLIENT_ID or settings.platform.google_oauth.client_id
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    state = secrets.token_urlsafe(16)
    
    # Standard Google OAuth 2.0 auth endpoint
    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"response_type=code&client_id={client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"scope=openid%20email%20profile&"
        f"access_type=offline&state={state}&prompt=select_account"
    )
    return {
        "url": google_auth_url,
        "state": state
    }


@router.post("/google/callback")
@router.post("/google-login", response_model=TokenResponse)
async def google_login(req: GoogleLoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    # Support both code exchange (OAuth callback) and direct token/payload
    email = req.email
    name = req.name
    avatar = req.avatar_url or settings.platform.default_store_avatar
    google_id = None

    if req.code:
        # Real OAuth 2.0 exchange with Google token endpoint
        client_id = settings.GOOGLE_CLIENT_ID or settings.platform.google_oauth.client_id
        client_secret = settings.GOOGLE_CLIENT_SECRET
        redirect_uri = settings.GOOGLE_REDIRECT_URI

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                token_res = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "code": req.code,
                        "grant_type": "authorization_code",
                        "redirect_uri": redirect_uri
                    }
                )
                if token_res.status_code == 200:
                    token_data = token_res.json()
                    access_token = token_data.get("access_token")
                    # Fetch user info
                    userinfo_res = await client.get(
                        "https://www.googleapis.com/oauth2/v2/userinfo",
                        headers={"Authorization": f"Bearer {access_token}"}
                    )
                    if userinfo_res.status_code == 200:
                        uinfo = userinfo_res.json()
                        email = uinfo.get("email")
                        name = uinfo.get("name")
                        avatar = uinfo.get("picture", avatar)
                        google_id = uinfo.get("id")
        except Exception as e:
            # If Google API call fails, return a proper error
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ошибка обмена кода Google: {str(e)}"
            )

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email не получен от Google. Проверьте настройки Google OAuth."
        )

    name = name or "Google User"
    user, tokens = await AuthService.authenticate_google(
        db, email=email, name=name, avatar_url=avatar, provider_user_id=google_id
    )
    set_auth_cookies(response, tokens)
    return {
        **tokens,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "is_admin": user.is_admin,
            "is_verified": user.is_verified
        }
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    q_oauth = await db.execute(select(OAuthAccount.provider).where(OAuthAccount.user_id == user.id))
    providers = list(set(q_oauth.scalars().all()))
    if user.password_hash:
        providers.append("email")

    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        is_verified=user.is_verified,
        is_admin=user.is_admin,
        linked_providers=providers,
        created_at=user.created_at
    )


@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user.password_hash and not verify_password(req.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Неверный старый пароль")
    
    user.password_hash = get_password_hash(req.new_password)
    await db.commit()
    return {"message": "Пароль успешно обновлен"}


@router.post("/profile")
async def update_profile(
    req: UserProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if req.full_name is not None:
        user.full_name = req.full_name
    if req.avatar_url is not None:
        user.avatar_url = req.avatar_url
    await db.commit()
    return {"message": "Профиль успешно обновлен"}


@router.post("/unlink-provider/{provider}")
async def unlink_provider(
    provider: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await AuthService.unlink_oauth_provider(db, user, provider)
    return {"message": f"Способ входа {provider} успешно отвязан"}


@router.post("/telegram-bot-link-token")
async def generate_bot_link_token(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    token = await AuthService.generate_telegram_link_token(db, user.id)
    bot_username = settings.TELEGRAM_BOT_USERNAME or settings.platform.telegram_bot.bot_username
    link = f"https://t.me/{bot_username}?start=link_{token}"
    return {
        "token": token,
        "deep_link": link,
        "bot_username": bot_username,
        "expires_in_minutes": 15
    }


@router.get("/telegram-connection-status")
async def get_telegram_connection_status(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    q = await db.execute(
        select(TelegramConnection).where(
            TelegramConnection.user_id == user.id,
            TelegramConnection.is_active == True
        )
    )
    conn = q.scalar_one_or_none()
    return {
        "connected": conn is not None,
        "telegram_username": conn.telegram_username if conn else None,
        "notifications_enabled": conn.notifications_enabled if conn else False
    }


@router.post("/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"message": "Успешный выход из системы"}
