import { fmt, bold, join, FmtString } from "telegraf/format";
import { DetailsSummaryResult } from "./types";

export function formatTransactionsForTelegram(details: DetailsSummaryResult): FmtString {
  const { transactions, monthLimit, budgetAvailable, plannedSpends, actualSpends } = details;

  if (transactions.length === 0) {
    return fmt`No transactions recorded`;
  }

  const lines: FmtString[] = [fmt`Month Transactions:`];

  let lastDateLabel: string | null = null;

  for (const tx of transactions) {
    const txDate = new Date(tx.date);

    const dateLabel = txDate.toLocaleDateString("en", {
      day: "2-digit",
      month: "short",
      timeZone: "Europe/Warsaw",
    });

    if (dateLabel !== lastDateLabel) {
      lines.push(fmt``);
      lines.push(fmt`${bold(dateLabel)}`);
      lastDateLabel = dateLabel;
    }

    const time = txDate.toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Warsaw",
    });

    lines.push(
      fmt`${time} -> ${tx.userName ?? ""} ${bold(tx.amount.toFixed(2))} ${tx.description ?? ""}`,
    );
  }

  lines.push(fmt``);
  lines.push(fmt`${bold(`Month Limit:`)} ${monthLimit.toFixed(2)}`);
  lines.push(fmt`${bold(`Available:`)} ${budgetAvailable.toFixed(2)}`);
  lines.push(fmt`${bold(`Estimated Spends:`)} ${plannedSpends.toFixed(2)}`);
  lines.push(fmt`${bold(`Actual Spends:`)} ${actualSpends.toFixed(2)}`);

  const difference = plannedSpends - actualSpends;
  const differenceIndicator = difference >= 0 ? "🟢" : "🔴";
  lines.push(fmt`${bold(`Difference:`)} ${differenceIndicator} ${difference.toFixed(2)}`);

  return join(lines, "\n");
}

export function parseBotCommand(inputText: string): { amount: number; description: string } | null {
  if (!inputText) {
    return null;
  }

  const regex = /^(?<amount>-?\d+[\.,]?\d*)\s*(?<description>[a-zA-Z0-9_а-яА-ЯёЁ\s]+)?$/;

  const match = inputText.trim().match(regex);

  if (!match) {
    return null;
  }

  const { amount, description } = match.groups as { amount: string; description: string };

  return {
    amount: parseFloat(amount.replace(",", ".")),
    description: description,
  };
}

export function currentMonthDate(): string {
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  return startOfMonth;
}

export function previousMonthDate(): string {
  const now = new Date();
  const startOfPreviousMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  ).toISOString();

  return startOfPreviousMonth;
}
