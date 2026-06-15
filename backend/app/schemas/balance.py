from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import date


class BalanceEntry(BaseModel):
    user_id: str
    user_name: str
    net_balance: float
    currency: str
    total_paid: float
    total_owed: float
    settlements_paid: float
    settlements_received: float


class BalanceExplanationItem(BaseModel):
    expense_id: Optional[str] = None
    settlement_id: Optional[str] = None
    description: str
    date: date
    type: str  # expense_paid, expense_owed, settlement_paid, settlement_received
    amount: float
    running_total: float


class BalanceExplanation(BaseModel):
    user_id: str
    user_name: str
    net_balance: float
    currency: str
    items: List[BalanceExplanationItem]
    summary: Dict[str, float]


class DashboardMetrics(BaseModel):
    total_expenses: float
    total_groups: int
    total_members: int
    open_balances: float
    pending_imports: int
    recent_activity: List[Dict]
    monthly_spending: List[Dict]
