import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user, get_store_context
from backend.app.models.models import StoreMember, User, Plan, Subscription
from backend.app.schemas.schemas import TeamInviteRequest, TeamMemberResponse, TeamRoleUpdate

router = APIRouter(prefix="/team", tags=["Team"])


@router.get("", response_model=List[TeamMemberResponse])
async def list_team_members(
    store_context: tuple = Depends(get_store_context),
    db: AsyncSession = Depends(get_db)
):
    store, _ = store_context
    # Owner
    q_owner = await db.execute(select(User).where(User.id == store.owner_id))
    owner = q_owner.scalar_one_or_none()

    q_members = await db.execute(
        select(StoreMember, User)
        .outerjoin(User, User.id == StoreMember.user_id)
        .where(StoreMember.store_id == store.id)
    )
    rows = q_members.all()

    results = []
    if owner:
        results.append(TeamMemberResponse(
            id=f"owner_{owner.id}",
            user_id=owner.id,
            email=owner.email,
            full_name=owner.full_name,
            avatar_url=owner.avatar_url,
            role="owner",
            status="active",
            created_at=owner.created_at
        ))

    for member, user in rows:
        results.append(TeamMemberResponse(
            id=member.id,
            user_id=user.id if user else None,
            email=user.email if user else member.invite_email,
            full_name=user.full_name if user else "Приглашенный сотрудник",
            avatar_url=user.avatar_url if user else None,
            role=member.role,
            status=member.status,
            created_at=member.created_at
        ))
    return results


@router.post("/invite", response_model=TeamMemberResponse)
async def invite_member(
    req: TeamInviteRequest,
    store_context: tuple = Depends(get_store_context),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    store, role = store_context
    if role not in ["owner", "admin"] and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Только владелец или администратор может приглашать сотрудников")

    # Check employee limit for store owner plan
    q_sub = await db.execute(
        select(Plan.max_employees)
        .join(Subscription, Subscription.plan_id == Plan.id)
        .where(Subscription.user_id == store.owner_id, Subscription.status == "active")
    )
    max_emp = q_sub.scalar() or 0

    count_res = await db.execute(
        select(func.count(StoreMember.id)).where(StoreMember.store_id == store.id)
    )
    curr_emp = count_res.scalar() or 0
    if curr_emp >= max_emp and not current_user.is_admin:
        raise HTTPException(
            status_code=403,
            detail=f"На вашем тарифе доступно максимум {max_emp} сотрудников. Для добавления перейдите на тариф Pro или Business."
        )

    clean_email = req.email.strip().lower()
    # Check if user already registered
    q_u = await db.execute(select(User).where(User.email == clean_email))
    target_user = q_u.scalar_one_or_none()

    # Check existing membership
    if target_user:
        q_ex = await db.execute(select(StoreMember).where(StoreMember.store_id == store.id, StoreMember.user_id == target_user.id))
        if q_ex.scalar_one_or_none() or store.owner_id == target_user.id:
            raise HTTPException(status_code=400, detail="Этот пользователь уже состоит в команде магазина")

    member = StoreMember(
        id=str(uuid.uuid4()),
        store_id=store.id,
        user_id=target_user.id if target_user else None,
        role=req.role,
        invite_email=clean_email,
        invite_token=str(uuid.uuid4()),
        status="active" if target_user else "pending"
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)

    return TeamMemberResponse(
        id=member.id,
        user_id=target_user.id if target_user else None,
        email=clean_email,
        full_name=target_user.full_name if target_user else "Приглашенный сотрудник",
        avatar_url=target_user.avatar_url if target_user else None,
        role=member.role,
        status=member.status,
        created_at=member.created_at
    )


@router.put("/{member_id}/role")
async def update_member_role(
    member_id: str,
    req: TeamRoleUpdate,
    store_context: tuple = Depends(get_store_context),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    store, role = store_context
    if role not in ["owner", "admin"] and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    q = await db.execute(select(StoreMember).where(StoreMember.id == member_id, StoreMember.store_id == store.id))
    member = q.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Сотрудник не найден")

    member.role = req.role
    await db.commit()
    return {"message": "Роль обновлена"}


@router.delete("/{member_id}")
async def remove_member(
    member_id: str,
    store_context: tuple = Depends(get_store_context),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    store, role = store_context
    if role not in ["owner", "admin"] and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    q = await db.execute(select(StoreMember).where(StoreMember.id == member_id, StoreMember.store_id == store.id))
    member = q.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Сотрудник не найден")

    await db.delete(member)
    await db.commit()
    return {"message": "Сотрудник удален из магазина"}
