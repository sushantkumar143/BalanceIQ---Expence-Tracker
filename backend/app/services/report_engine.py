"""
Report Engine
--------------
Generates aggregated reports for groups: monthly trends,
category analysis, member contributions, and more.
"""

from typing import List, Dict, Any
from datetime import date, datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from collections import defaultdict

from app.models import Expense, ExpenseParticipant, Settlement, GroupMember


class ReportEngine:
    """Generates analytical reports from expense and settlement data."""

    def monthly_trends(
        self, db: Session, group_id: str, months: int = 12
    ) -> List[Dict[str, Any]]:
        """Get monthly expense totals."""
        results = (
            db.query(
                func.strftime("%Y-%m", Expense.expense_date).label("month"),
                func.sum(Expense.amount).label("total"),
                func.count(Expense.id).label("count"),
            )
            .filter(
                Expense.group_id == group_id,
                Expense.status == "active",
            )
            .group_by(func.strftime("%Y-%m", Expense.expense_date))
            .order_by(func.strftime("%Y-%m", Expense.expense_date))
            .all()
        )

        return [
            {
                "month": r.month,
                "total": round(float(r.total), 2),
                "count": r.count,
            }
            for r in results
        ]

    def category_analysis(
        self, db: Session, group_id: str
    ) -> List[Dict[str, Any]]:
        """Get expense breakdown by category."""
        results = (
            db.query(
                func.coalesce(Expense.category, "Uncategorized").label("category"),
                func.sum(Expense.amount).label("total"),
                func.count(Expense.id).label("count"),
            )
            .filter(
                Expense.group_id == group_id,
                Expense.status == "active",
            )
            .group_by(func.coalesce(Expense.category, "Uncategorized"))
            .order_by(func.sum(Expense.amount).desc())
            .all()
        )

        grand_total = sum(float(r.total) for r in results) or 1

        return [
            {
                "category": r.category,
                "total": round(float(r.total), 2),
                "count": r.count,
                "percentage": round(float(r.total) / grand_total * 100, 1),
            }
            for r in results
        ]

    def member_contributions(
        self, db: Session, group_id: str
    ) -> List[Dict[str, Any]]:
        """Get total contributions (payments) per member."""
        results = (
            db.query(
                Expense.payer_id,
                func.sum(Expense.amount).label("total_paid"),
                func.count(Expense.id).label("expense_count"),
            )
            .filter(
                Expense.group_id == group_id,
                Expense.status == "active",
            )
            .group_by(Expense.payer_id)
            .order_by(func.sum(Expense.amount).desc())
            .all()
        )

        contributions = []
        for r in results:
            member = (
                db.query(GroupMember)
                .filter(
                    GroupMember.group_id == group_id,
                    GroupMember.user_id == r.payer_id,
                )
                .first()
            )
            contributions.append({
                "user_id": r.payer_id,
                "user_name": member.display_name if member else "Unknown",
                "total_paid": round(float(r.total_paid), 2),
                "expense_count": r.expense_count,
            })

        return contributions

    def settlement_history(
        self, db: Session, group_id: str
    ) -> List[Dict[str, Any]]:
        """Get settlement history with details."""
        settlements = (
            db.query(Settlement)
            .filter(Settlement.group_id == group_id)
            .order_by(Settlement.settlement_date.desc())
            .all()
        )

        result = []
        for s in settlements:
            payer_member = (
                db.query(GroupMember)
                .filter(
                    GroupMember.group_id == group_id,
                    GroupMember.user_id == s.payer_id,
                )
                .first()
            )
            payee_member = (
                db.query(GroupMember)
                .filter(
                    GroupMember.group_id == group_id,
                    GroupMember.user_id == s.payee_id,
                )
                .first()
            )
            result.append({
                "id": s.id,
                "payer_name": payer_member.display_name if payer_member else "Unknown",
                "payee_name": payee_member.display_name if payee_member else "Unknown",
                "amount": round(float(s.amount), 2),
                "currency": s.currency,
                "date": s.settlement_date.isoformat(),
                "status": s.status,
                "notes": s.notes,
            })

        return result

    def currency_breakdown(
        self, db: Session, group_id: str
    ) -> List[Dict[str, Any]]:
        """Get expense breakdown by currency."""
        results = (
            db.query(
                Expense.currency,
                func.sum(Expense.amount).label("total"),
                func.count(Expense.id).label("count"),
            )
            .filter(
                Expense.group_id == group_id,
                Expense.status == "active",
            )
            .group_by(Expense.currency)
            .order_by(func.sum(Expense.amount).desc())
            .all()
        )

        return [
            {
                "currency": r.currency,
                "total": round(float(r.total), 2),
                "count": r.count,
            }
            for r in results
        ]


# Singleton
report_engine = ReportEngine()
