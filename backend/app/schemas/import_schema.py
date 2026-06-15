from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, date


class ColumnMapping(BaseModel):
    date: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[str] = None
    payer: Optional[str] = None
    participants: Optional[str] = None
    currency: Optional[str] = None
    category: Optional[str] = None
    split_type: Optional[str] = None
    notes: Optional[str] = None


class ImportUploadResponse(BaseModel):
    import_id: str
    filename: str
    total_rows: int
    columns: List[str]
    preview: List[Dict[str, Any]]
    suggested_mapping: ColumnMapping
    status: str


class MembershipSuggestion(BaseModel):
    name: str
    first_appearance: Optional[date]
    last_appearance: Optional[date]
    suggested_join_date: Optional[date]
    suggested_leave_date: Optional[date]
    total_activities: int
    matched_user_id: Optional[str] = None
    is_new_user: bool = True


class MembershipReviewResponse(BaseModel):
    import_id: str
    detected_members: List[MembershipSuggestion]
    existing_members: List[Dict[str, Any]]


class MembershipConfirmation(BaseModel):
    members: List[Dict[str, Any]]
    # Each dict: { name, user_id (optional), join_date, leave_date (optional), create_account: bool }


class AnomalyResponse(BaseModel):
    id: str
    row_number: int
    severity: str
    anomaly_type: str
    explanation: str
    suggested_action: Optional[Dict[str, Any]]
    resolution: Optional[str]
    resolution_data: Optional[Dict[str, Any]]
    resolved_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class AnomalyResolve(BaseModel):
    resolution: str  # keep_first, keep_second, keep_both, skip, auto_fix, manual
    resolution_data: Optional[Dict[str, Any]] = None


class ImportExecuteRequest(BaseModel):
    column_mapping: Optional[ColumnMapping] = None


class ImportReportResponse(BaseModel):
    import_id: str
    filename: str
    status: str
    total_rows: int
    imported_rows: int
    expenses_created: int
    settlements_created: int
    warning_count: int
    error_count: int
    user_decisions: int
    auto_fixes: int
    anomalies: List[AnomalyResponse]
    created_at: datetime
    completed_at: Optional[datetime]

    model_config = {"from_attributes": True}


class ImportListResponse(BaseModel):
    id: str
    filename: str
    status: str
    total_rows: int
    imported_rows: int
    warning_count: int
    error_count: int
    created_at: datetime
    completed_at: Optional[datetime]

    model_config = {"from_attributes": True}
