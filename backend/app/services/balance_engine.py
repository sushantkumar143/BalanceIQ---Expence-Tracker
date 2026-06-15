"""
Balance Calculation Engine
----------------------------
Ledger-based balance computation. Never stores balances directly —
all balances are derived from expenses, settlements, and membership history.
Every balance is fully traceable and explainable.
"""

from typing import List, Dict, Any, Optional
from datetime import date
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import Expense, ExpenseParticipant, Settlement, GroupMember


class BalanceEngine:
    """Calculates and explains balances from the ledger."""

    def calculate_balances(
        self, db: Session, group_id: str
    ) -> List[Dict[str, Any]]:
        """
        Calculate net balances for all members in a group.

        Returns list of balance entries sorted by net_balance.
        """
        # Get all active group members
        members = (
            db.query(GroupMember)
            .filter(GroupMember.group_id == group_id)
            .all()
        )

        if not members:
            return []

        balances = []

        for member in members:
            user_id = member.user_id
            balance = self._calculate_member_balance(db, group_id, user_id, member)
            balance["user_name"] = member.display_name or ""
            balance["user_id"] = user_id
            balance["join_date"] = member.join_date.isoformat() if member.join_date else None
            balance["leave_date"] = member.leave_date.isoformat() if member.leave_date else None
            balances.append(balance)

        # Sort: positive (owed money) first, then negative (owes money)
        balances.sort(key=lambda b: b["net_balance"], reverse=True)

        return balances

    def _calculate_member_balance(
        self,
        db: Session,
        group_id: str,
        user_id: str,
        member: GroupMember,
    ) -> Dict[str, Any]:
        """Calculate balance for a single member respecting membership timeline."""

        # 1. Total amount this member PAID for expenses
        total_paid_query = (
            db.query(func.coalesce(func.sum(Expense.amount), 0))
            .filter(
                Expense.group_id == group_id,
                Expense.payer_id == user_id,
                Expense.status == "active",
            )
        )
        # Filter by membership period
        if member.join_date:
            total_paid_query = total_paid_query.filter(
                Expense.expense_date >= member.join_date
            )
        if member.leave_date:
            total_paid_query = total_paid_query.filter(
                Expense.expense_date <= member.leave_date
            )
        total_paid = float(total_paid_query.scalar() or 0)

        # 2. Total amount this member OWES (their share of expenses)
        total_owed_query = (
            db.query(func.coalesce(func.sum(ExpenseParticipant.share_amount), 0))
            .join(Expense, ExpenseParticipant.expense_id == Expense.id)
            .filter(
                Expense.group_id == group_id,
                ExpenseParticipant.user_id == user_id,
                Expense.status == "active",
            )
        )
        if member.join_date:
            total_owed_query = total_owed_query.filter(
                Expense.expense_date >= member.join_date
            )
        if member.leave_date:
            total_owed_query = total_owed_query.filter(
                Expense.expense_date <= member.leave_date
            )
        total_owed = float(total_owed_query.scalar() or 0)

        # 3. Settlements this member has PAID
        settlements_paid = float(
            db.query(func.coalesce(func.sum(Settlement.amount), 0))
            .filter(
                Settlement.group_id == group_id,
                Settlement.payer_id == user_id,
                Settlement.status == "confirmed",
            )
            .scalar()
            or 0
        )

        # 4. Settlements this member has RECEIVED
        settlements_received = float(
            db.query(func.coalesce(func.sum(Settlement.amount), 0))
            .filter(
                Settlement.group_id == group_id,
                Settlement.payee_id == user_id,
                Settlement.status == "confirmed",
            )
            .scalar()
            or 0
        )

        # Net balance = what they paid - what they owe + settlements received - settlements paid
        # Positive = others owe them money
        # Negative = they owe money to others
        net_balance = total_paid - total_owed - settlements_paid + settlements_received

        return {
            "net_balance": round(net_balance, 2),
            "total_paid": round(total_paid, 2),
            "total_owed": round(total_owed, 2),
            "settlements_paid": round(settlements_paid, 2),
            "settlements_received": round(settlements_received, 2),
            "currency": "INR",  # TODO: multi-currency
        }

    def explain_balance(
        self, db: Session, group_id: str, user_id: str
    ) -> Dict[str, Any]:
        """
        Generate a fully itemized explanation of a member's balance.
        This is the 'Why?' feature — every number is traceable.
        """
        member = (
            db.query(GroupMember)
            .filter(
                GroupMember.group_id == group_id,
                GroupMember.user_id == user_id,
            )
            .first()
        )

        if not member:
            return {"error": "Member not found in group"}

        items = []
        running_total = 0.0

        # Get expenses this user PAID
        paid_expenses_query = (
            db.query(Expense)
            .filter(
                Expense.group_id == group_id,
                Expense.payer_id == user_id,
                Expense.status == "active",
            )
            .order_by(Expense.expense_date)
        )
        if member.join_date:
            paid_expenses_query = paid_expenses_query.filter(
                Expense.expense_date >= member.join_date
            )
        if member.leave_date:
            paid_expenses_query = paid_expenses_query.filter(
                Expense.expense_date <= member.leave_date
            )

        for expense in paid_expenses_query.all():
            # They paid the full amount
            amount = float(expense.amount)

            # But they also owe their own share
            own_share = (
                db.query(ExpenseParticipant)
                .filter(
                    ExpenseParticipant.expense_id == expense.id,
                    ExpenseParticipant.user_id == user_id,
                )
                .first()
            )
            own_share_amount = float(own_share.share_amount) if own_share else 0

            # Net effect of paying: amount - own_share (they effectively paid for others)
            net_effect = amount - own_share_amount
            running_total += net_effect

            items.append({
                "expense_id": expense.id,
                "description": f"Paid: {expense.description}",
                "date": expense.expense_date.isoformat(),
                "type": "expense_paid",
                "paid_amount": round(amount, 2),
                "own_share": round(own_share_amount, 2),
                "net_effect": round(net_effect, 2),
                "running_total": round(running_total, 2),
            })

        # Get expenses where this user OWES (but didn't pay)
        owed_expenses = (
            db.query(ExpenseParticipant, Expense)
            .join(Expense, ExpenseParticipant.expense_id == Expense.id)
            .filter(
                Expense.group_id == group_id,
                ExpenseParticipant.user_id == user_id,
                Expense.payer_id != user_id,
                Expense.status == "active",
            )
            .order_by(Expense.expense_date)
        )
        if member.join_date:
            owed_expenses = owed_expenses.filter(
                Expense.expense_date >= member.join_date
            )
        if member.leave_date:
            owed_expenses = owed_expenses.filter(
                Expense.expense_date <= member.leave_date
            )

        for participant, expense in owed_expenses.all():
            share_amount = float(participant.share_amount)
            running_total -= share_amount

            items.append({
                "expense_id": expense.id,
                "description": f"Owes: {expense.description} (paid by others)",
                "date": expense.expense_date.isoformat(),
                "type": "expense_owed",
                "amount": round(share_amount, 2),
                "net_effect": round(-share_amount, 2),
                "running_total": round(running_total, 2),
            })

        # Settlements paid by this user
        settlements_out = (
            db.query(Settlement)
            .filter(
                Settlement.group_id == group_id,
                Settlement.payer_id == user_id,
                Settlement.status == "confirmed",
            )
            .order_by(Settlement.settlement_date)
            .all()
        )

        for s in settlements_out:
            amount = float(s.amount)
            running_total -= amount
            items.append({
                "settlement_id": s.id,
                "description": f"Settlement paid to {s.payee_id}",
                "date": s.settlement_date.isoformat(),
                "type": "settlement_paid",
                "amount": round(amount, 2),
                "net_effect": round(-amount, 2),
                "running_total": round(running_total, 2),
            })

        # Settlements received by this user
        settlements_in = (
            db.query(Settlement)
            .filter(
                Settlement.group_id == group_id,
                Settlement.payee_id == user_id,
                Settlement.status == "confirmed",
            )
            .order_by(Settlement.settlement_date)
            .all()
        )

        for s in settlements_in:
            amount = float(s.amount)
            running_total += amount
            items.append({
                "settlement_id": s.id,
                "description": f"Settlement received from {s.payer_id}",
                "date": s.settlement_date.isoformat(),
                "type": "settlement_received",
                "amount": round(amount, 2),
                "net_effect": round(amount, 2),
                "running_total": round(running_total, 2),
            })

        # Sort all items by date
        items.sort(key=lambda x: x["date"])

        # Recalculate running totals after sorting
        running = 0.0
        for item in items:
            running += item["net_effect"]
            item["running_total"] = round(running, 2)

        # Summary
        balance = self._calculate_member_balance(db, group_id, user_id, member)

        return {
            "user_id": user_id,
            "user_name": member.display_name or "",
            "net_balance": balance["net_balance"],
            "currency": balance["currency"],
            "items": items,
            "summary": {
                "total_paid": balance["total_paid"],
                "total_owed": balance["total_owed"],
                "settlements_paid": balance["settlements_paid"],
                "settlements_received": balance["settlements_received"],
            },
        }


# Singleton
balance_engine = BalanceEngine()
