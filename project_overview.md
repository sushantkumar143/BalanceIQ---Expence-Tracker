# BalanceIQ - Project Overview & Technical Architecture

## 1. Objectives & Problems Solved

**Objectives:**
BalanceIQ was built to be a production-grade Shared Expense Management SaaS application. The primary objective is to transform messy, unorganized expense spreadsheets or manual entries into trustworthy, easily explainable balances among groups of people.

**Problems it Solves:**
*   **Messy Real-World Data:** Unlike basic expense splitters, BalanceIQ handles real-world chaos—duplicate entries, ambiguous dates, mixed currencies, and name overlaps (e.g., "Aisha" vs. "Aisha K."). It solves this via a robust **CSV Import & Anomaly Resolution Engine**.
*   **"Why do I owe this?" Confusion:** It provides full mathematical transparency. Users don't just see a final owed number; they can audit the exact mathematical fractions and timelines that derived that balance.
*   **Dynamic Group Memberships:** It solves the problem of members joining late or leaving early. Expenses are strictly split *only* among active members at the time the expense occurred.
*   **Too Many Transactions:** It uses smart settlement optimization (Greedy Graph Reduction) to minimize the number of actual money transfers needed to settle all debts in a group.

## 2. How the Project is Working (High-Level Architecture)

The system follows a modern Client-Server Architecture:
*   **Frontend (React 18 + Vite + TypeScript):** Provides a premium, responsive dashboard with rich micro-animations (Framer Motion) and dark-mode glassmorphism. It uses TanStack React Query for robust server-state caching.
*   **Backend (FastAPI + Python 3.12+):** Exposes a strict RESTful API using Pydantic for validation. The logic is separated into independent, testable "Engines" (CSVEngine, AnomalyEngine, BalanceEngine, SettlementEngine).
*   **Database (SQLite/PostgreSQL + SQLAlchemy):** Structured as an immutable-friendly ledger ensuring ACID compliance. Balances are not stored as static numbers but are dynamically computed from the ledger of expenses and settlements.

## 3. How Decisions are Made (Architectural Choices)

Key architectural decisions are documented in the project's `DECISIONS.md`:
*   **Dynamic Ledger vs. Stored Balances:** Instead of keeping a running `net_balance` column that can get out of sync, balances are dynamically calculated on-demand from an immutable ledger of transactions. This ensures data integrity and supports complex edge cases like temporal memberships.
*   **Multi-Stage CSV Import:** Rather than a risky one-click import, the system uses a strict state machine (`UPLOADED` -> `MAPPED` -> `MEMBERSHIP_RESOLVED` -> `ANOMALIES_DETECTED` -> `READY_TO_EXECUTE`). This prevents bad data from corrupting the ledger and allows the user to manually resolve issues.
*   **Settlement Algorithm:** A Greedy Reduction Algorithm ($O(N \log N)$) is used instead of complex Network Flow matrix balancing. It perfectly balances the mathematical minimization of total transaction volume with the social preference for a simpler, fewer number of transactions.

## 4. How Filters are Done

Filtering is handled robustly on the backend using **SQLAlchemy Query Building** and exposed via **FastAPI Query Parameters**. 
For example, in the `list_expenses` API (`app/api/v1/expenses.py`):
*   The API accepts optional parameters like `search`, `category`, `payer_id`, `sort_by`, and `sort_order`.
*   If a `category` or `payer_id` is provided, exact match filters (`==`) are dynamically added to the SQL query.
*   If a `search` string is provided, `ILIKE` operators are used to perform case-insensitive fuzzy searches across both the `description` and `category` fields.
*   Pagination (`page`, `page_size`) and sorting are then applied to the filtered dataset before returning the result to the frontend.

## 5. How Anomalies are Detected

The `AnomalyEngine` runs a strict **9-stage pipeline** over imported CSV rows before they hit the database. It uses a mix of hardcoded logic, statistical analysis, and fuzzy matching (via the `rapidfuzz` library):
1.  **Duplicate Detection:** Looks for rows with the same date, amount, payer, and highly similar descriptions (using fuzzy matching).
2.  **Date Anomalies:** Flags unparseable dates, future dates, or dates before the group was created.
3.  **Amount Anomalies:** Flags missing, zero, negative amounts, or statistically unusual amounts (using standard deviation checks against the mean).
4.  **Membership Conflicts:** Checks if the expense date falls outside the active timeline (join/leave dates) of the payer or any participants.
5.  **Settlement Misclassifications:** Uses Regex to detect descriptions like "Paid to John" and suggests converting the shared expense into a direct settlement transfer.
6.  **Unknown Users:** Uses fuzzy string matching to see if a name in the CSV slightly matches an existing user, or flags them as a new/unknown user.
7.  **Currency Issues:** Detects unknown ISO codes or warns if multiple currencies are used in one import.

## 6. Future Improvements

To advance BalanceIQ to the next level, the following improvements can be made:
*   **Live Bank & Plaid Integration:** Automatically fetch transactions from bank accounts and credit cards, removing the need for manual CSV uploads.
*   **OCR Receipt Scanning:** Allow users to take a photo of a receipt, automatically extracting the total amount, date, and individual line items.
*   **Real-time Multi-Currency Conversion:** Integrate a live FX API to automatically convert cross-border expenses into a single unified base currency using exact historical exchange rates.
*   **Push Notifications & Webhooks:** Implement real-time notifications (via Email, SMS, or Push) when users are added to a group, owe money, or settle a debt.
*   **Advanced Analytics & Reporting:** Add visual charts (pie charts, line graphs) tracking monthly spending habits, categorical breakdowns, and budget tracking.
*   **Mobile App Native Client:** Build a React Native or Flutter application for on-the-go expense logging and push notifications.
