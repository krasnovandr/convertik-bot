import { BudgetRepository } from "./storage/BudgetRepository";
import {
  formatTransactionsForTelegram,
  currentMonthDate,
  previousMonthDate,
  parseBotCommand,
} from "./utils";
import { MONTH_LIMIT as DEFAULT_MONTH_LIMIT } from "./constants";
import { AddTransactionMessageInput, AddTransactionResult } from "./types";

export async function getDetailsMessage(db: BudgetRepository) {
  const currentMonthTotal = await db.getTotalCostForMonth();
  const currentMonthTransactions = await db.getTransactionsFromDate();

  const monthLimit = await ensureCurrentMonthLimit(db);

  const available = monthLimit - currentMonthTotal;

  return formatTransactionsForTelegram(currentMonthTransactions, available);
}

export async function handleTransactionMessage(
  db: BudgetRepository,
  input: AddTransactionMessageInput,
): Promise<AddTransactionResult> {
  const parsed = parseBotCommand(input.text);

  if (!parsed) {
    return {
      success: false,
      message: "Invalid command format Please use format: amount description (-5.5 xyz123)",
    };
  }

  const monthLimit = await ensureCurrentMonthLimit(db);

  await db.addTransaction({
    userId: input.userId,
    userName: input.userName,
    description: parsed.description,
    amount: parsed.amount,
  });

  const totalSpends = await db.getTotalCostForMonth();
  const available = monthLimit - totalSpends;

  return {
    success: true,
    message: `Total for current month: ${totalSpends.toFixed(2)}\nAvailable: ${available.toFixed(2)}`,
  };
}

async function ensureCurrentMonthLimit(db: BudgetRepository): Promise<number> {
  const currentMonthConfig = await db.getConfiguration();

  if (currentMonthConfig) {
    return currentMonthConfig.maxAmount;
  }

  const totalForPreviousMonth = await db.getTotalCostForMonth(previousMonthDate());
  let newMonthLimit = DEFAULT_MONTH_LIMIT;

  if (totalForPreviousMonth !== 0) {
    const available = DEFAULT_MONTH_LIMIT - totalForPreviousMonth;
    newMonthLimit = DEFAULT_MONTH_LIMIT + available;
  }

  await db.setMonthLimit(currentMonthDate(), newMonthLimit);

  return newMonthLimit;
}
