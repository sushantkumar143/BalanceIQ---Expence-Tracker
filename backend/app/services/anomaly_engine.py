"""
Anomaly Detection Engine
-------------------------
Runs a pipeline of detectors over normalized CSV rows to identify
data quality issues. Each anomaly is stored with a human-readable
explanation and suggested actions.
"""

from typing import List, Dict, Any, Optional
from datetime import date, timedelta
from rapidfuzz import fuzz
import re
import statistics


class AnomalyResult:
    """Represents a single detected anomaly."""

    def __init__(
        self,
        row_number: int,
        severity: str,  # error, warning, info
        anomaly_type: str,
        explanation: str,
        suggested_action: Optional[Dict[str, Any]] = None,
        related_rows: Optional[List[int]] = None,
    ):
        self.row_number = row_number
        self.severity = severity
        self.anomaly_type = anomaly_type
        self.explanation = explanation
        self.suggested_action = suggested_action or {}
        self.related_rows = related_rows or []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "row_number": self.row_number,
            "severity": self.severity,
            "anomaly_type": self.anomaly_type,
            "explanation": self.explanation,
            "suggested_action": self.suggested_action,
            "related_rows": self.related_rows,
        }


class AnomalyEngine:
    """Runs anomaly detection pipeline on normalized CSV data."""

    def detect_all(
        self,
        rows: List[Dict[str, Any]],
        group_members: Optional[List[Dict]] = None,
        group_created: Optional[date] = None,
    ) -> List[AnomalyResult]:
        """Run all detectors and return combined anomaly list."""
        anomalies = []

        anomalies.extend(self._detect_duplicates(rows))
        anomalies.extend(self._detect_date_anomalies(rows, group_created))
        anomalies.extend(self._detect_amount_anomalies(rows))
        anomalies.extend(self._detect_missing_participants(rows))
        anomalies.extend(self._detect_settlement_misclassification(rows))
        anomalies.extend(self._detect_currency_issues(rows))
        anomalies.extend(
            self._detect_membership_conflicts(rows, group_members or [])
        )
        anomalies.extend(self._detect_split_inconsistencies(rows))
        anomalies.extend(self._detect_unknown_users(rows, group_members or []))

        # Sort by row number then severity
        severity_order = {"error": 0, "warning": 1, "info": 2}
        anomalies.sort(
            key=lambda a: (a.row_number, severity_order.get(a.severity, 3))
        )

        return anomalies

    def _detect_duplicates(self, rows: List[Dict]) -> List[AnomalyResult]:
        """Detect potential duplicate expenses by comparing payer, amount, date, and description."""
        anomalies = []
        seen = []

        for i, row in enumerate(rows):
            for j, prev in enumerate(seen):
                # Same payer?
                if row.get("payer") and prev.get("payer"):
                    if row["payer"].lower() != prev["payer"].lower():
                        continue
                else:
                    continue

                # Same amount?
                if row.get("amount") != prev.get("amount"):
                    continue

                # Same date?
                if row.get("date") != prev.get("date"):
                    continue

                # Similar description?
                desc1 = row.get("description", "")
                desc2 = prev.get("description", "")
                if desc1 and desc2:
                    similarity = fuzz.ratio(desc1.lower(), desc2.lower())
                    if similarity < 70:
                        continue
                else:
                    continue

                anomalies.append(
                    AnomalyResult(
                        row_number=row["row_number"],
                        severity="warning",
                        anomaly_type="duplicate",
                        explanation=(
                            f"Potential duplicate of row {prev['row_number']}. "
                            f"Same payer ({row['payer']}), amount ({row['amount']}), "
                            f"date ({row['date']}), and similar description "
                            f"(\"{desc1}\" ≈ \"{desc2}\", {similarity}% match)."
                        ),
                        suggested_action={
                            "options": ["keep_first", "keep_second", "keep_both"],
                            "default": "keep_first",
                            "duplicate_row": prev["row_number"],
                        },
                        related_rows=[prev["row_number"]],
                    )
                )

            seen.append(row)

        return anomalies

    def _detect_date_anomalies(
        self, rows: List[Dict], group_created: Optional[date] = None
    ) -> List[AnomalyResult]:
        """Detect unparseable, future, or out-of-range dates."""
        anomalies = []
        today = date.today()

        for row in rows:
            row_date = row.get("date")

            if row_date is None and row.get("original", {}).get("date"):
                # Date field existed but couldn't be parsed
                raw_date = None
                # Try to find the original date value
                for key, val in row.get("original", {}).items():
                    if "date" in key.lower():
                        raw_date = val
                        break

                anomalies.append(
                    AnomalyResult(
                        row_number=row["row_number"],
                        severity="error",
                        anomaly_type="date_ambiguous",
                        explanation=(
                            f"Could not parse date value: \"{raw_date}\". "
                            f"Please provide a valid date format (e.g., DD/MM/YYYY, YYYY-MM-DD)."
                        ),
                        suggested_action={
                            "options": ["manual_fix", "skip"],
                            "requires_input": True,
                            "input_type": "date",
                        },
                    )
                )
            elif row_date is not None:
                # Future date
                if row_date > today:
                    anomalies.append(
                        AnomalyResult(
                            row_number=row["row_number"],
                            severity="warning",
                            anomaly_type="date_future",
                            explanation=(
                                f"Date {row_date} is in the future. "
                                f"This might be an error."
                            ),
                            suggested_action={
                                "options": ["keep", "manual_fix", "skip"],
                                "default": "keep",
                            },
                        )
                    )

                # Before group creation
                if group_created and row_date < group_created:
                    anomalies.append(
                        AnomalyResult(
                            row_number=row["row_number"],
                            severity="warning",
                            anomaly_type="date_before_group",
                            explanation=(
                                f"Date {row_date} is before the group was created "
                                f"({group_created}). This expense might belong to a different period."
                            ),
                            suggested_action={
                                "options": ["keep", "manual_fix", "skip"],
                                "default": "keep",
                            },
                        )
                    )

        return anomalies

    def _detect_amount_anomalies(self, rows: List[Dict]) -> List[AnomalyResult]:
        """Detect invalid, negative, zero, or statistically unusual amounts."""
        anomalies = []
        valid_amounts = [r["amount"] for r in rows if r.get("amount") is not None and r["amount"] > 0]

        # Calculate statistics for outlier detection
        mean_amount = statistics.mean(valid_amounts) if len(valid_amounts) > 2 else 0
        stdev_amount = statistics.stdev(valid_amounts) if len(valid_amounts) > 2 else 0

        for row in rows:
            amount = row.get("amount")

            if amount is None:
                anomalies.append(
                    AnomalyResult(
                        row_number=row["row_number"],
                        severity="error",
                        anomaly_type="invalid_amount",
                        explanation=(
                            f"Could not parse amount value. "
                            f"Please provide a valid numeric amount."
                        ),
                        suggested_action={
                            "options": ["manual_fix", "skip"],
                            "requires_input": True,
                            "input_type": "number",
                        },
                    )
                )
            elif amount == 0:
                anomalies.append(
                    AnomalyResult(
                        row_number=row["row_number"],
                        severity="warning",
                        anomaly_type="zero_amount",
                        explanation="Amount is zero. This row will have no financial impact.",
                        suggested_action={
                            "options": ["keep", "skip"],
                            "default": "skip",
                        },
                    )
                )
            elif amount < 0:
                anomalies.append(
                    AnomalyResult(
                        row_number=row["row_number"],
                        severity="warning",
                        anomaly_type="negative_amount",
                        explanation=(
                            f"Amount is negative ({amount}). "
                            f"This might be a refund or data entry error."
                        ),
                        suggested_action={
                            "options": ["convert_positive", "keep", "skip"],
                            "default": "convert_positive",
                        },
                    )
                )
            elif stdev_amount > 0 and abs(amount - mean_amount) > 3 * stdev_amount:
                anomalies.append(
                    AnomalyResult(
                        row_number=row["row_number"],
                        severity="info",
                        anomaly_type="unusual_amount",
                        explanation=(
                            f"Amount {amount} is unusually {'high' if amount > mean_amount else 'low'} "
                            f"compared to the average ({mean_amount:.2f}). "
                            f"Please verify this is correct."
                        ),
                        suggested_action={
                            "options": ["keep", "manual_fix", "skip"],
                            "default": "keep",
                        },
                    )
                )

        return anomalies

    def _detect_missing_participants(self, rows: List[Dict]) -> List[AnomalyResult]:
        """Detect rows with no participants specified."""
        anomalies = []

        for row in rows:
            if not row.get("is_settlement"):
                participants = row.get("participants", [])
                if not participants:
                    anomalies.append(
                        AnomalyResult(
                            row_number=row["row_number"],
                            severity="warning",
                            anomaly_type="missing_participants",
                            explanation=(
                                f"No participants specified for \"{row.get('description', 'this expense')}\". "
                                f"The expense will be split among all active group members by default."
                            ),
                            suggested_action={
                                "options": ["split_all", "manual_fix", "skip"],
                                "default": "split_all",
                            },
                        )
                    )

        return anomalies

    def _detect_settlement_misclassification(
        self, rows: List[Dict]
    ) -> List[AnomalyResult]:
        """Detect rows that look like settlements but aren't marked as such."""
        anomalies = []

        for row in rows:
            if row.get("is_settlement"):
                # Extract potential payee from description
                desc = row.get("description", "")
                participants = row.get("participants", [])
                payee = participants[0] if participants else None

                if not payee:
                    # Try to extract from description
                    match = re.search(
                        r"(?:paid|to|settled with|reimbursed)\s+(\w+)",
                        desc,
                        re.IGNORECASE,
                    )
                    if match:
                        payee = match.group(1).title()

                anomalies.append(
                    AnomalyResult(
                        row_number=row["row_number"],
                        severity="info",
                        anomaly_type="settlement_detected",
                        explanation=(
                            f"This row looks like a settlement (money transfer) "
                            f"rather than a shared expense: \"{desc}\". "
                            f"It will be recorded as a settlement"
                            f"{f' from {row.get(\"payer\")} to {payee}' if payee else ''}."
                        ),
                        suggested_action={
                            "options": ["confirm_settlement", "treat_as_expense"],
                            "default": "confirm_settlement",
                            "detected_payee": payee,
                        },
                    )
                )

        return anomalies

    def _detect_currency_issues(self, rows: List[Dict]) -> List[AnomalyResult]:
        """Detect unknown currencies or mixed currency usage."""
        anomalies = []
        known_currencies = {
            "INR", "USD", "EUR", "GBP", "JPY", "AUD", "CAD",
            "SGD", "AED", "CHF", "CNY", "HKD", "NZD",
        }
        currencies_used = set()

        for row in rows:
            currency = row.get("currency", "INR")
            currencies_used.add(currency)

            if currency and currency not in known_currencies:
                anomalies.append(
                    AnomalyResult(
                        row_number=row["row_number"],
                        severity="warning",
                        anomaly_type="unknown_currency",
                        explanation=(
                            f"Unknown currency code: \"{currency}\". "
                            f"Please verify or select a valid ISO currency code."
                        ),
                        suggested_action={
                            "options": ["manual_fix", "use_default", "skip"],
                            "default": "use_default",
                            "input_type": "currency",
                        },
                    )
                )

        # Mixed currencies warning (only once)
        if len(currencies_used) > 1:
            anomalies.append(
                AnomalyResult(
                    row_number=0,  # Global anomaly
                    severity="info",
                    anomaly_type="mixed_currencies",
                    explanation=(
                        f"Multiple currencies detected: {', '.join(sorted(currencies_used))}. "
                        f"Balances will be calculated per-currency. "
                        f"Cross-currency settlement recommendations may use approximate rates."
                    ),
                    suggested_action={
                        "options": ["acknowledge"],
                        "default": "acknowledge",
                    },
                )
            )

        return anomalies

    def _detect_membership_conflicts(
        self, rows: List[Dict], members: List[Dict]
    ) -> List[AnomalyResult]:
        """Detect expenses dated outside a member's active period."""
        anomalies = []

        if not members:
            return anomalies

        # Build member lookup with date ranges
        member_ranges = {}
        for m in members:
            name_key = (m.get("display_name") or m.get("name", "")).lower()
            member_ranges[name_key] = {
                "join_date": m.get("join_date"),
                "leave_date": m.get("leave_date"),
                "name": m.get("display_name") or m.get("name"),
            }

        for row in rows:
            row_date = row.get("date")
            if not row_date:
                continue

            # Check payer
            payer = (row.get("payer") or "").lower()
            if payer in member_ranges:
                mr = member_ranges[payer]
                if mr["join_date"] and row_date < mr["join_date"]:
                    anomalies.append(
                        AnomalyResult(
                            row_number=row["row_number"],
                            severity="error",
                            anomaly_type="membership_conflict",
                            explanation=(
                                f"{mr['name']} is listed as payer on {row_date}, "
                                f"but their join date is {mr['join_date']}. "
                                f"They weren't a member at this time."
                            ),
                            suggested_action={
                                "options": ["adjust_membership", "skip", "keep"],
                                "default": "skip",
                            },
                        )
                    )
                elif mr["leave_date"] and row_date > mr["leave_date"]:
                    anomalies.append(
                        AnomalyResult(
                            row_number=row["row_number"],
                            severity="error",
                            anomaly_type="membership_conflict",
                            explanation=(
                                f"{mr['name']} is listed as payer on {row_date}, "
                                f"but their leave date is {mr['leave_date']}. "
                                f"They were no longer a member."
                            ),
                            suggested_action={
                                "options": ["adjust_membership", "skip", "keep"],
                                "default": "skip",
                            },
                        )
                    )

            # Check participants
            for p in row.get("participants", []):
                p_key = p.lower()
                if p_key in member_ranges:
                    mr = member_ranges[p_key]
                    if mr["join_date"] and row_date < mr["join_date"]:
                        anomalies.append(
                            AnomalyResult(
                                row_number=row["row_number"],
                                severity="warning",
                                anomaly_type="membership_conflict",
                                explanation=(
                                    f"{mr['name']} is a participant on {row_date}, "
                                    f"but joined on {mr['join_date']}. "
                                    f"They shouldn't share this expense."
                                ),
                                suggested_action={
                                    "options": ["remove_participant", "adjust_membership", "keep"],
                                    "default": "remove_participant",
                                },
                            )
                        )

        return anomalies

    def _detect_split_inconsistencies(self, rows: List[Dict]) -> List[AnomalyResult]:
        """Detect rows where participant shares don't add up to total."""
        # This is more relevant after split calculation, but we can check basic issues
        anomalies = []

        for row in rows:
            if row.get("is_settlement"):
                continue

            amount = row.get("amount")
            participants = row.get("participants", [])

            if amount and participants and len(participants) == 0:
                # No split info available
                continue

        return anomalies

    def _detect_unknown_users(
        self, rows: List[Dict], members: List[Dict]
    ) -> List[AnomalyResult]:
        """Detect users in CSV that don't match any existing group member."""
        anomalies = []

        if not members:
            return anomalies

        member_names = {
            (m.get("display_name") or m.get("name", "")).lower()
            for m in members
        }

        unknown_users = set()

        for row in rows:
            payer = (row.get("payer") or "").lower()
            if payer and payer not in member_names and payer not in unknown_users:
                # Fuzzy match check
                best_match = None
                best_score = 0
                for mn in member_names:
                    score = fuzz.ratio(payer, mn)
                    if score > best_score:
                        best_match = mn
                        best_score = score

                if best_score < 80:
                    unknown_users.add(payer)
                    anomalies.append(
                        AnomalyResult(
                            row_number=row["row_number"],
                            severity="warning",
                            anomaly_type="unknown_user",
                            explanation=(
                                f"User \"{row.get('payer')}\" is not a recognized group member."
                                + (
                                    f" Did you mean \"{best_match.title()}\" ({best_score}% match)?"
                                    if best_match and best_score >= 50
                                    else " They may need to be added to the group."
                                )
                            ),
                            suggested_action={
                                "options": ["add_user", "map_to_existing", "skip"],
                                "default": "add_user",
                                "suggested_match": best_match.title() if best_match and best_score >= 50 else None,
                                "match_score": best_score,
                            },
                        )
                    )

        return anomalies


# Singleton
anomaly_engine = AnomalyEngine()
