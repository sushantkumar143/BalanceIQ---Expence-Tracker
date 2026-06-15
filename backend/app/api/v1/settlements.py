"""Settlement management routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal

from app.db.base import get_db
from app.models import Settlement, GroupMember, User
from app.schemas.settlement import SettlementCreate, SettlementResponse, SettlementRecommendation
from app.api.deps import get_current_user
from app.api.v1.groups import _verify_membership
from app.services.settlement_engine import settlement_engine

router = APIRouter(prefix="/groups/{group_id}/settlements", tags=["Settlements"])


@router.post("", response_model=SettlementResponse, status_code=status.HTTP_201_CREATED)
async def create_settlement(
    group_id: str,
    data: SettlementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record a settlement (money transfer between members)."""
    _verify_membership(db, group_id, current_user.id)

    settlement = Settlement(
        group_id=group_id,
        payer_id=data.payer_id,
        payee_id=data.payee_id,
        amount=Decimal(str(data.amount)),
        currency=data.currency,
        settlement_date=data.settlement_date,
        notes=data.notes,
    )
    db.add(settlement)
    db.commit()
    db.refresh(settlement)

    return _build_settlement_response(db, settlement, group_id)


@router.get("", response_model=List[SettlementResponse])
async def list_settlements(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all settlements in the group."""
    _verify_membership(db, group_id, current_user.id)

    settlements = (
        db.query(Settlement)
        .filter(Settlement.group_id == group_id)
        .order_by(Settlement.settlement_date.desc())
        .all()
    )

    return [_build_settlement_response(db, s, group_id) for s in settlements]


@router.get("/recommendations", response_model=List[SettlementRecommendation])
async def get_settlement_recommendations(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get optimized settlement recommendations to minimize transfers."""
    _verify_membership(db, group_id, current_user.id)

    recommendations = settlement_engine.recommend_settlements(db, group_id)

    return [
        SettlementRecommendation(**r)
        for r in recommendations
    ]


# ---- Helpers ----

def _build_settlement_response(
    db: Session, settlement: Settlement, group_id: str
) -> SettlementResponse:
    payer_member = (
        db.query(GroupMember)
        .filter(GroupMember.group_id == group_id, GroupMember.user_id == settlement.payer_id)
        .first()
    )
    payee_member = (
        db.query(GroupMember)
        .filter(GroupMember.group_id == group_id, GroupMember.user_id == settlement.payee_id)
        .first()
    )

    return SettlementResponse(
        id=settlement.id,
        group_id=settlement.group_id,
        payer_id=settlement.payer_id,
        payer_name=payer_member.display_name if payer_member else "",
        payee_id=settlement.payee_id,
        payee_name=payee_member.display_name if payee_member else "",
        amount=float(settlement.amount),
        currency=settlement.currency,
        settlement_date=settlement.settlement_date,
        status=settlement.status,
        notes=settlement.notes,
        csv_row_number=settlement.csv_row_number,
        created_at=settlement.created_at,
    )
