const {
  dataProgram,
  viewBalance,
  creditAccount,
  debitAccount,
  formatBalance,
  resetBalance,
  main,
} = require("./index");

// ---------------------------------------------------------------------------
// Helper: capture console.log output during a function call
// ---------------------------------------------------------------------------
function captureLog(fn) {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(" "));
  fn();
  console.log = originalLog;
  return logs;
}

// ---------------------------------------------------------------------------
// Helper: create a fake readline interface that returns pre-queued answers
// ---------------------------------------------------------------------------
function fakeRL(answers) {
  const queue = [...answers];
  return {
    question(prompt, cb) {
      cb(queue.shift() || "0");
    },
    close() {},
    // expose ask-compatible interface via the stubbed question method
  };
}

// We also need to stub the `ask` helper used inside creditAccount/debitAccount.
// Since creditAccount and debitAccount call the module-level `ask`, we intercept
// process.stdout.write and provide answers through `askAmount` indirectly.
// Instead, we directly test the business logic by calling dataProgram, then
// simulating what creditAccount / debitAccount do internally.

// ---------------------------------------------------------------------------
// Reset balance before each test to ensure isolation
// ---------------------------------------------------------------------------
beforeEach(() => {
  resetBalance();
});

// ===========================================================================
// 1. Data Layer Tests (DataProgram) — TESTPLAN Section 1
// ===========================================================================
describe("Data Layer Tests (DataProgram)", () => {
  /**
   * DL-001: Read initial balance
   * Verifies that the data layer returns the default balance of 1000.00
   * when no operations have been performed.
   */
  test("DL-001: Read initial balance", () => {
    const balance = dataProgram("READ");
    expect(balance).toBe(1000.0);
  });

  /**
   * DL-002: Write and read back balance
   * Verifies that writing a balance of 2500.00 persists in working storage
   * and can be read back correctly.
   */
  test("DL-002: Write and read back balance", () => {
    dataProgram("WRITE", 2500.0);
    const balance = dataProgram("READ");
    expect(balance).toBe(2500.0);
  });

  /**
   * DL-003: Overwrite balance with new value
   * Verifies that a previously written balance can be overwritten with 0.00
   * and the new value is returned on subsequent reads.
   */
  test("DL-003: Overwrite balance with new value", () => {
    dataProgram("WRITE", 2500.0);
    dataProgram("WRITE", 0.0);
    const balance = dataProgram("READ");
    expect(balance).toBe(0.0);
  });
});

// ===========================================================================
// 2. View Balance Tests (Operations — TOTAL) — TESTPLAN Section 2
// ===========================================================================
describe("View Balance Tests", () => {
  /**
   * VB-001: View initial balance
   * Verifies that viewing the balance at startup displays "Current balance: 001000.00".
   */
  test("VB-001: View initial balance", () => {
    const logs = captureLog(() => viewBalance());
    expect(logs[0]).toBe("Current balance: 001000.00");
  });

  /**
   * VB-002: View balance after credit
   * After crediting 500.00, the displayed balance should be 001500.00.
   */
  test("VB-002: View balance after credit", () => {
    dataProgram("WRITE", 1500.0);
    const logs = captureLog(() => viewBalance());
    expect(logs[0]).toBe("Current balance: 001500.00");
  });

  /**
   * VB-003: View balance after debit
   * After debiting 300.00 from 1000.00, the displayed balance should be 000700.00.
   */
  test("VB-003: View balance after debit", () => {
    dataProgram("WRITE", 700.0);
    const logs = captureLog(() => viewBalance());
    expect(logs[0]).toBe("Current balance: 000700.00");
  });

  /**
   * VB-004: View balance multiple times without changes
   * Reading the balance twice should return the same value each time.
   * Read operations must not alter the stored balance.
   */
  test("VB-004: View balance multiple times without changes", () => {
    const logs1 = captureLog(() => viewBalance());
    const logs2 = captureLog(() => viewBalance());
    expect(logs1[0]).toBe("Current balance: 001000.00");
    expect(logs2[0]).toBe("Current balance: 001000.00");
  });
});

