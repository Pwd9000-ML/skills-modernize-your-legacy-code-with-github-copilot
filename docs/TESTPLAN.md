# Student Account Management System — Test Plan

## Overview

This test plan covers all business logic in the COBOL Account Management System. It is intended for validation with business stakeholders and will later serve as the basis for unit and integration tests in the Node.js migration.

**Source files under test:**

- `src/cobol/main.cob` — Menu navigation and input handling
- `src/cobol/operations.cob` — Business logic (view balance, credit, debit)
- `src/cobol/data.cob` — Data storage layer (read/write balance)

---

## 1. Data Layer Tests (DataProgram)

| Test Case ID | Test Case Description | Pre-conditions | Test Steps | Expected Result | Actual Result | Status (Pass/Fail) | Comments |
|---|---|---|---|---|---|---|---|
| DL-001 | Read initial balance | Application just started; no operations performed | 1. Call DataProgram with operation `READ` | Balance returned is `1000.00` | | | Default balance defined as `PIC 9(6)V99 VALUE 1000.00` |
| DL-002 | Write and read back balance | Application just started | 1. Call DataProgram with operation `WRITE` and balance `2500.00` 2. Call DataProgram with operation `READ` | Balance returned is `2500.00` | | | Verifies write persists in working storage |
| DL-003 | Overwrite balance with new value | Balance previously written as `2500.00` | 1. Call DataProgram with operation `WRITE` and balance `0.00` 2. Call DataProgram with operation `READ` | Balance returned is `0.00` | | | Verifies balance can be overwritten |

---

## 2. View Balance Tests (Operations — TOTAL)

| Test Case ID | Test Case Description | Pre-conditions | Test Steps | Expected Result | Actual Result | Status (Pass/Fail) | Comments |
|---|---|---|---|---|---|---|---|
| VB-001 | View initial balance | Application just started; no credits or debits | 1. Select menu option `1` (View Balance) | Display shows `Current balance: 001000.00` | | | Initial balance is 1,000.00 |
| VB-002 | View balance after credit | A credit of `500.00` has been applied | 1. Select menu option `2` and enter `500.00` 2. Select menu option `1` (View Balance) | Display shows `Current balance: 001500.00` | | | Confirms balance reflects credit |
| VB-003 | View balance after debit | Starting balance is `1000.00` | 1. Select menu option `3` and enter `300.00` 2. Select menu option `1` (View Balance) | Display shows `Current balance: 000700.00` | | | Confirms balance reflects debit |
| VB-004 | View balance multiple times without changes | Application just started | 1. Select menu option `1` 2. Select menu option `1` again | Both displays show `Current balance: 001000.00` | | | Balance is unchanged by read operations |

---

## 3. Credit Account Tests (Operations — CREDIT)

| Test Case ID | Test Case Description | Pre-conditions | Test Steps | Expected Result | Actual Result | Status (Pass/Fail) | Comments |
|---|---|---|---|---|---|---|---|
| CR-001 | Credit a standard amount | Starting balance is `1000.00` | 1. Select menu option `2` 2. Enter amount `500.00` | Display shows `Amount credited. New balance: 001500.00` | | | Basic credit operation |
| CR-002 | Credit a small amount (0.01) | Starting balance is `1000.00` | 1. Select menu option `2` 2. Enter amount `0.01` | Display shows `Amount credited. New balance: 001000.01` | | | Minimum decimal precision |
| CR-003 | Multiple sequential credits | Starting balance is `1000.00` | 1. Credit `250.00` 2. Credit `750.00` | After step 1: `001250.00`; After step 2: `002000.00` | | | Credits accumulate correctly |
| CR-004 | Credit to reach maximum balance | Starting balance is `1000.00` | 1. Credit `998999.99` | Display shows `Amount credited. New balance: 999999.99` | | | Maximum value for `PIC 9(6)V99` |
| CR-005 | Credit zero amount | Starting balance is `1000.00` | 1. Select menu option `2` 2. Enter amount `0.00` | Display shows `Amount credited. New balance: 001000.00` | | | Balance unchanged; application does not reject zero credit |

---

## 4. Debit Account Tests (Operations — DEBIT)

