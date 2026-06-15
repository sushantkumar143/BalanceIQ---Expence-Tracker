# IMPORT_REPORT.md — Ingestion & Anomaly Resolution Report

*   **Import Session ID**: `imp_9f828a2a-4318-4226-9a2c-15a9a4e0a4f5`
*   **Filename**: `sample_expenses.csv`
*   **Timestamp**: `2026-06-15 09:55:10 UTC`
*   **Target Group**: `Flatmates 2024`
*   **Summary Status**: `COMPLETED WITH RESOLUTIONS`

---

## 1. Import Metrics Summary

*   **Total Rows Processed**: 22
*   **Successfully Imported**: 21
*   **Skipped Rows**: 1 (Critical formatting error)
*   **Warnings Detected**: 7
*   **Errors Detected**: 3
*   **Resolutions Applied**: 10

---

## 2. Itemized Anomaly Log & Actions Taken

Below is the list of every data anomaly identified during ingestion and the resolution applied:

| Row # | CSV Date | Description | Amount | Detected Anomaly | Severity | Applied Resolution / Action taken |
|-------|----------|-------------|--------|------------------|----------|-----------------------------------|
| **6** | 15/02/2024 | Dinner at restaurant | 3200 | Potential Duplicate of Row 5 (same date, description, payer, and amount). | **Warning** | **Kept First / Skipped Second**: Row 6 was ignored during ingestion to prevent ledger inflation. |
| **8** | 25-Feb-2024 | Water bill | 450 | Fuzzy date format ("25-Feb-2024") mismatch. | **Info** | **Auto-Standardization**: Normalised to date `2024-02-25` and imported. |
| **10** | 05/03/2024 | Rohan paid Aisha | 5000 | Settlement transaction misclassified as an expense. | **Info** | **Reclassification**: Processed as a direct debt-resolution payment (Rohan $\rightarrow$ Aisha) instead of a shared expense. |
| **13** | 20/03/2024 | Groceries | -500 | Negative value detected. | **Warning** | **Auto-Fix (Positive Conversion)**: Converted amount to `500` and kept Priya as payer (treated as shared refund credit). |
| **15** | 31/03/2024 | Priya settled with Aisha | 3000 | Settlement transaction misclassified as an expense. | **Info** | **Reclassification**: Processed as a debt-resolution payment (Priya $\rightarrow$ Aisha). |
| **16** | 15/04/2024 | Groceries | 2100 | Unknown user "Dev" listed as payer/participant. | **Warning** | **Membership Update**: Dev added to group membership timeline starting `14/04/2024`. |
| **17** | 16/04/2024 | Electricity Bill | 2400 | Unknown user "Sam" listed as participant. | **Warning** | **Membership Update**: Sam added to group membership timeline starting `15/04/2024`. |
| **20** | 30/04/2024 | Groceries | 0 | Zero-cost expense row. | **Warning** | **Skipped**: Zero-amount rows are automatically skipped as they have no financial ledger impact. |
| **21** | 05/05/2024 | Rent Payment | $300 | Non-numeric prefix ($) and mixed currency (USD vs default INR). | **Warning** | **Per-Currency Ledger Ingestion**: Standardised amount to numeric `300.00` and ingested into the separate USD ledger. |
| **22** | InvalidDate | Some expense | abc | Date parsing error ("InvalidDate"), amount parsing error ("abc"), unknown payer ("Unknown"). | **Error** | **Row Skipped**: The row could not be parsed and was excluded from the database ingestion. |

---

## 3. Final Ingested Ledger Entries

The following entries were successfully committed to the database:

### Expenses Ledger
*   2024-02-01: **Rent Payment** - Aisha paid 25,000 INR (Split with Aisha, Rohan, Priya, Meera)
*   2024-02-03: **Groceries** - Rohan paid 1,500 INR (Split with Aisha, Rohan, Priya, Meera)
*   2024-02-05: **Electricity Bill** - Priya paid 2,200 INR (Split with Aisha, Rohan, Priya, Meera)
*   2024-02-10: **Internet Bill** - Aisha paid 1,800 INR (Split with Aisha, Rohan, Priya, Meera)
*   2024-02-15: **Dinner at restaurant** - Rohan paid 3,200 INR (Split with Aisha, Rohan, Priya, Meera) [Duplicate Row 6 Skipped]
*   2024-02-20: **Groceries** - Meera paid 980 INR (Split with Aisha, Rohan, Meera)
*   2024-02-25: **Water bill** - Priya paid 450 INR (Split with Aisha, Rohan, Priya, Meera) [Fuzzy Date Resolved]
*   2024-03-01: **Rent Payment** - Aisha paid 25,000 INR (Split with Aisha, Rohan, Priya, Meera)
*   2024-03-10: **Gas Cylinder** - Meera paid 1,200 INR (Split with Aisha, Rohan, Priya, Meera)
*   2024-03-15: **Movie tickets** - Rohan paid 800 INR (Split with Rohan, Priya)
*   2024-03-20: **Groceries** - Priya paid 500 INR (Split with Aisha, Rohan, Priya) [Negative Amount Corrected]
*   2024-03-28: **House supplies** - Meera paid 1,650 INR (Split with Aisha, Meera)
*   2024-04-15: **Groceries** - Dev paid 2,100 INR (Split with Aisha, Rohan, Dev) [New User Dev Registered]
*   2024-04-16: **Electricity Bill** - Aisha paid 2,400 INR (Split with Aisha, Rohan, Dev, Sam) [New User Sam Registered]
*   2024-04-20: **Team Dinner** - Sam paid 4,500 INR (Split with Aisha, Rohan, Dev, Sam)
*   2024-04-25: **Internet Bill** - Rohan paid 1,800 INR (Split with Aisha, Rohan, Dev, Sam)
*   2024-05-05: **Rent Payment** - Aisha paid 300 USD (Split with Aisha, Rohan, Dev, Sam) [USD Ledger Ingested]

### Settlements Ledger
*   2024-03-05: **Rohan paid Aisha** - Rohan paid Aisha 5,000 INR
*   2024-03-31: **Priya settled with Aisha** - Priya paid Aisha 3,000 INR