// ===========================================================================
// 3. Credit Account Tests (Operations — CREDIT) — TESTPLAN Section 3
// ===========================================================================
describe("Credit Account Tests", () => {
  /**
   * CR-001: Credit a standard amount
   * Crediting 500.00 to a 1000.00 balance should result in 1500.00.
   */
  test("CR-001: Credit a standard amount", () => {
    let balance = dataProgram("READ");
    balance += 500.0;
    dataProgram("WRITE", balance);
    expect(dataProgram("READ")).toBe(1500.0);
    expect(formatBalance(balance)).toBe("001500.00");
  });

  /**
   * CR-002: Credit a small amount (0.01)
   * Crediting the minimum decimal unit to verify precision is preserved.
   */
  test("CR-002: Credit a small amount (0.01)", () => {
    let balance = dataProgram("READ");
    balance += 0.01;
    balance = Math.round(balance * 100) / 100;
    dataProgram("WRITE", balance);
    expect(dataProgram("READ")).toBe(1000.01);
    expect(formatBalance(balance)).toBe("001000.01");
  });

  /**
   * CR-003: Multiple sequential credits
   * Two sequential credits (250.00 then 750.00) should accumulate correctly,
   * resulting in 1250.00 after the first and 2000.00 after the second.
   */
  test("CR-003: Multiple sequential credits", () => {
    let balance = dataProgram("READ");
    balance += 250.0;
    dataProgram("WRITE", balance);
    expect(dataProgram("READ")).toBe(1250.0);

    balance = dataProgram("READ");
    balance += 750.0;
    dataProgram("WRITE", balance);
    expect(dataProgram("READ")).toBe(2000.0);
  });

  /**
   * CR-004: Credit to reach maximum balance
   * Crediting 998999.99 to 1000.00 should reach the maximum PIC 9(6)V99
   * value of 999999.99.
   */
  test("CR-004: Credit to reach maximum balance", () => {
    let balance = dataProgram("READ");
    balance += 998999.99;
    balance = Math.round(balance * 100) / 100;
    dataProgram("WRITE", balance);
    expect(dataProgram("READ")).toBe(999999.99);
    expect(formatBalance(balance)).toBe("999999.99");
  });

  /**
   * CR-005: Credit zero amount
   * Crediting 0.00 should leave the balance unchanged at 1000.00.
   * The application does not reject zero credits.
   */
  test("CR-005: Credit zero amount", () => {
    let balance = dataProgram("READ");
    balance += 0.0;
    dataProgram("WRITE", balance);
    expect(dataProgram("READ")).toBe(1000.0);
    expect(formatBalance(balance)).toBe("001000.00");
  });
});

