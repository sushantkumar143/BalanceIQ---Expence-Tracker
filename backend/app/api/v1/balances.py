"""Balance and explainability routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.base import get_db
from app.models import User
from app.schemas.balance import BalanceEntry, BalanceExplanation, DashboardMetrics
from app.api.deps import get_current_user
from app.api.v1.groups import _verify_membership
from app.services.balance_engine import balance_engine
from app.services.settlement_engine import settlement_engine
from app.models import Group, GroupMember, Expense, Import
from sqlalchemy import func

router = APIRouter(tags=["Balances"])


@router.get("/groups/{group_id}/balances", response_model=List[BalanceEntry])
async def get_balances(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get net balances for all members in a group."""
    _verify_membership(db, group_id, current_user.id)

    balances = balance_engine.calculate_balances(db, group_id)

    return [
        BalanceEntry(**b)
        for b in balances
    ]


@router.get("/groups/{group_id}/balances/{user_id}/explain")
async def explain_balance(
    group_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Explain WHY a balance exists — fully itemized breakdown.
    This is the core transparency feature.
    """
    _verify_membership(db, group_id, current_user.id)

    explanation = balance_engine.explain_balance(db, group_id, user_id)

    if "error" in explanation:
        raise HTTPException(status_code=404, detail=explanation["error"])

    return explanation


@router.get("/dashboard", response_model=DashboardMetrics)
async def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get dashboard metrics for the current user."""
    # Get user's groups
    memberships = (
        db.query(GroupMember)
        .filter(GroupMember.user_id == current_user.id)
        .all()
    )
    group_ids = [m.group_id for m in memberships]

    # Total expenses across all groups
    total_expenses = float(
        db.query(func.coalesce(func.sum(Expense.amount), 0))
        .filter(Expense.group_id.in_(group_ids), Expense.status == "active")
        .scalar()
        or 0
    )

    # Total groups
    total_groups = len(group_ids)

    # Total unique members across groups
    total_members = (
        db.query(func.count(func.distinct(GroupMember.user_id)))
        .filter(GroupMember.group_id.in_(group_ids))
        .scalar()
        or 0
    )

    # Open balances (absolute sum of all non-zero balances)
    open_balances = 0.0
    for gid in group_ids:
        balances = balance_engine.calculate_balances(db, gid)
        open_balances += sum(abs(b["net_balance"]) for b in balances if b["net_balance"] < 0)

    # Pending imports
    pending_imports = (
        db.query(func.count(Import.id))
        .filter(
            Import.group_id.in_(group_ids),
            Import.status.notin_(["completed", "failed"]),
        )
        .scalar()
        or 0
    )

    # Recent activity (last 10 expenses across all groups)
    recent_expenses = (
        db.query(Expense)
        .filter(Expense.group_id.in_(group_ids), Expense.status == "active")
        .order_by(Expense.created_at.desc())
        .limit(10)
        .all()
    )

    recent_activity = [
        {
            "id": e.id,
            "description": e.description,
            "amount": float(e.amount),
            "currency": e.currency,
            "date": e.expense_date.isoformat(),
            "group_id": e.group_id,
        }
        for e in recent_expenses
    ]

    # Monthly spending (last 6 months)
    monthly = (
        db.query(
            func.strftime("%Y-%m", Expense.expense_date).label("month"),
            func.sum(Expense.amount).label("total"),
        )
        .filter(Expense.group_id.in_(group_ids), Expense.status == "active")
        .group_by(func.strftime("%Y-%m", Expense.expense_date))
        .order_by(func.strftime("%Y-%m", Expense.expense_date).desc())
        .limit(6)
        .all()
    )

    monthly_spending = [
        {"month": m.month, "total": round(float(m.total), 2)}
        for m in reversed(monthly)
    ]

    return DashboardMetrics(
        total_expenses=round(total_expenses, 2),
        total_groups=total_groups,
        total_members=total_members,
        open_balances=round(open_balances, 2),
        pending_imports=pending_imports,
        recent_activity=recent_activity,
        monthly_spending=monthly_spending,
    )
