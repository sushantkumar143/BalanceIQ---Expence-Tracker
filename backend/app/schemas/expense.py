from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal


class ParticipantCreate(BaseModel):
    user_id: str
    share_amount: Optional[float] = None
    share_percentage: Optional[float] = None
    share_units: Optional[int] = None


class ExpenseCreate(BaseModel):
    description: str = Field(..., min_length=1, max_length=500)
    amount: float = Field(..., gt=0)
    currency: str = "INR"
    expense_date: date
    payer_id: str
    split_type: str = "equal"  # equal, percentage, exact, shares
    category: Optional[str] = None
    participants: List[ParticipantCreate] = []
    notes: Optional[str] = None


class ExpenseUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    expense_date: Optional[date] = None
    payer_id: Optional[str] = None
    split_type: Optional[str] = None
    category: Optional[str] = None
    participants: Optional[List[ParticipantCreate]] = None
    notes: Optional[str] = None


class ParticipantResponse(BaseModel):
    id: str
    user_id: str
    user_name: str = ""
    share_amount: float
    share_percentage: Optional[float] = None
    share_units: Optional[int] = None

    model_config = {"from_attributes": True}


class ExpenseResponse(BaseModel):
    id: str
    group_id: str
    payer_id: str
    payer_name: str = ""
    description: str
    amount: float
    currency: str
    expense_date: date
    split_type: str
    category: Optional[str]
    status: str
    csv_row_number: Optional[int]
    notes: Optional[str]
    participants: List[ParticipantResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class ExpenseListResponse(BaseModel):
    items: List[ExpenseResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