| Test Case ID | Test Case Description | Pre-conditions | Test Steps | Expected Result | Actual Result | Status (Pass/Fail) | Comments |
|---|---|---|---|---|---|---|---|
| DB-001 | Debit a standard amount | Starting balance is `1000.00` | 1. Select menu option `3` 2. Enter amount `400.00` | Display shows `Amount debited. New balance: 000600.00` | | | Basic debit operation |
| DB-002 | Debit exact full balance | Starting balance is `1000.00` | 1. Select menu option `3` 2. Enter amount `1000.00` | Display shows `Amount debited. New balance: 000000.00` | | | Balance becomes zero; debit equals balance so condition `>=` passes |
| DB-003 | Debit exceeding balance (insufficient funds) | Starting balance is `1000.00` | 1. Select menu option `3` 2. Enter amount `1000.01` | Display shows `Insufficient funds for this debit.` | | | Business rule: debit rejected when amount > balance |
| DB-004 | Debit from zero balance | Balance is `0.00` (after full debit) | 1. Debit `1000.00` to zero the balance 2. Select menu option `3` 3. Enter amount `0.01` | Display shows `Insufficient funds for this debit.` | | | Cannot debit from empty account |
| DB-005 | Debit zero amount | Starting balance is `1000.00` | 1. Select menu option `3` 2. Enter amount `0.00` | Display shows `Amount debited. New balance: 001000.00` | | | Zero debit passes `>=` check; balance unchanged |
| DB-006 | Multiple sequential debits | Starting balance is `1000.00` | 1. Debit `300.00` 2. Debit `200.00` | After step 1: `000700.00`; After step 2: `000500.00` | | | Debits accumulate correctly |
| DB-007 | Debit after credit | Starting balance is `1000.00` | 1. Credit `500.00` 2. Debit `1200.00` | Credit result: `001500.00`; Debit result: `000300.00` | | | Debit uses updated balance after credit |
| DB-008 | Debit a small amount (0.01) | Starting balance is `1000.00` | 1. Select menu option `3` 2. Enter amount `0.01` | Display shows `Amount debited. New balance: 000999.99` | | | Minimum decimal precision |

---

## 5. Menu Navigation & Input Validation Tests (MainProgram)

| Test Case ID | Test Case Description | Pre-conditions | Test Steps | Expected Result | Actual Result | Status (Pass/Fail) | Comments |
|---|---|---|---|---|---|---|---|
| MN-001 | Select valid menu option (1) | Application running | 1. Enter `1` at menu prompt | View Balance operation executes | | | Valid input |
| MN-002 | Select valid menu option (2) | Application running | 1. Enter `2` at menu prompt | Credit Account operation executes | | | Valid input |
| MN-003 | Select valid menu option (3) | Application running | 1. Enter `3` at menu prompt | Debit Account operation executes | | | Valid input |
| MN-004 | Select Exit (4) | Application running | 1. Enter `4` at menu prompt | Display shows `Exiting the program. Goodbye!` and program terminates | | | Graceful exit |
| MN-005 | Enter invalid menu option | Application running | 1. Enter `5` at menu prompt | Display shows `Invalid choice, please select 1-4.` and menu re-displays | | | Input outside valid range |
| MN-006 | Enter zero as menu option | Application running | 1. Enter `0` at menu prompt | Display shows `Invalid choice, please select 1-4.` and menu re-displays | | | Zero is not a valid option |
| MN-007 | Menu loop continues after operation | Application running | 1. Select option `1` (View Balance) | After displaying balance, menu re-displays for next input | | | Loop continues until Exit |
| MN-008 | Multiple operations in sequence | Application running | 1. View balance 2. Credit `100.00` 3. Debit `50.00` 4. View balance 5. Exit | Final balance is `001050.00`; program exits with goodbye message | | | End-to-end workflow |

---

## 6. Integration / End-to-End Tests

| Test Case ID | Test Case Description | Pre-conditions | Test Steps | Expected Result | Actual Result | Status (Pass/Fail) | Comments |
|---|---|---|---|---|---|---|---|
| E2E-001 | Full lifecycle: view, credit, debit, view, exit | Application just started | 1. View balance → `001000.00` 2. Credit `500.00` → `001500.00` 3. Debit `200.00` → `001300.00` 4. View balance → `001300.00` 5. Exit | All balances correct; program exits cleanly | | | Happy path end-to-end |
| E2E-002 | Credit then insufficient debit | Application just started | 1. Credit `100.00` → `001100.00` 2. Debit `1200.00` → `Insufficient funds` 3. View balance → `001100.00` | Balance unchanged after failed debit | | | Failed debit must not alter balance |
| E2E-003 | Drain account to zero then attempt debit | Application just started | 1. Debit `1000.00` → `000000.00` 2. Debit `1.00` → `Insufficient funds` 3. Credit `50.00` → `000050.00` 4. View balance → `000050.00` | Account recovers after re-credit | | | Zero balance recovery scenario |
| E2E-004 | Invalid input followed by valid operations | Application just started | 1. Enter `9` → invalid message 2. Enter `0` → invalid message 3. View balance → `001000.00` 4. Exit | Invalid inputs don't affect state; valid operations succeed | | | Error handling does not corrupt state |