// ===========================================================================
// 4. Debit Account Tests (Operations — DEBIT) — TESTPLAN Section 4
// ===========================================================================
describe("Debit Account Tests", () => {
  /**
   * DB-001: Debit a standard amount
   * Debiting 400.00 from 1000.00 should result in 600.00.
   */
  test("DB-001: Debit a standard amount", () => {
    const balance = dataProgram("READ");
    const amount = 400.0;
    expect(balance >= amount).toBe(true);
    const newBalance = balance - amount;
    dataProgram("WRITE", newBalance);
    expect(dataProgram("READ")).toBe(600.0);
    expect(formatBalance(newBalance)).toBe("000600.00");
  });

  /**
   * DB-002: Debit exact full balance
   * Debiting 1000.00 from 1000.00 should result in 0.00.
   * The condition balance >= amount passes when they are equal.
   */
  test("DB-002: Debit exact full balance", () => {
    const balance = dataProgram("READ");
    const amount = 1000.0;
    expect(balance >= amount).toBe(true);
    const newBalance = balance - amount;
    dataProgram("WRITE", newBalance);
    expect(dataProgram("READ")).toBe(0.0);
    expect(formatBalance(newBalance)).toBe("000000.00");
  });

  /**
   * DB-003: Debit exceeding balance (insufficient funds)
   * Debiting 1000.01 from 1000.00 should be rejected.
   * The balance must remain unchanged at 1000.00.
   */
  test("DB-003: Debit exceeding balance (insufficient funds)", () => {
    const balance = dataProgram("READ");
    const amount = 1000.01;
    expect(balance >= amount).toBe(false);
    // Balance should not change
    expect(dataProgram("READ")).toBe(1000.0);
  });

  /**
   * DB-004: Debit from zero balance
   * After draining the account to 0.00, any debit (even 0.01) should be
   * rejected as insufficient funds.
   */
  test("DB-004: Debit from zero balance", () => {
    dataProgram("WRITE", 0.0);
    const balance = dataProgram("READ");
    const amount = 0.01;
    expect(balance >= amount).toBe(false);
    expect(dataProgram("READ")).toBe(0.0);
  });

  /**
   * DB-005: Debit zero amount
   * Debiting 0.00 passes the >= check and should leave the balance at 1000.00.
   */
  test("DB-005: Debit zero amount", () => {
    const balance = dataProgram("READ");
    const amount = 0.0;
    expect(balance >= amount).toBe(true);
    const newBalance = balance - amount;
    dataProgram("WRITE", newBalance);
    expect(dataProgram("READ")).toBe(1000.0);
  });

  /**
   * DB-006: Multiple sequential debits
   * Two sequential debits (300.00 then 200.00) should reduce the balance
   * from 1000.00 → 700.00 → 500.00.
   */
  test("DB-006: Multiple sequential debits", () => {
    let balance = dataProgram("READ");
    balance -= 300.0;
    dataProgram("WRITE", balance);
    expect(dataProgram("READ")).toBe(700.0);

    balance = dataProgram("READ");
    balance -= 200.0;
    dataProgram("WRITE", balance);
    expect(dataProgram("READ")).toBe(500.0);
  });

  /**
   * DB-007: Debit after credit
   * Credit 500.00 first (balance → 1500.00), then debit 1200.00 (balance → 300.00).
   * The debit should use the updated balance after the credit.
   */
  test("DB-007: Debit after credit", () => {
    let balance = dataProgram("READ");
    balance += 500.0;
    dataProgram("WRITE", balance);
    expect(dataProgram("READ")).toBe(1500.0);

    balance = dataProgram("READ");
    const amount = 1200.0;
    expect(balance >= amount).toBe(true);
    balance -= amount;
    dataProgram("WRITE", balance);
    expect(dataProgram("READ")).toBe(300.0);
  });

  /**
   * DB-008: Debit a small amount (0.01)
   * Debiting the minimum decimal unit to verify precision is preserved.
   * 1000.00 - 0.01 = 999.99.
   */
  test("DB-008: Debit a small amount (0.01)", () => {
    const balance = dataProgram("READ");
    const amount = 0.01;
    expect(balance >= amount).toBe(true);
    const newBalance = Math.round((balance - amount) * 100) / 100;
    dataProgram("WRITE", newBalance);
    expect(dataProgram("READ")).toBe(999.99);
    expect(formatBalance(newBalance)).toBe("000999.99");
  });
});

// ===========================================================================
// 5. Menu Navigation & Input Validation Tests — TESTPLAN Section 5
// ===========================================================================
describe("Menu Navigation & Input Validation Tests", () => {
  const { execSync } = require("child_process");
  const appPath = require("path").resolve(__dirname, "index.js");

  /**
   * Helper: run the app as a child process with piped input lines.
   * Returns the stdout output as a string.
   */
  function runApp(inputLines) {
    const input = inputLines.join("\n") + "\n";
    return execSync(`node "${appPath}"`, {
      input,
      encoding: "utf-8",
      timeout: 5000,
    });
  }

  /**
   * MN-001 / MN-002 / MN-003: Valid menu options trigger correct operations.
   * Options 1, 2, 3 should invoke view balance, credit, and debit respectively.
   * Tested via the main() function with piped input sequences.
   */

  /**
   * MN-004: Select Exit (4)
   * Entering 4 should display "Exiting the program. Goodbye!" and terminate.
   */
  test("MN-004: Select Exit displays goodbye message", () => {
    const output = runApp(["4"]);
    expect(output).toContain("Exiting the program. Goodbye!");
  });

  /**
   * MN-005: Enter invalid menu option (5)
   * Should display "Invalid choice, please select 1-4." and re-prompt.
   */
  test("MN-005: Invalid menu option shows error message", () => {
    const output = runApp(["5", "4"]);
    expect(output).toContain("Invalid choice, please select 1-4.");
    expect(output).toContain("Exiting the program. Goodbye!");
  });

  /**
   * MN-006: Enter zero as menu option
   * Zero is not a valid option, should display the invalid choice message.
   */
  test("MN-006: Zero as menu option shows error message", () => {
    const output = runApp(["0", "4"]);
    expect(output).toContain("Invalid choice, please select 1-4.");
  });

  /**
   * MN-007: Menu loop continues after operation
   * After viewing the balance, the menu should re-display for the next input.
   */
  test("MN-007: Menu loop continues after operation", () => {
    const output = runApp(["1", "4"]);
    const menuCount = (output.match(/Account Management System/g) || []).length;
    expect(menuCount).toBe(2);
  });

  /**
   * MN-008: Multiple operations in sequence
   * View balance → Credit 100.00 → Debit 50.00 → View balance → Exit.
   * Final balance should be 1050.00.
   */
  test("MN-008: Multiple operations in sequence", () => {
    const output = runApp(["1", "2", "100", "3", "50", "1", "4"]);
    expect(output).toContain("Current balance: 001000.00");
    expect(output).toContain("Amount credited. New balance: 001100.00");
    expect(output).toContain("Amount debited. New balance: 001050.00");
    expect(output).toContain("Current balance: 001050.00");
    expect(output).toContain("Exiting the program. Goodbye!");
  });
});

