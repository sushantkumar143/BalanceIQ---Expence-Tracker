"""Report routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.db.base import get_db
from app.models import User
from app.api.deps import get_current_user
from app.api.v1.groups import _verify_membership
from app.services.report_engine import report_engine

router = APIRouter(prefix="/groups/{group_id}/reports", tags=["Reports"])


@router.get("/monthly-trends")
async def monthly_trends(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get monthly expense trends."""
    _verify_membership(db, group_id, current_user.id)
    return report_engine.monthly_trends(db, group_id)


@router.get("/categories")
async def category_analysis(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get expense breakdown by category."""
    _verify_membership(db, group_id, current_user.id)
    return report_engine.category_analysis(db, group_id)


@router.get("/contributions")
async def member_contributions(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get member contribution analysis."""
    _verify_membership(db, group_id, current_user.id)
    return report_engine.member_contributions(db, group_id)


@router.get("/settlements")
async def settlement_history(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get settlement history."""
    _verify_membership(db, group_id, current_user.id)
    return report_engine.settlement_history(db, group_id)


@router.get("/currencies")
async def currency_breakdown(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get expense breakdown by currency."""
    _verify_membership(db, group_id, current_user.id)
    return report_engine.currency_breakdown(db, group_id)
