# DECISIONS.md — Architectural Decision Log

This document lists the significant architectural and technical decisions made during the development of **BalanceIQ**.

---

## 1. Dynamic Ledger-Based Balance Calculation vs. Stored Running Balances

*   **Context**: How should member balances within a group be stored and tracked?
*   **Options considered**:
    1.  **Stored Running Balances**: Keep a column `net_balance` in a `GroupMembers` table and update it every time an expense/settlement is added, modified, or deleted.
    2.  **Dynamic Ledger-Based Calculations (Chosen)**: Store expenses and settlements as immutable records. Compute balances dynamically by querying the database ledger on demand.
*   **Why Option 2 was chosen**:
    *   **Data Integrity**: Storing running balances introduces high concurrency risk (e.g., race conditions on concurrent updates) and can easily drift out of sync if an update fails or a record is modified.
    *   **Temporal Membership Support**: Since members can join/leave groups mid-way, balances depend heavily on the date of the expense relative to the member's active timeframe. A simple running balance column cannot support retroactively changing join/leave dates.
    *   **Full Explainability**: Dynamic calculations allow us to generate a step-by-step breakdown of how a balance was reached (e.g. "You paid $50 here, you owed $10 there...").

---

## 2. Multi-Stage CSV Import State Machine vs. Direct One-Click Import

*   **Context**: How should user CSV files be imported into the application?
*   **Options considered**:
    1.  **One-Click Direct Import**: Ingest the file, parse it, make guesses on columns, auto-create missing users, ignore errors, and write directly to the database.
    2.  **Multi-Stage Wizard with Intermediate Tables (Chosen)**: Store the uploaded CSV in temporary tables (`Imports`, `ImportAnomalies`), run the validation pipeline, let the user resolve anomalies step-by-step in the UI, and only commit to the live ledger once cleared.
*   **Why Option 2 was chosen**:
    *   **Ledger Safety**: Direct import introduces "garbage in, garbage out". Unverified rows (e.g., negative values, unknown currencies, duplicate rows) would corrupt the ledger.
    *   **UX Transparency**: By staging imports, users can explicitly map columns (e.g. if their spreadsheet has headers like "Cost" instead of "Amount") and map CSV user names to existing system users, avoiding duplicates like "Aisha" and "Aisha K.".

---

## 3. GREEDY Settlement Reduction Algorithm vs. Full Matrix Balancing

*   **Context**: How to calculate the minimum transactions needed to settle a group's debts.
*   **Options considered**:
    1.  **Naive Direct Ledger Settling**: Every individual debt is settled as is (e.g. if User A owes User B, and User B owes User C, both transactions are completed).
    2.  **Greedy Reduction Matching (Chosen)**: Aggregate all debts into net balances. Match the largest debtor with the largest creditor, reduce debt, and repeat until all balances are zero.
    3.  **Linear Programming / Network Flow**: Find the mathematically absolute minimal currency transfer volume.
*   **Why Option 2 was chosen**:
    *   **Simplicity & Efficiency**: Greedy reduction is easy to implement, runs in $O(N \log N)$ time, and drastically reduces the number of transactions (maximum $N-1$ transactions for $N$ members).
    *   **Social Preference**: People care more about the *number of transactions* they have to make rather than trying to minimize the absolute dollar volume of transfer if it means making more complex splits.

---

## 4. Choice of Tech Stack: FastAPI + React + SQLite/PostgreSQL

*   **Context**: Core technologies for the MVP.
*   **Options considered**:
    1.  **Django/Rails**: Batteries-included framework.
    2.  **FastAPI + React + SQLAlchemy (Chosen)**: Python-based high-performance backend, React-based dynamic frontend.
*   **Why Option 2 was chosen**:
    *   **Type Safety & API Validation**: FastAPI leverages Pydantic, ensuring that all API payloads are strictly validated on input.
    *   **Data Processing**: Python has excellent support for data cleaning and fuzzy matching (using Pandas and Rapidfuzz), which are core requirements of the CSV Anomaly Engine.
    *   **Vibrant UI**: React with Vite allows building highly interactive, micro-animated dashboards (using Tailwind and Framer Motion) which would be much harder to build with traditional template-based frameworks.
