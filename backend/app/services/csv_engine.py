"""
CSV Import Engine
-----------------
Handles parsing, normalization, classification, and column mapping of CSV files.
This is the entry point for all CSV data ingestion.
"""

import pandas as pd
import re
import io
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, date
from rapidfuzz import fuzz
from dateutil import parser as date_parser


# Common column name patterns for auto-detection
COLUMN_PATTERNS = {
    "date": [
        "date", "expense_date", "transaction_date", "when", "day",
        "expense date", "trans date", "transaction date"
    ],
    "description": [
        "description", "desc", "item", "what", "expense", "detail",
        "details", "name", "purpose", "memo", "note"
    ],
    "amount": [
        "amount", "cost", "price", "total", "value", "sum",
        "expense_amount", "expense amount"
    ],
    "payer": [
        "payer", "paid_by", "paid by", "who paid", "spender",
        "from", "paid", "member", "person"
    ],
    "participants": [
        "participants", "split_with", "split with", "shared with",
        "shared_with", "for whom", "split among", "members", "beneficiaries"
    ],
    "currency": [
        "currency", "curr", "ccy", "money_type"
    ],
    "category": [
        "category", "cat", "type", "group", "tag"
    ],
    "notes": [
        "notes", "comment", "comments", "remarks", "memo"
    ],
}

# Patterns that indicate a row is a settlement, not an expense
SETTLEMENT_KEYWORDS = [
    "paid", "settled", "settlement", "reimbursed", "repaid",
    "transferred", "sent", "gave", "returned", "paid back",
    "payback", "pay back"
]


