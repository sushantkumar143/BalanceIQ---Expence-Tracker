from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date


class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    default_currency: str = "INR"


class GroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    default_currency: Optional[str] = None


class MemberAdd(BaseModel):
    email: str
    display_name: Optional[str] = None
    role: str = "member"
    join_date: date


class MemberUpdate(BaseModel):
    display_name: Optional[str] = None
    role: Optional[str] = None
    join_date: Optional[date] = None
    leave_date: Optional[date] = None


class MemberResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    display_name: Optional[str]
    role: str
    join_date: date
    leave_date: Optional[date]
    created_at: datetime

    model_config = {"from_attributes": True}


class GroupResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    default_currency: str
    created_by: str
    creator_name: str = ""
    member_count: int = 0
    total_expenses: float = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class GroupDetailResponse(GroupResponse):
    members: List[MemberResponse] = []
