"""Expense management routes."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from decimal import Decimal
import math

from app.db.base import get_db
from app.models import Expense, ExpenseParticipant, GroupMember, User
from app.schemas.expense import (
    ExpenseCreate, ExpenseUpdate, ExpenseResponse,
    ExpenseListResponse, ParticipantResponse,
)
from app.api.deps import get_current_user
from app.api.v1.groups import _verify_membership

router = APIRouter(prefix="/groups/{group_id}/expenses", tags=["Expenses"])


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    group_id: str,
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new expense in the group."""
    _verify_membership(db, group_id, current_user.id)

    # Validate payer is a group member
    payer_member = (
        db.query(GroupMember)
        .filter(GroupMember.group_id == group_id, GroupMember.user_id == data.payer_id)
        .first()
    )
    if not payer_member:
        raise HTTPException(status_code=400, detail="Payer is not a member of this group")

    expense = Expense(
        group_id=group_id,
        payer_id=data.payer_id,
        description=data.description,
        amount=Decimal(str(data.amount)),
        currency=data.currency,
        expense_date=data.expense_date,
        split_type=data.split_type,
        category=data.category,
        notes=data.notes,
    )
    db.add(expense)
    db.flush()

    # Handle participants and splits
    _create_participants(db, expense, data, group_id)

    db.commit()
    db.refresh(expense)

    return _build_expense_response(db, expense)


@router.get("", response_model=ExpenseListResponse)
async def list_expenses(
    group_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    payer_id: Optional[str] = None,
    sort_by: str = Query("date", regex="^(date|amount|description)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List expenses with search, filter, sort, and pagination."""
    _verify_membership(db, group_id, current_user.id)

    query = db.query(Expense).filter(
        Expense.group_id == group_id,
        Expense.status == "active",
    )

    # Search
    if search:
        query = query.filter(
            or_(
                Expense.description.ilike(f"%{search}%"),
                Expense.category.ilike(f"%{search}%"),
            )
        )

    # Filters
    if category:
        query = query.filter(Expense.category == category)
    if payer_id:
        query = query.filter(Expense.payer_id == payer_id)

    # Count total
    total = query.count()

    # Sort
    sort_col = {
        "date": Expense.expense_date,
        "amount": Expense.amount,
        "description": Expense.description,
    }[sort_by]

    if sort_order == "desc":
        query = query.order_by(sort_col.desc())
    else:
        query = query.order_by(sort_col.asc())

    # Paginate
    expenses = query.offset((page - 1) * page_size).limit(page_size).all()

    return ExpenseListResponse(
        items=[_build_expense_response(db, e) for e in expenses],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 1,
    )


@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    group_id: str,
    expense_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get expense details."""
    _verify_membership(db, group_id, current_user.id)

    expense = (
        db.query(Expense)
        .filter(Expense.id == expense_id, Expense.group_id == group_id)
        .first()
    )
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    return _build_expense_response(db, expense)


@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    group_id: str,
    expense_id: str,
    data: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an expense."""
    _verify_membership(db, group_id, current_user.id)

    expense = (
        db.query(Expense)
        .filter(Expense.id == expense_id, Expense.group_id == group_id)
        .first()
    )
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    if data.description is not None:
        expense.description = data.description
    if data.amount is not None:
        expense.amount = Decimal(str(data.amount))
    if data.currency is not None:
        expense.currency = data.currency
    if data.expense_date is not None:
        expense.expense_date = data.expense_date
    if data.payer_id is not None:
        expense.payer_id = data.payer_id
    if data.split_type is not None:
        expense.split_type = data.split_type
    if data.category is not None:
        expense.category = data.category
    if data.notes is not None:
        expense.notes = data.notes

    if data.participants is not None:
        # Delete existing participants and recreate
        db.query(ExpenseParticipant).filter(
            ExpenseParticipant.expense_id == expense_id
        ).delete()
        _create_participants(db, expense, data, group_id)

    db.commit()
    db.refresh(expense)

    return _build_expense_response(db, expense)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    group_id: str,
    expense_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft-delete an expense."""
    _verify_membership(db, group_id, current_user.id)

    expense = (
        db.query(Expense)
        .filter(Expense.id == expense_id, Expense.group_id == group_id)
        .first()
    )
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    expense.status = "deleted"
    db.commit()


# ---- Helpers ----

def _create_participants(db: Session, expense: Expense, data, group_id: str):
    """Create expense participants based on split type."""
    if data.participants:
        # Use provided participants
        for p in data.participants:
            share_amount = p.share_amount
            if share_amount is None and expense.split_type == "equal":
                share_amount = float(expense.amount) / len(data.participants)
            elif share_amount is None and p.share_percentage is not None:
                share_amount = float(expense.amount) * p.share_percentage / 100

            participant = ExpenseParticipant(
                expense_id=expense.id,
                user_id=p.user_id,
                share_amount=Decimal(str(round(share_amount or 0, 2))),
                share_percentage=Decimal(str(p.share_percentage)) if p.share_percentage else None,
                share_units=p.share_units,
            )
            db.add(participant)
    else:
        # Default: split equally among all active group members
        members = (
            db.query(GroupMember)
            .filter(GroupMember.group_id == group_id)
            .all()
        )
        active_members = [
            m for m in members
            if m.is_active_on(expense.expense_date)
        ]

        if active_members:
            share = float(expense.amount) / len(active_members)
            for m in active_members:
                participant = ExpenseParticipant(
                    expense_id=expense.id,
                    user_id=m.user_id,
                    share_amount=Decimal(str(round(share, 2))),
                    share_percentage=Decimal(str(round(100 / len(active_members), 2))),
                )
                db.add(participant)


def _build_expense_response(db: Session, expense: Expense) -> ExpenseResponse:
    """Build an ExpenseResponse with participant details."""
    payer = db.query(User).filter(User.id == expense.payer_id).first()

    participants = (
        db.query(ExpenseParticipant)
        .filter(ExpenseParticipant.expense_id == expense.id)
        .all()
    )

    participant_responses = []
    for p in participants:
        user = db.query(User).filter(User.id == p.user_id).first()
        participant_responses.append(
            ParticipantResponse(
                id=p.id,
                user_id=p.user_id,
                user_name=user.name if user else "",
                share_amount=float(p.share_amount),
                share_percentage=float(p.share_percentage) if p.share_percentage else None,
                share_units=p.share_units,
            )
        )

    return ExpenseResponse(
        id=expense.id,
        group_id=expense.group_id,
        payer_id=expense.payer_id,
        payer_name=payer.name if payer else "",
        description=expense.description,
        amount=float(expense.amount),
        currency=expense.currency,
        expense_date=expense.expense_date,
        split_type=expense.split_type,
        category=expense.category,
        status=expense.status,
        csv_row_number=expense.csv_row_number,
        notes=expense.notes,
        participants=participant_responses,
        created_at=expense.created_at,
    )
