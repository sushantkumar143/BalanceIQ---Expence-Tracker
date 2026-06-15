import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Integer, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Import(Base):
    __tablename__ = "imports"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    group_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("groups.id"), nullable=False
    )
    uploaded_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        String(30), default="uploaded"
    )  # uploaded, analyzing, membership_review, anomaly_review, ready, importing, completed, failed
    total_rows: Mapped[int] = mapped_column(Integer, default=0)
    imported_rows: Mapped[int] = mapped_column(Integer, default=0)
    warning_count: Mapped[int] = mapped_column(Integer, default=0)
    error_count: Mapped[int] = mapped_column(Integer, default=0)
    column_mapping: Mapped[dict] = mapped_column(JSON, nullable=True)
    raw_preview: Mapped[list] = mapped_column(JSON, nullable=True)
    parsed_data: Mapped[list] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Relationships
    group = relationship("Group", back_populates="imports")
    uploader = relationship("User", foreign_keys=[uploaded_by])
    anomalies = relationship(
        "ImportAnomaly", back_populates="import_record", cascade="all, delete-orphan"
    )
    reports = relationship(
        "ImportReport", back_populates="import_record", cascade="all, delete-orphan"
    )
    expenses = relationship("Expense", back_populates="import_record")
    settlements = relationship("Settlement", back_populates="import_record")

    def __repr__(self):
        return f"<Import {self.filename} ({self.status})>"


class ImportAnomaly(Base):
    __tablename__ = "import_anomalies"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    import_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("imports.id"), nullable=False
    )
    row_number: Mapped[int] = mapped_column(Integer, nullable=False)
    severity: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # error, warning, info
    anomaly_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # duplicate, date_ambiguous, missing_participant, etc.
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    suggested_action: Mapped[dict] = mapped_column(JSON, nullable=True)
    resolution: Mapped[str] = mapped_column(
        String(50), nullable=True
    )  # keep_first, keep_second, keep_both, skip, auto_fix, manual
    resolution_data: Mapped[dict] = mapped_column(JSON, nullable=True)
    resolved_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    resolved_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    import_record = relationship("Import", back_populates="anomalies")
    resolver = relationship("User", foreign_keys=[resolved_by])

    def __repr__(self):
        return f"<ImportAnomaly row={self.row_number} type={self.anomaly_type} severity={self.severity}>"


class ImportReport(Base):
    __tablename__ = "import_reports"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    import_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("imports.id"), nullable=False
    )
    report_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    import_record = relationship("Import", back_populates="reports")

    def __repr__(self):
        return f"<ImportReport for import={self.import_id}>"