// ===========================================================================
// 6. Integration / End-to-End Tests — TESTPLAN Section 6
// ===========================================================================
describe("Integration / End-to-End Tests", () => {
  const { execSync } = require("child_process");
  const appPath = require("path").resolve(__dirname, "index.js");

  /**
   * Helper: run the app as a child process with piped input lines.
   */
  function runApp(inputLines) {
    const input = inputLines.join("\n") + "\n";
    return execSync(`node "${appPath}"`, {
      input,
      encoding: "utf-8",
      timeout: 5000,
    });
  }

  /**
   * E2E-001: Full lifecycle — view, credit, debit, view, exit
   * Happy path: 1000.00 → view → credit 500 → 1500.00 → debit 200 → 1300.00 → view → exit.
   */
  test("E2E-001: Full lifecycle: view, credit, debit, view, exit", () => {
    const output = runApp(["1", "2", "500", "3", "200", "1", "4"]);
    expect(output).toContain("Current balance: 001000.00");
    expect(output).toContain("Amount credited. New balance: 001500.00");
    expect(output).toContain("Amount debited. New balance: 001300.00");
    expect(output).toContain("Current balance: 001300.00");
    expect(output).toContain("Exiting the program. Goodbye!");
  });

  /**
   * E2E-002: Credit then insufficient debit
   * Credit 100 → 1100.00, then attempt debit 1200 → insufficient funds.
   * Balance should remain 1100.00 after the failed debit.
   */
  test("E2E-002: Credit then insufficient debit", () => {
    const output = runApp(["2", "100", "3", "1200", "1", "4"]);
    expect(output).toContain("Amount credited. New balance: 001100.00");
    expect(output).toContain("Insufficient funds for this debit.");
    expect(output).toContain("Current balance: 001100.00");
  });

  /**
   * E2E-003: Drain account to zero then attempt debit, then recover with credit
   * Debit 1000 → 0.00, debit 1 → insufficient funds, credit 50 → 50.00.
   */
  test("E2E-003: Drain account to zero then attempt debit", () => {
    const output = runApp(["3", "1000", "3", "1", "2", "50", "1", "4"]);
    expect(output).toContain("Amount debited. New balance: 000000.00");
    expect(output).toContain("Insufficient funds for this debit.");
    expect(output).toContain("Amount credited. New balance: 000050.00");
    expect(output).toContain("Current balance: 000050.00");
  });

  /**
   * E2E-004: Invalid input followed by valid operations
   * Enter 9 → invalid, enter 0 → invalid, view balance → 1000.00, exit.
   * Invalid inputs must not affect account state.
   */
  test("E2E-004: Invalid input followed by valid operations", () => {
    const output = runApp(["9", "0", "1", "4"]);
    const invalidCount = (
      output.match(/Invalid choice, please select 1-4\./g) || []
    ).length;
    expect(invalidCount).toBe(2);
    expect(output).toContain("Current balance: 001000.00");
    expect(output).toContain("Exiting the program. Goodbye!");
  });
});

// ===========================================================================
// Format Balance helper — TESTPLAN related
// ===========================================================================
describe("Format Balance Helper", () => {
  /**
   * Verifies the COBOL PIC 9(6)V99 display format is correctly mirrored:
   * values are zero-padded to 9 characters with 2 decimal places.
   */
  test("formats 1000 as 001000.00", () => {
    expect(formatBalance(1000)).toBe("001000.00");
  });

  test("formats 0 as 000000.00", () => {
    expect(formatBalance(0)).toBe("000000.00");
  });

  test("formats 999999.99 as 999999.99", () => {
    expect(formatBalance(999999.99)).toBe("999999.99");
  });

  test("formats 0.01 as 000000.01", () => {
    expect(formatBalance(0.01)).toBe("000000.01");
  });
});
