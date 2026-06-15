"""CSV Import routes — the most critical feature in the application."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone, date
from decimal import Decimal
import uuid

from app.db.base import get_db
from app.models import Import, ImportAnomaly, ImportReport, User, GroupMember, Expense, ExpenseParticipant, Settlement
from app.schemas.import_schema import (
    ImportUploadResponse, ColumnMapping, MembershipReviewResponse,
    MembershipSuggestion, MembershipConfirmation, AnomalyResponse,
    AnomalyResolve, ImportExecuteRequest, ImportReportResponse, ImportListResponse,
)
from app.api.deps import get_current_user
from app.api.v1.groups import _verify_membership
from app.services.csv_engine import csv_engine
from app.services.anomaly_engine import anomaly_engine
from app.services.membership_engine import membership_engine
from app.core.config import settings
from app.core.security import hash_password

router = APIRouter(prefix="/groups/{group_id}/imports", tags=["Imports"])


@router.get("", response_model=List[ImportListResponse])
async def list_imports(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all imports for a group."""
    _verify_membership(db, group_id, current_user.id)

    imports = (
        db.query(Import)
        .filter(Import.group_id == group_id)
        .order_by(Import.created_at.desc())
        .all()
    )

    return [
        ImportListResponse(
            id=imp.id,
            filename=imp.filename,
            status=imp.status,
            total_rows=imp.total_rows,
            imported_rows=imp.imported_rows,
            warning_count=imp.warning_count,
            error_count=imp.error_count,
            created_at=imp.created_at,
            completed_at=imp.completed_at,
        )
        for imp in imports
    ]


