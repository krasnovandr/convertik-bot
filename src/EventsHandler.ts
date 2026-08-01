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
  const [actualSpends, currentMonthTransactions, actualLimit] = await Promise.all([
    db.getTotalCostForMonth(),
    db.getTransactionsFromDate(),
    ensureCurrentMonthLimit(db),
  ]);
  const budgetAvailable = actualLimit - actualSpends;
  const { amountPerDay: dailyBudget, plannedSpends: estimatedSpends } = calculatePlannedSpends(actualLimit);

  return formatTransactionsForTelegram({
    transactions: currentMonthTransactions,
    actualLimit,
    estimatedLimit: DEFAULT_MONTH_LIMIT,
    budgetAvailable,
    plannedSpends: estimatedSpends,
    dailyBudget,
    actualSpends,
  });
}

function calculatePlannedSpends(monthLimit: number) {
  const now = new Date();
  const currentDay = now.getDate();
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const amountPerDay = monthLimit / totalDaysInMonth;
  const plannedSpends = amountPerDay * currentDay;

  return { amountPerDay, plannedSpends };
}

export async function removeLastTransaction(db: BudgetRepository): Promise<void> {
  await db.removeLastTransaction();
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
    return currentMonthConfig.actualLimit;
  }

  const prevDate = previousMonthDate();
  const totalForPreviousMonth = await db.getTotalCostForMonth(prevDate);
  let newMonthLimit = DEFAULT_MONTH_LIMIT;

  if (totalForPreviousMonth !== 0) {
    const previousMonthConfig = await db.getConfiguration(prevDate);
    if (previousMonthConfig) {
      const available = previousMonthConfig.estimatedLimit - totalForPreviousMonth;
      newMonthLimit = DEFAULT_MONTH_LIMIT + available;
    }
  }

  await db.setMonthLimit(currentMonthDate(), DEFAULT_MONTH_LIMIT, newMonthLimit);

  return newMonthLimit;
}
