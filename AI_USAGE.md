# AI_USAGE.md — AI Assistance & Prompt Log

This document details the AI tools used in the development of **BalanceIQ**, key prompts, and three concrete cases where the AI produced errors, how they were caught, and what was corrected.

---

## 1. AI Tools Used

*   **Antigravity (Gemini 3.5 Flash)**: Used as the primary agentic assistant for code structuring, debugging, Git history management, and documentation.
*   **GitHub Copilot / VS Code Intellisense**: Used for inline auto-completion and standard boilerplate generation.

---

## 2. Key Prompts

### Architecture and Design
> "Generate a modular FastAPI backend structure that implements an immutable ledger database schema. The design must separate database querying from the pure mathematical computation in separate services: `csv_engine.py`, `anomaly_engine.py`, `balance_engine.py`, and `settlement_engine.py`."

### CSV Anomaly Pipeline
> "Implement an `AnomalyEngine` in Python that runs a pipeline of 9 detectors on parsed CSV rows. The detectors should catch duplicates, unparseable dates, negative amounts, missing participants, settlement misclassifications, and membership timeline conflicts."

### Frontend Design
> "Design a premium multi-step CSV Import Wizard in React with Vite. Use Tailwind CSS and Framer Motion for smooth transitions between steps (Upload -> Mapped Columns -> Membership Review -> Anomaly Resolver -> Final Confirmation)."

---

## 3. Concrete AI Errors and Resolutions

### Case 1: Orphan Branch Checkout in Git

*   **What the AI produced**:
    During repository history restructuring, the AI suggested checking out an unborn orphan branch (`temp-main`), and then immediately checking out a feature branch (`chore/project-setup`) before making any commits.
*   **How it was caught**:
    Running `git checkout main` failed with the error:
    `error: pathspec 'main' did not match any file(s) known to git`
    Because `main` had no commits, Git did not write a ref under `.git/refs/heads/main`, causing the branch reference to disappear when switching to another branch.
*   **What was changed**:
    We committed the first set of files to `chore/project-setup` directly to establish a commit object, and then created the `main` branch off of that commit using `git checkout -b main`. This properly established the root commit on both branches.

---

### Case 2: Naive Python Float Comparisons in the Balance Engine

*   **What the AI produced**:
    The AI generated calculations for user shares and net totals using Python's standard `float` type (e.g. `amount / len(participants)`).
*   **How it was caught**:
    When running ledger calculations, the balances showed standard floating-point precision issues, such as `-0.00000000000004` instead of `0.00`, and `33.333333333333336` for a division of 100 by 3.
*   **What was changed**:
    We rewrote the calculation in `balance_engine.py` to use Python's `Decimal` type from the `decimal` module, and set custom quantization to 2 decimal places. This ensures high financial accuracy and avoids floating-point precision leakage in ledger splits.

---

### Case 3: Mixed Timezone Datetime Fields in SQLite vs. PostgreSQL

*   **What the AI produced**:
    The AI generated SQLAlchemy models with timezone-aware datetimes using `DateTime(timezone=True)` for all timestamps (`created_at`, `resolved_at`, etc.).
*   **How it was caught**:
    When testing the application using SQLite locally, SQLite failed to parse the timezone strings properly for certain queries, causing timezone-aware datetime objects to be compared against naive objects, raising `TypeError: can't compare offset-naive and offset-aware datetimes`.
*   **What was changed**:
    We standardized the ORM models to store naive UTC datetimes, and added a utility decorator/helper in the FastAPI dependency injection layer (`deps.py`) that standardizes dates to UTC before querying or returning payloads.
