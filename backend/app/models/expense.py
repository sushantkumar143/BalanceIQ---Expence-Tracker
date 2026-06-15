import uuid
from datetime import datetime, date, timezone
from decimal import Decimal
from sqlalchemy import String, DateTime, Date, ForeignKey, Numeric, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    group_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("groups.id"), nullable=False
    )
    payer_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    import_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("imports.id"), nullable=True
    )
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR")
    expense_date: Mapped[date] = mapped_column(Date, nullable=False)
    split_type: Mapped[str] = mapped_column(
        String(20), default="equal"
    )  # equal, percentage, exact, shares
    category: Mapped[str] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="active"
    )  # active, deleted, disputed
    csv_row_number: Mapped[int] = mapped_column(Integer, nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    group = relationship("Group", back_populates="expenses")
    payer = relationship("User", back_populates="expenses_paid")
    import_record = relationship("Import", back_populates="expenses")
    participants = relationship(
        "ExpenseParticipant", back_populates="expense", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Expense {self.description} ${self.amount}>"


class ExpenseParticipant(Base):
    __tablename__ = "expense_participants"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    expense_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("expenses.id"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    share_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    share_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=True)
    share_units: Mapped[int] = mapped_column(Integer, nullable=True)

    # Relationships
    expense = relationship("Expense", back_populates="participants")
    user = relationship("User", back_populates="expense_participations")

    def __repr__(self):
        return f"<ExpenseParticipant {self.user_id} owes {self.share_amount}>"
