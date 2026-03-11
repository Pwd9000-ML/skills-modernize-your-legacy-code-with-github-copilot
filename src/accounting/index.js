const readline = require("readline");

// =============================================================================
// Data Layer (equivalent to data.cob — DataProgram)
// =============================================================================

/** @type {number} In-memory account balance, initialized to 1000.00 */
let storageBalance = 1000.0;

/**
 * Resets the storage balance to its initial value.
 * Used by tests to ensure a clean state between test runs.
 */
function resetBalance() {
  storageBalance = 1000.0;
}

/**
 * Data access layer — equivalent to DataProgram (data.cob).
 * Manages in-memory balance storage with READ and WRITE operations.
 * @param {"READ"|"WRITE"} operation - The storage operation to perform.
 * @param {number} [balance] - The balance value to store (required for WRITE).
 * @returns {number|undefined} The current balance when reading, undefined when writing.
 */
function dataProgram(operation, balance) {
  if (operation === "READ") {
    return storageBalance;
  } else if (operation === "WRITE") {
    storageBalance = balance;
  }
}

// =============================================================================
// Operations Layer (equivalent to operations.cob — Operations)
// =============================================================================

/**
 * Displays the current account balance.
 * Reads the balance from the data layer and prints it formatted.
 */
function viewBalance() {
  const balance = dataProgram("READ");
  console.log(`Current balance: ${formatBalance(balance)}`);
}

/**
 * Credits (adds) funds to the account.
 * Prompts the user for an amount, adds it to the current balance,
 * persists the updated balance, and displays the result.
 * @param {readline.Interface} rl - The readline interface for user input.
 */
async function creditAccount(rl) {
  const amount = await askAmount(rl, "Enter credit amount: ");
  let balance = dataProgram("READ");
  balance += amount;
  dataProgram("WRITE", balance);
  console.log(`Amount credited. New balance: ${formatBalance(balance)}`);
}

/**
 * Debits (withdraws) funds from the account.
 * Prompts the user for an amount and checks for sufficient funds.
 * If the balance is greater than or equal to the amount, the debit is applied.
 * Otherwise, displays "Insufficient funds for this debit."
 * @param {readline.Interface} rl - The readline interface for user input.
 */
async function debitAccount(rl) {
  const amount = await askAmount(rl, "Enter debit amount: ");
  const balance = dataProgram("READ");
  if (balance >= amount) {
    const newBalance = balance - amount;
    dataProgram("WRITE", newBalance);
    console.log(`Amount debited. New balance: ${formatBalance(newBalance)}`);
  } else {
    console.log("Insufficient funds for this debit.");
  }
}

// =============================================================================
// Main Program (equivalent to main.cob — MainProgram)
// =============================================================================

/**
 * Main program loop — equivalent to MainProgram (main.cob).
 * Displays a menu with four options (View Balance, Credit, Debit, Exit)
 * and processes user input in a loop until the user chooses to exit.
 */
async function main() {
  const rl = createRL();

  let continueFlag = true;

  while (continueFlag) {
    console.log("--------------------------------");
    console.log("Account Management System");
    console.log("1. View Balance");
    console.log("2. Credit Account");
    console.log("3. Debit Account");
    console.log("4. Exit");
    console.log("--------------------------------");

    const choice = await ask(rl, "Enter your choice (1-4): ");

    switch (choice) {
      case "1":
        viewBalance();
        break;
      case "2":
        await creditAccount(rl);
        break;
      case "3":
        await debitAccount(rl);
        break;
      case "4":
        continueFlag = false;
        break;
      default:
        console.log("Invalid choice, please select 1-4.");
        break;
    }
  }

  console.log("Exiting the program. Goodbye!");
  rl.close();
}

// =============================================================================
// Helpers
// =============================================================================

const lineBuffer = [];
const lineWaiters = [];

/**
 * Prompts the user with a question and returns their input.
 * Reads from a line buffer if input is already available (piped mode),
 * otherwise waits for the next line from stdin.
 * @param {readline.Interface} rl - The readline interface.
 * @param {string} question - The prompt to display.
 * @returns {Promise<string>} The trimmed user input.
 */
function ask(rl, question) {
  process.stdout.write(question);
  if (lineBuffer.length > 0) {
    return Promise.resolve(lineBuffer.shift());
  }
  return new Promise((resolve) => {
    lineWaiters.push(resolve);
  });
}

/**
 * Creates a readline interface with buffered line handling.
 * Lines are queued so that awaited prompts resolve in order,
 * supporting both interactive (TTY) and piped input.
 * @returns {readline.Interface} The configured readline interface.
 */
function createRL() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });
  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (lineWaiters.length > 0) {
      lineWaiters.shift()(trimmed);
    } else {
      lineBuffer.push(trimmed);
    }
  });
  return rl;
}

/**
 * Prompts the user for a monetary amount and parses it.
 * Returns 0 for invalid or negative input. Rounds to two decimal places
 * to match COBOL's PIC 9(6)V99 precision.
 * @param {readline.Interface} rl - The readline interface.
 * @param {string} prompt - The prompt to display.
 * @returns {Promise<number>} The parsed amount (>= 0, 2 decimal places).
 */
async function askAmount(rl, prompt) {
  const input = await ask(rl, prompt);
  const amount = parseFloat(input);
  if (isNaN(amount) || amount < 0) {
    return 0;
  }
  return Math.round(amount * 100) / 100;
}

/**
 * Formats a balance value as a zero-padded string with two decimal places.
 * Mirrors the COBOL PIC 9(6)V99 display format (e.g. "001000.00").
 * @param {number} value - The balance to format.
 * @returns {string} The formatted balance string.
 */
function formatBalance(value) {
  return value.toFixed(2).padStart(9, "0");
}

// =============================================================================
// Entry point
// =============================================================================

if (require.main === module) {
  main();
}

module.exports = {
  dataProgram,
  viewBalance,
  creditAccount,
  debitAccount,
  formatBalance,
  resetBalance,
  main,
};
