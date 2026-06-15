"""
Settlement Optimization Engine
---------------------------------
Generates simplified settlement recommendations that minimize
the number of transfers needed to settle all debts.
Uses a greedy algorithm to match debtors with creditors.
"""

from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.services.balance_engine import balance_engine


class SettlementEngine:
    """Generates optimized settlement recommendations."""

    def recommend_settlements(
        self, db: Session, group_id: str
    ) -> List[Dict[str, Any]]:
        """
        Generate minimum-transfer settlement recommendations.

        Algorithm:
        1. Calculate net balances for all members
        2. Separate into creditors (positive) and debtors (negative)
        3. Greedily match largest debtor with largest creditor
        4. Continue until all balances are settled

        Returns list of recommended transfers.
        """
        balances = balance_engine.calculate_balances(db, group_id)

        if not balances:
            return []

        # Separate creditors and debtors
        creditors = []  # People who are owed money (positive balance)
        debtors = []    # People who owe money (negative balance)

        for b in balances:
            net = b["net_balance"]
            if net > 0.01:  # Small threshold to avoid floating point issues
                creditors.append({
                    "user_id": b["user_id"],
                    "user_name": b["user_name"],
                    "amount": net,
                })
            elif net < -0.01:
                debtors.append({
                    "user_id": b["user_id"],
                    "user_name": b["user_name"],
                    "amount": abs(net),
                })

        # Sort both lists by amount (descending) for greedy matching
        creditors.sort(key=lambda x: x["amount"], reverse=True)
        debtors.sort(key=lambda x: x["amount"], reverse=True)

        recommendations = []

        # Greedy settlement algorithm
        i, j = 0, 0
        while i < len(debtors) and j < len(creditors):
            debtor = debtors[i]
            creditor = creditors[j]

            transfer_amount = min(debtor["amount"], creditor["amount"])

            if transfer_amount > 0.01:
                recommendations.append({
                    "from_user_id": debtor["user_id"],
                    "from_user_name": debtor["user_name"],
                    "to_user_id": creditor["user_id"],
                    "to_user_name": creditor["user_name"],
                    "amount": round(transfer_amount, 2),
                    "currency": "INR",
                    "explanation": self._generate_explanation(
                        debtor["user_name"],
                        creditor["user_name"],
                        transfer_amount,
                    ),
                })

            debtor["amount"] -= transfer_amount
            creditor["amount"] -= transfer_amount

            if debtor["amount"] < 0.01:
                i += 1
            if creditor["amount"] < 0.01:
                j += 1

        return recommendations

    def _generate_explanation(
        self, from_name: str, to_name: str, amount: float
    ) -> str:
        """Generate human-readable explanation for a settlement recommendation."""
        return (
            f"{from_name} should pay ₹{amount:,.2f} to {to_name} "
            f"to settle their outstanding balance."
        )

    def get_settlement_summary(
        self, db: Session, group_id: str
    ) -> Dict[str, Any]:
        """Get a summary of the settlement state for a group."""
        balances = balance_engine.calculate_balances(db, group_id)
        recommendations = self.recommend_settlements(db, group_id)

        total_owed = sum(abs(b["net_balance"]) for b in balances if b["net_balance"] < 0)
        total_transfers = len(recommendations)
        max_naive_transfers = sum(
            1 for b in balances if abs(b["net_balance"]) > 0.01
        )

        return {
            "total_outstanding": round(total_owed, 2),
            "recommended_transfers": total_transfers,
            "naive_transfers": max(0, max_naive_transfers - 1),
            "transfers_saved": max(0, max_naive_transfers - 1 - total_transfers),
            "recommendations": recommendations,
        }


# Singleton
settlement_engine = SettlementEngine()
