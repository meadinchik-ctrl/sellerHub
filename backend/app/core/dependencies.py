from typing import Optional, Tuple
from fastapi import Depends, HTTPException, status, Header, Query, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.core.database import get_db
from backend.app.core.security import decode_token
from backend.app.models.models import User, Store, StoreMember

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


async def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    # First check cookie "access_token", then fallback to Bearer header
    resolved_token = request.cookies.get("access_token") or token
    if not resolved_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_token(resolved_token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный или просроченный токен",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Токен поврежден")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Пользователь заблокирован или не найден")
    return user


async def get_current_user_optional(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    resolved_token = request.cookies.get("access_token") or token
    if not resolved_token:
        return None
    payload = decode_token(resolved_token)
    if not payload or payload.get("type") != "access":
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    return user if user and user.is_active else None


async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ разрешен только администраторам платформы"
        )
    return current_user


async def get_store_context(
    store_id: Optional[str] = Query(None),
    x_store_id: Optional[str] = Header(None, alias="X-Store-Id"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Tuple[Store, str]:
    """
    Returns (Store, role) for the authenticated user.
    Role is one of: 'owner', 'admin', 'manager', 'viewer'
    """
    target_store_id = x_store_id or store_id

    if target_store_id:
        # Check direct ownership
        q_store = await db.execute(select(Store).where(Store.id == target_store_id))
        store = q_store.scalar_one_or_none()
        if not store:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Магазин не найден")
        
        if store.owner_id == current_user.id or current_user.is_admin:
            return store, "owner"
        
        # Check member role
        q_member = await db.execute(
            select(StoreMember).where(
                StoreMember.store_id == target_store_id,
                StoreMember.user_id == current_user.id,
                StoreMember.status == "active"
            )
        )
        member = q_member.scalar_one_or_none()
        if not member:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="У вас нет доступа к этому магазину")
        return store, member.role

    # If no store specified, get user's first owned or joined store
    q_owner_store = await db.execute(select(Store).where(Store.owner_id == current_user.id).order_by(Store.created_at.asc()))
    first_store = q_owner_store.scalars().first()
    if first_store:
        return first_store, "owner"

    q_member_store = await db.execute(
        select(Store, StoreMember.role)
        .join(StoreMember, StoreMember.store_id == Store.id)
        .where(StoreMember.user_id == current_user.id, StoreMember.status == "active")
    )
    first_member_row = q_member_store.first()
    if first_member_row:
        return first_member_row[0], first_member_row[1]

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="У вас еще нет созданных магазинов")
