"""Group management routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import date

from app.db.base import get_db
from app.models import Group, GroupMember, User, Expense
from app.schemas.group import (
    GroupCreate, GroupUpdate, GroupResponse, GroupDetailResponse,
    MemberAdd, MemberUpdate, MemberResponse,
)
from app.api.deps import get_current_user
from app.core.security import hash_password

router = APIRouter(prefix="/groups", tags=["Groups"])


@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    data: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new expense group."""
    group = Group(
        name=data.name,
        description=data.description,
        default_currency=data.default_currency,
        created_by=current_user.id,
    )
    db.add(group)
    db.flush()

    # Add creator as admin member
    member = GroupMember(
        group_id=group.id,
        user_id=current_user.id,
        display_name=current_user.name,
        role="admin",
        join_date=date.today(),
    )
    db.add(member)
    db.commit()
    db.refresh(group)

    return _build_group_response(db, group)


@router.get("", response_model=List[GroupResponse])
async def list_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all groups the current user belongs to."""
    memberships = (
        db.query(GroupMember)
        .filter(GroupMember.user_id == current_user.id)
        .all()
    )

    group_ids = [m.group_id for m in memberships]
    groups = db.query(Group).filter(Group.id.in_(group_ids)).all()

    return [_build_group_response(db, g) for g in groups]


@router.get("/{group_id}", response_model=GroupDetailResponse)
async def get_group(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get group details with members."""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    _verify_membership(db, group_id, current_user.id)

    response = _build_group_response(db, group)
    members = _get_members(db, group_id)

    return GroupDetailResponse(
        **response.model_dump(),
        members=members,
    )


@router.put("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: str,
    data: GroupUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update group details."""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    _verify_membership(db, group_id, current_user.id)

    if data.name is not None:
        group.name = data.name
    if data.description is not None:
        group.description = data.description
    if data.default_currency is not None:
        group.default_currency = data.default_currency

    db.commit()
    db.refresh(group)

    return _build_group_response(db, group)


@router.post("/{group_id}/members", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
async def add_member(
    group_id: str,
    data: MemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a member to the group."""
    _verify_membership(db, group_id, current_user.id)

    # Find or create user by email
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user:
        # Create a placeholder account
        user = User(
            email=data.email.lower(),
            name=data.display_name or data.email.split("@")[0],
            password_hash=hash_password("changeme123"),  # Temp password
        )
        db.add(user)
        db.flush()

    # Check if already a member
    existing = (
        db.query(GroupMember)
        .filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user.id,
            GroupMember.leave_date.is_(None),
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already an active member of this group",
        )

    member = GroupMember(
        group_id=group_id,
        user_id=user.id,
        display_name=data.display_name or user.name,
        role=data.role,
        join_date=data.join_date,
    )
    db.add(member)
    db.commit()
    db.refresh(member)

    return MemberResponse(
        id=member.id,
        user_id=user.id,
        user_name=user.name,
        user_email=user.email,
        display_name=member.display_name,
        role=member.role,
        join_date=member.join_date,
        leave_date=member.leave_date,
        created_at=member.created_at,
    )


@router.patch("/{group_id}/members/{member_id}", response_model=MemberResponse)
async def update_member(
    group_id: str,
    member_id: str,
    data: MemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update member details (display name, role, dates)."""
    _verify_membership(db, group_id, current_user.id)

    member = (
        db.query(GroupMember)
        .filter(GroupMember.id == member_id, GroupMember.group_id == group_id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if data.display_name is not None:
        member.display_name = data.display_name
    if data.role is not None:
        member.role = data.role
    if data.join_date is not None:
        member.join_date = data.join_date
    if data.leave_date is not None:
        member.leave_date = data.leave_date

    db.commit()
    db.refresh(member)

    user = db.query(User).filter(User.id == member.user_id).first()

    return MemberResponse(
        id=member.id,
        user_id=member.user_id,
        user_name=user.name if user else "",
        user_email=user.email if user else "",
        display_name=member.display_name,
        role=member.role,
        join_date=member.join_date,
        leave_date=member.leave_date,
        created_at=member.created_at,
    )


@router.delete("/{group_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    group_id: str,
    member_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Set a member's leave date to today (soft remove)."""
    _verify_membership(db, group_id, current_user.id)

    member = (
        db.query(GroupMember)
        .filter(GroupMember.id == member_id, GroupMember.group_id == group_id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    member.leave_date = date.today()
    db.commit()


# ---- Helpers ----

def _verify_membership(db: Session, group_id: str, user_id: str):
    """Verify user is a member of the group."""
    member = (
        db.query(GroupMember)
        .filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id,
        )
        .first()
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this group",
        )


def _build_group_response(db: Session, group: Group) -> GroupResponse:
    """Build a GroupResponse with computed fields."""
    member_count = (
        db.query(func.count(GroupMember.id))
        .filter(GroupMember.group_id == group.id)
        .scalar()
    )
    total_expenses = float(
        db.query(func.coalesce(func.sum(Expense.amount), 0))
        .filter(Expense.group_id == group.id, Expense.status == "active")
        .scalar()
        or 0
    )
    creator = db.query(User).filter(User.id == group.created_by).first()

    return GroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        default_currency=group.default_currency,
        created_by=group.created_by,
        creator_name=creator.name if creator else "",
        member_count=member_count,
        total_expenses=round(total_expenses, 2),
        created_at=group.created_at,
    )


def _get_members(db: Session, group_id: str) -> List[MemberResponse]:
    """Get all members of a group with user details."""
    members = (
        db.query(GroupMember)
        .filter(GroupMember.group_id == group_id)
        .order_by(GroupMember.join_date)
        .all()
    )

    result = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        result.append(
            MemberResponse(
                id=m.id,
                user_id=m.user_id,
                user_name=user.name if user else "",
                user_email=user.email if user else "",
                display_name=m.display_name,
                role=m.role,
                join_date=m.join_date,
                leave_date=m.leave_date,
                created_at=m.created_at,
            )
        )

    return result