@router.post("/upload", response_model=ImportUploadResponse)
async def upload_csv(
    group_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a CSV file and get initial analysis."""
    _verify_membership(db, group_id, current_user.id)

    # Validate file
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    # Parse CSV
    try:
        parsed = csv_engine.parse_csv(content, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Create import record
    import_record = Import(
        group_id=group_id,
        uploaded_by=current_user.id,
        filename=file.filename,
        status="analyzing",
        total_rows=parsed["total_rows"],
        column_mapping=parsed["suggested_mapping"],
        raw_preview=parsed["preview"],
        parsed_data=parsed["rows"],
    )
    db.add(import_record)
    db.commit()
    db.refresh(import_record)

    return ImportUploadResponse(
        import_id=import_record.id,
        filename=file.filename,
        total_rows=parsed["total_rows"],
        columns=parsed["columns"],
        preview=parsed["preview"],
        suggested_mapping=ColumnMapping(**parsed["suggested_mapping"]),
        status="analyzing",
    )


@router.post("/{import_id}/mapping")
async def update_column_mapping(
    group_id: str,
    import_id: str,
    mapping: ColumnMapping,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update column mapping for an import."""
    _verify_membership(db, group_id, current_user.id)

    import_record = _get_import(db, import_id, group_id)
    import_record.column_mapping = mapping.model_dump()
    db.commit()

    return {"status": "ok", "mapping": mapping.model_dump()}


@router.get("/{import_id}/membership", response_model=MembershipReviewResponse)
async def get_membership_suggestions(
    group_id: str,
    import_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get membership suggestions based on CSV data analysis."""
    _verify_membership(db, group_id, current_user.id)

    import_record = _get_import(db, import_id, group_id)

    # Normalize rows using current mapping
    mapping = import_record.column_mapping or {}
    normalized = csv_engine.normalize_rows(import_record.parsed_data or [], mapping)

    # Extract unique users
    user_activities = csv_engine.extract_unique_users(normalized)

    # Get existing members
    existing_members = (
        db.query(GroupMember)
        .filter(GroupMember.group_id == group_id)
        .all()
    )
    existing_list = [
        {
            "user_id": m.user_id,
            "name": m.display_name,
            "join_date": m.join_date,
            "leave_date": m.leave_date,
        }
        for m in existing_members
    ]

    # Generate suggestions
    suggestions = membership_engine.suggest_membership_dates(
        user_activities, existing_list
    )

    import_record.status = "membership_review"
    db.commit()

    return MembershipReviewResponse(
        import_id=import_id,
        detected_members=[
            MembershipSuggestion(
                name=s["name"],
                first_appearance=s.get("first_appearance"),
                last_appearance=s.get("last_appearance"),
                suggested_join_date=s.get("suggested_join_date"),
                suggested_leave_date=s.get("suggested_leave_date"),
                total_activities=s.get("total_activities", 0),
                matched_user_id=s.get("matched_user_id"),
                is_new_user=s.get("is_new_user", True),
            )
            for s in suggestions
        ],
        existing_members=[
            {"user_id": m.user_id, "name": m.display_name, "join_date": str(m.join_date), "leave_date": str(m.leave_date) if m.leave_date else None}
            for m in existing_members
        ],
    )


@router.post("/{import_id}/membership")
async def confirm_membership(
    group_id: str,
    import_id: str,
    data: MembershipConfirmation,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Confirm membership dates after user review."""
    _verify_membership(db, group_id, current_user.id)

    import_record = _get_import(db, import_id, group_id)

    for member_data in data.members:
        name = member_data.get("name")
        user_id = member_data.get("user_id")
        join_date_str = member_data.get("join_date")
        leave_date_str = member_data.get("leave_date")
        create_account = member_data.get("create_account", True)

        join_date = date.fromisoformat(join_date_str) if join_date_str else date.today()
        leave_date = date.fromisoformat(leave_date_str) if leave_date_str else None

        if user_id:
            # Update existing member
            member = (
                db.query(GroupMember)
                .filter(
                    GroupMember.group_id == group_id,
                    GroupMember.user_id == user_id,
                )
                .first()
            )
            if member:
                member.join_date = join_date
                member.leave_date = leave_date
        elif create_account:
            # Create new user and add as member
            email = f"{name.lower().replace(' ', '.')}@balanceiq.local"
            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = User(
                    email=email,
                    name=name,
                    password_hash=hash_password("changeme123"),
                )
                db.add(user)
                db.flush()

            # Add as group member
            existing_member = (
                db.query(GroupMember)
                .filter(
                    GroupMember.group_id == group_id,
                    GroupMember.user_id == user.id,
                )
                .first()
            )
            if not existing_member:
                member = GroupMember(
                    group_id=group_id,
                    user_id=user.id,
                    display_name=name,
                    role="member",
                    join_date=join_date,
                    leave_date=leave_date,
                )
                db.add(member)

    import_record.status = "anomaly_review"
    db.commit()

    return {"status": "ok", "message": "Membership confirmed"}


@router.get("/{import_id}/anomalies", response_model=List[AnomalyResponse])
async def get_anomalies(
    group_id: str,
    import_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get detected anomalies for an import."""
    _verify_membership(db, group_id, current_user.id)

    import_record = _get_import(db, import_id, group_id)

    # Run anomaly detection if not done yet
    existing_anomalies = (
        db.query(ImportAnomaly)
        .filter(ImportAnomaly.import_id == import_id)
        .all()
    )

    if not existing_anomalies:
        # Normalize and detect
        mapping = import_record.column_mapping or {}
        normalized = csv_engine.normalize_rows(import_record.parsed_data or [], mapping)

        # Get members for conflict detection
        members = (
            db.query(GroupMember)
            .filter(GroupMember.group_id == group_id)
            .all()
        )
        member_list = [
            {
                "name": m.display_name,
                "join_date": m.join_date,
                "leave_date": m.leave_date,
            }
            for m in members
        ]

        anomalies = anomaly_engine.detect_all(normalized, member_list)

        # Store anomalies
        error_count = 0
        warning_count = 0

        for a in anomalies:
            anomaly_record = ImportAnomaly(
                import_id=import_id,
                row_number=a.row_number,
                severity=a.severity,
                anomaly_type=a.anomaly_type,
                explanation=a.explanation,
                suggested_action=a.suggested_action,
            )
            db.add(anomaly_record)

            if a.severity == "error":
                error_count += 1
            elif a.severity == "warning":
                warning_count += 1

        import_record.error_count = error_count
        import_record.warning_count = warning_count
        import_record.status = "anomaly_review"
        db.commit()

        existing_anomalies = (
            db.query(ImportAnomaly)
            .filter(ImportAnomaly.import_id == import_id)
            .order_by(ImportAnomaly.row_number)
            .all()
        )

    return [
        AnomalyResponse.model_validate(a)
        for a in existing_anomalies
    ]


@router.patch("/{import_id}/anomalies/{anomaly_id}", response_model=AnomalyResponse)
async def resolve_anomaly(
    group_id: str,
    import_id: str,
    anomaly_id: str,
    data: AnomalyResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resolve a specific anomaly with user's decision."""
    _verify_membership(db, group_id, current_user.id)

    anomaly = (
        db.query(ImportAnomaly)
        .filter(
            ImportAnomaly.id == anomaly_id,
            ImportAnomaly.import_id == import_id,
        )
        .first()
    )
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly not found")

    anomaly.resolution = data.resolution
    anomaly.resolution_data = data.resolution_data
    anomaly.resolved_by = current_user.id
    anomaly.resolved_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(anomaly)

    return AnomalyResponse.model_validate(anomaly)


@router.post("/{import_id}/execute")
async def execute_import(
    group_id: str,
    import_id: str,
    data: ImportExecuteRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Execute the import after all anomalies are reviewed."""
    _verify_membership(db, group_id, current_user.id)

    import_record = _get_import(db, import_id, group_id)

    # Check for unresolved errors
    unresolved_errors = (
        db.query(ImportAnomaly)
        .filter(
            ImportAnomaly.import_id == import_id,
            ImportAnomaly.severity == "error",
            ImportAnomaly.resolution.is_(None),
        )
        .count()
    )

    if unresolved_errors > 0:
        raise HTTPException(
            status_code=400,
            detail=f"{unresolved_errors} error(s) must be resolved before importing",
        )

    import_record.status = "importing"
    db.flush()

    # Normalize data
    mapping = import_record.column_mapping or {}
    if data and data.column_mapping:
        mapping = data.column_mapping.model_dump()

    normalized = csv_engine.normalize_rows(import_record.parsed_data or [], mapping)

    # Get skip list from anomaly resolutions
    skip_rows = set()
    anomalies = (
        db.query(ImportAnomaly)
        .filter(ImportAnomaly.import_id == import_id)
        .all()
    )
    duplicate_keep_second = set()

    for a in anomalies:
        if a.resolution == "skip":
            skip_rows.add(a.row_number)
        elif a.resolution == "keep_first":
            # Skip the current row (it's the duplicate)
            skip_rows.add(a.row_number)
        elif a.resolution == "keep_second":
            # Skip the original row
            if a.suggested_action and "duplicate_row" in a.suggested_action:
                skip_rows.add(a.suggested_action["duplicate_row"])

    # Get member lookup
    members = (
        db.query(GroupMember)
        .filter(GroupMember.group_id == group_id)
        .all()
    )
    member_by_name = {}
    for m in members:
        if m.display_name:
            member_by_name[m.display_name.lower()] = m

    # Import rows
    imported_count = 0
    expenses_created = 0
    settlements_created = 0

    for row in normalized:
        if row["row_number"] in skip_rows:
            continue

        if row.get("amount") is None or row.get("date") is None:
            continue

        payer_name = (row.get("payer") or "").lower()
        payer_member = member_by_name.get(payer_name)

        if not payer_member:
            continue

        if row.get("is_settlement"):
            # Create settlement
            participants = row.get("participants", [])
            payee_name = participants[0].lower() if participants else None
            payee_member = member_by_name.get(payee_name) if payee_name else None

            if payee_member:
                settlement = Settlement(
                    group_id=group_id,
                    payer_id=payer_member.user_id,
                    payee_id=payee_member.user_id,
                    import_id=import_id,
                    amount=Decimal(str(abs(row["amount"]))),
                    currency=row.get("currency", "INR"),
                    settlement_date=row["date"],
                    csv_row_number=row["row_number"],
                    notes=row.get("description"),
                )
                db.add(settlement)
                settlements_created += 1
        else:
            # Create expense
            expense = Expense(
                group_id=group_id,
                payer_id=payer_member.user_id,
                import_id=import_id,
                description=row.get("description") or "Imported expense",
                amount=Decimal(str(abs(row["amount"]))),
                currency=row.get("currency", "INR"),
                expense_date=row["date"],
                split_type="equal",
                category=row.get("category"),
                csv_row_number=row["row_number"],
            )
            db.add(expense)
            db.flush()

            # Create participants
            participants = row.get("participants", [])
            if participants:
                participant_members = []
                for p_name in participants:
                    pm = member_by_name.get(p_name.lower())
                    if pm:
                        participant_members.append(pm)

                if participant_members:
                    share = float(expense.amount) / len(participant_members)
                    for pm in participant_members:
                        ep = ExpenseParticipant(
                            expense_id=expense.id,
                            user_id=pm.user_id,
                            share_amount=Decimal(str(round(share, 2))),
                        )
                        db.add(ep)
            else:
                # Split among all active members on that date
                active_members = [
                    m for m in members
                    if m.is_active_on(row["date"])
                ]
                if active_members:
                    share = float(expense.amount) / len(active_members)
                    for am in active_members:
                        ep = ExpenseParticipant(
                            expense_id=expense.id,
                            user_id=am.user_id,
                            share_amount=Decimal(str(round(share, 2))),
                        )
                        db.add(ep)

            expenses_created += 1

        imported_count += 1

    # Update import record
    import_record.imported_rows = imported_count
    import_record.status = "completed"
    import_record.completed_at = datetime.now(timezone.utc)

    # Create import report
    report = ImportReport(
        import_id=import_id,
        report_data={
            "total_rows": import_record.total_rows,
            "imported_rows": imported_count,
            "expenses_created": expenses_created,
            "settlements_created": settlements_created,
            "skipped_rows": len(skip_rows),
            "warning_count": import_record.warning_count,
            "error_count": import_record.error_count,
            "user_decisions": sum(1 for a in anomalies if a.resolution),
            "auto_fixes": sum(1 for a in anomalies if a.resolution == "auto_fix"),
        },
    )
    db.add(report)
    db.commit()

    return {
        "status": "completed",
        "imported_rows": imported_count,
        "expenses_created": expenses_created,
        "settlements_created": settlements_created,
        "skipped_rows": len(skip_rows),
    }


@router.get("/{import_id}/report", response_model=ImportReportResponse)
async def get_import_report(
    group_id: str,
    import_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the detailed import report."""
    _verify_membership(db, group_id, current_user.id)

    import_record = _get_import(db, import_id, group_id)

    report = (
        db.query(ImportReport)
        .filter(ImportReport.import_id == import_id)
        .first()
    )
    report_data = report.report_data if report else {}

    anomalies = (
        db.query(ImportAnomaly)
        .filter(ImportAnomaly.import_id == import_id)
        .order_by(ImportAnomaly.row_number)
        .all()
    )

    return ImportReportResponse(
        import_id=import_record.id,
        filename=import_record.filename,
        status=import_record.status,
        total_rows=import_record.total_rows,
        imported_rows=import_record.imported_rows,
        expenses_created=report_data.get("expenses_created", 0),
        settlements_created=report_data.get("settlements_created", 0),
        warning_count=import_record.warning_count,
        error_count=import_record.error_count,
        user_decisions=report_data.get("user_decisions", 0),
        auto_fixes=report_data.get("auto_fixes", 0),
        anomalies=[AnomalyResponse.model_validate(a) for a in anomalies],
        created_at=import_record.created_at,
        completed_at=import_record.completed_at,
    )


# ---- Helpers ----

def _get_import(db: Session, import_id: str, group_id: str) -> Import:
    """Get import record or raise 404."""
    import_record = (
        db.query(Import)
        .filter(Import.id == import_id, Import.group_id == group_id)
        .first()
    )
    if not import_record:
        raise HTTPException(status_code=404, detail="Import not found")
    return import_record