class CSVEngine:
    """Parses, normalizes, and classifies CSV expense data."""

    def parse_csv(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """
        Parse CSV file and return structured data.

        Returns:
            dict with keys: columns, rows, preview, total_rows, suggested_mapping
        """
        # Try different encodings
        content_str = None
        for encoding in ["utf-8", "utf-8-sig", "latin-1", "cp1252"]:
            try:
                content_str = file_content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue

        if content_str is None:
            raise ValueError("Unable to decode CSV file. Please use UTF-8 encoding.")

        # Parse with pandas
        try:
            df = pd.read_csv(io.StringIO(content_str), dtype=str, keep_default_na=False)
        except Exception as e:
            raise ValueError(f"Failed to parse CSV: {str(e)}")

        if df.empty:
            raise ValueError("CSV file is empty.")

        if len(df.columns) < 2:
            raise ValueError("CSV must have at least 2 columns.")

        # Clean column names
        df.columns = [col.strip() for col in df.columns]

        # Build preview (first 10 rows)
        preview = df.head(10).to_dict(orient="records")

        # Auto-detect column mapping
        suggested_mapping = self._detect_column_mapping(df.columns.tolist())

        return {
            "columns": df.columns.tolist(),
            "rows": df.to_dict(orient="records"),
            "preview": preview,
            "total_rows": len(df),
            "suggested_mapping": suggested_mapping,
        }

    def _detect_column_mapping(self, columns: List[str]) -> Dict[str, Optional[str]]:
        """Auto-detect which CSV columns map to which fields using fuzzy matching."""
        mapping = {}
        used_columns = set()

        for field, patterns in COLUMN_PATTERNS.items():
            best_match = None
            best_score = 0

            for col in columns:
                if col in used_columns:
                    continue

                col_lower = col.lower().strip()

                # Exact match
                if col_lower in patterns:
                    best_match = col
                    best_score = 100
                    break

                # Fuzzy match
                for pattern in patterns:
                    score = fuzz.ratio(col_lower, pattern)
                    if score > best_score and score >= 70:
                        best_match = col
                        best_score = score

            if best_match:
                mapping[field] = best_match
                used_columns.add(best_match)
            else:
                mapping[field] = None

        return mapping

    def normalize_rows(
        self, rows: List[Dict[str, Any]], column_mapping: Dict[str, Optional[str]]
    ) -> List[Dict[str, Any]]:
        """
        Normalize all rows using the confirmed column mapping.

        Returns list of normalized row dicts with standard keys.
        """
        normalized = []

        for idx, row in enumerate(rows):
            norm_row = {
                "row_number": idx + 2,  # 1-indexed, +1 for header
                "original": row,
            }

            # Extract and normalize each field
            norm_row["date"] = self._normalize_date(
                self._get_field(row, column_mapping.get("date"))
            )
            norm_row["description"] = self._normalize_text(
                self._get_field(row, column_mapping.get("description"))
            )
            norm_row["amount"] = self._normalize_amount(
                self._get_field(row, column_mapping.get("amount"))
            )
            norm_row["payer"] = self._normalize_name(
                self._get_field(row, column_mapping.get("payer"))
            )
            norm_row["participants"] = self._normalize_participants(
                self._get_field(row, column_mapping.get("participants"))
            )
            norm_row["currency"] = self._normalize_currency(
                self._get_field(row, column_mapping.get("currency"))
            )
            norm_row["category"] = self._normalize_text(
                self._get_field(row, column_mapping.get("category"))
            )
            norm_row["notes"] = self._get_field(row, column_mapping.get("notes"))

            # Classify: expense or settlement
            norm_row["is_settlement"] = self._is_settlement(
                norm_row["description"], norm_row["payer"], norm_row["participants"]
            )

            normalized.append(norm_row)

        return normalized

    def extract_unique_users(
        self, normalized_rows: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Extract all unique user names from normalized data with activity dates."""
        user_activity: Dict[str, Dict] = {}

        for row in normalized_rows:
            row_date = row.get("date")

            # Track payer
            payer = row.get("payer")
            if payer:
                payer_key = payer.lower().strip()
                if payer_key not in user_activity:
                    user_activity[payer_key] = {
                        "name": payer,
                        "first_appearance": row_date,
                        "last_appearance": row_date,
                        "activities": 0,
                    }
                user_activity[payer_key]["activities"] += 1
                if row_date:
                    if (
                        user_activity[payer_key]["first_appearance"] is None
                        or row_date < user_activity[payer_key]["first_appearance"]
                    ):
                        user_activity[payer_key]["first_appearance"] = row_date
                    if (
                        user_activity[payer_key]["last_appearance"] is None
                        or row_date > user_activity[payer_key]["last_appearance"]
                    ):
                        user_activity[payer_key]["last_appearance"] = row_date

            # Track participants
            participants = row.get("participants", [])
            for p in participants:
                p_key = p.lower().strip()
                if p_key not in user_activity:
                    user_activity[p_key] = {
                        "name": p,
                        "first_appearance": row_date,
                        "last_appearance": row_date,
                        "activities": 0,
                    }
                user_activity[p_key]["activities"] += 1
                if row_date:
                    if (
                        user_activity[p_key]["first_appearance"] is None
                        or row_date < user_activity[p_key]["first_appearance"]
                    ):
                        user_activity[p_key]["first_appearance"] = row_date
                    if (
                        user_activity[p_key]["last_appearance"] is None
                        or row_date > user_activity[p_key]["last_appearance"]
                    ):
                        user_activity[p_key]["last_appearance"] = row_date

        return [
            {
                "name": data["name"],
                "first_appearance": data["first_appearance"],
                "last_appearance": data["last_appearance"],
                "total_activities": data["activities"],
            }
            for data in user_activity.values()
        ]

    # ---- Private normalization helpers ----

    def _get_field(self, row: Dict, col_name: Optional[str]) -> Optional[str]:
        if col_name is None:
            return None
        val = row.get(col_name, "")
        return str(val).strip() if val else None

    def _normalize_date(self, value: Optional[str]) -> Optional[date]:
        if not value:
            return None
        try:
            # Try common date formats
            parsed = date_parser.parse(value, dayfirst=True, fuzzy=True)
            return parsed.date()
        except (ValueError, TypeError):
            return None  # Will be flagged as anomaly

    def _normalize_amount(self, value: Optional[str]) -> Optional[float]:
        if not value:
            return None
        try:
            # Remove currency symbols, commas, spaces
            cleaned = re.sub(r"[₹$€£¥,\s]", "", value)
            # Handle parentheses for negatives
            if cleaned.startswith("(") and cleaned.endswith(")"):
                cleaned = "-" + cleaned[1:-1]
            return float(cleaned)
        except (ValueError, TypeError):
            return None  # Will be flagged as anomaly

    def _normalize_name(self, value: Optional[str]) -> Optional[str]:
        if not value:
            return None
        # Title case, strip extra whitespace
        name = " ".join(value.split())
        return name.strip().title()

    def _normalize_text(self, value: Optional[str]) -> Optional[str]:
        if not value:
            return None
        return " ".join(value.split()).strip()

    def _normalize_currency(self, value: Optional[str]) -> str:
        if not value:
            return "INR"
        value = value.upper().strip()
        currency_map = {
            "₹": "INR", "RUPEE": "INR", "RUPEES": "INR", "RS": "INR", "RS.": "INR",
            "$": "USD", "DOLLAR": "USD", "DOLLARS": "USD",
            "€": "EUR", "EURO": "EUR", "EUROS": "EUR",
            "£": "GBP", "POUND": "GBP", "POUNDS": "GBP",
        }
        return currency_map.get(value, value if len(value) == 3 else "INR")

    def _normalize_participants(self, value: Optional[str]) -> List[str]:
        if not value:
            return []
        # Split by common delimiters
        parts = re.split(r"[,;|/&]|\band\b", value, flags=re.IGNORECASE)
        return [self._normalize_name(p) for p in parts if p.strip()]

    def _is_settlement(
        self,
        description: Optional[str],
        payer: Optional[str],
        participants: List[str],
    ) -> bool:
        """Detect if a row represents a settlement rather than an expense."""
        if not description:
            return False

        desc_lower = description.lower()

        # Check for settlement keywords
        for keyword in SETTLEMENT_KEYWORDS:
            if keyword in desc_lower:
                # Additional check: if only one participant, likely a settlement
                if len(participants) <= 1:
                    return True

        # Pattern: "X paid Y" or "X → Y"
        if re.search(r"paid\s+\w+|→|->|to\s+\w+.*(?:settlement|repay)", desc_lower):
            if len(participants) <= 1:
                return True

        return False


# Singleton
csv_engine = CSVEngine()
