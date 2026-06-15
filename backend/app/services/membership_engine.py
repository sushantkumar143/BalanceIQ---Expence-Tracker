"""
Membership Timeline Engine
---------------------------
Analyzes CSV activity data to suggest membership join/leave dates.
Never auto-applies dates — always returns suggestions for user review.
"""

from typing import List, Dict, Any, Optional
from datetime import date, timedelta


class MembershipEngine:
    """Analyzes user activity to suggest membership timeline boundaries."""

    def suggest_membership_dates(
        self,
        user_activities: List[Dict[str, Any]],
        existing_members: Optional[List[Dict]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Generate membership suggestions based on activity analysis.

        Args:
            user_activities: List of dicts with name, first_appearance, last_appearance, total_activities
            existing_members: List of existing group members for matching

        Returns:
            List of membership suggestions with reasoning
        """
        existing_map = {}
        if existing_members:
            for m in existing_members:
                name_key = (m.get("display_name") or m.get("name", "")).lower()
                existing_map[name_key] = m

        suggestions = []

        for activity in user_activities:
            name = activity["name"]
            name_key = name.lower()
            first = activity.get("first_appearance")
            last = activity.get("last_appearance")
            total = activity.get("total_activities", 0)

            suggestion = {
                "name": name,
                "first_appearance": first.isoformat() if first else None,
                "last_appearance": last.isoformat() if last else None,
                "total_activities": total,
                "is_new_user": True,
                "matched_user_id": None,
            }

            # Check if this maps to an existing member
            if name_key in existing_map:
                existing = existing_map[name_key]
                suggestion["is_new_user"] = False
                suggestion["matched_user_id"] = existing.get("user_id")
                suggestion["current_join_date"] = existing.get("join_date")
                suggestion["current_leave_date"] = existing.get("leave_date")

            # Calculate suggested dates
            if first:
                suggestion["suggested_join_date"] = self._suggest_join_date(first)
                suggestion["join_reasoning"] = self._explain_join_suggestion(
                    first, suggestion["suggested_join_date"]
                )
            else:
                suggestion["suggested_join_date"] = None
                suggestion["join_reasoning"] = "No activity dates found."

            if last:
                all_last_dates = [
                    a["last_appearance"]
                    for a in user_activities
                    if a.get("last_appearance")
                ]
                max_date = max(all_last_dates) if all_last_dates else last

                # Only suggest leave date if their last appearance is significantly
                # before the latest activity in the dataset
                if last < max_date - timedelta(days=14):
                    suggestion["suggested_leave_date"] = self._suggest_leave_date(last)
                    suggestion["leave_reasoning"] = self._explain_leave_suggestion(
                        last, suggestion["suggested_leave_date"], max_date
                    )
                else:
                    suggestion["suggested_leave_date"] = None
                    suggestion["leave_reasoning"] = (
                        "Active until the end of the dataset — no leave date suggested."
                    )
            else:
                suggestion["suggested_leave_date"] = None
                suggestion["leave_reasoning"] = "No activity dates found."

            suggestions.append(suggestion)

        return suggestions

    def _suggest_join_date(self, first_appearance: date) -> date:
        """
        Suggest a join date based on first appearance.

        Logic:
        - If within first 5 days of month, round to 1st of that month
        - Otherwise, use day before first appearance
        """
        if first_appearance.day <= 5:
            return first_appearance.replace(day=1)
        else:
            return first_appearance - timedelta(days=1)

    def _suggest_leave_date(self, last_appearance: date) -> date:
        """
        Suggest a leave date based on last appearance.

        Logic:
        - If within last 5 days of month, round to end of month
        - Otherwise, use 3 days after last appearance
        """
        # Check if near end of month
        next_month = last_appearance.replace(day=28) + timedelta(days=4)
        last_day_of_month = next_month - timedelta(days=next_month.day)

        if (last_day_of_month - last_appearance).days <= 5:
            return last_day_of_month
        else:
            return last_appearance + timedelta(days=3)

    def _explain_join_suggestion(self, first: date, suggested: date) -> str:
        """Generate human-readable explanation for join date suggestion."""
        if suggested.day == 1 and first.day <= 5:
            return (
                f"First activity on {first.strftime('%b %d')}. "
                f"Rounded to start of month ({suggested.strftime('%b %d')}) "
                f"since activity began within the first 5 days."
            )
        else:
            return (
                f"First activity on {first.strftime('%b %d')}. "
                f"Suggested join date is {suggested.strftime('%b %d')} "
                f"(one day before first activity)."
            )

    def _explain_leave_suggestion(
        self, last: date, suggested: date, dataset_end: date
    ) -> str:
        """Generate human-readable explanation for leave date suggestion."""
        gap_days = (dataset_end - last).days
        return (
            f"Last activity on {last.strftime('%b %d')}, which is {gap_days} days "
            f"before the latest activity in the dataset ({dataset_end.strftime('%b %d')}). "
            f"Suggested leave date: {suggested.strftime('%b %d')}."
        )


# Singleton
membership_engine = MembershipEngine()
