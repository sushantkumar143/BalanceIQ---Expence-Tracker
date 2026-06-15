# BalanceIQ Backend

The backend of BalanceIQ is built using FastAPI and powers the intelligent CSV importing, anomaly detection, and exact balance calculations.

## 🛠️ Technology Stack
- **Framework:** FastAPI
- **Language:** Python 3.12+
- **Database:** SQLite (local development) with SQLAlchemy ORM
- **Migrations:** Alembic
- **Authentication:** JWT, passlib, bcrypt
- **Data Engineering:** Pandas, Rapidfuzz (for fuzzy column matching)

## 📁 Project Structure
- `app/api/`: RESTful endpoints organized by domain (auth, users, groups, expenses, imports).
- `app/core/`: Configuration, security utilities, and JWT settings.
- `app/db/`: Database session management.
- `app/models/`: SQLAlchemy database models (Ledger Architecture).
- `app/schemas/`: Pydantic models for API request/response validation.
- `app/services/`: The core business engines:
  - `csv_engine.py`: Handles file parsing and column mapping.
  - `anomaly_engine.py`: 9-stage data validation pipeline.
  - `balance_engine.py`: Exact debt calculation and explanation.
  - `settlement_engine.py`: Graph-based debt simplification.

## 🚀 Quick Start

1. **Create Virtual Environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run Server:**
   ```bash
   uvicorn app.main:app --reload
   ```

The API will be available at `http://localhost:8000`. You can access the automatic Swagger documentation at `http://localhost:8000/docs`.
