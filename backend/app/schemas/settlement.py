from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date


class SettlementCreate(BaseModel):
    payer_id: str
    payee_id: str
    amount: float = Field(..., gt=0)
    currency: str = "INR"
    settlement_date: date
    notes: Optional[str] = None


class SettlementResponse(BaseModel):
    id: str
    group_id: str
    payer_id: str
    payer_name: str = ""
    payee_id: str
    payee_name: str = ""
    amount: float
    currency: str
    settlement_date: date
    status: str
    notes: Optional[str]
    csv_row_number: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


class SettlementRecommendation(BaseModel):
    from_user_id: str
    from_user_name: str
    to_user_id: str
    to_user_name: str
    amount: float
    currency: str
    explanation: str
