import { TransactionDocument } from "./BudgetRepository";

export function formatTransactionsForTelegram(
  transactions: TransactionDocument[],
  available: number,
): string {
  if (transactions.length === 0) {
    return "*No transactions recorded today\\.*";
  }

  let message = "*Today's Transactions\\:*\n\n";

  for (const tx of transactions) {
    const time = new Date(tx.date).toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const escapedTime = escapeMarkdownV2(time);
    const formattedAmount = escapeMarkdownV2(tx.amount.toFixed(2));

    message += `${escapedTime} \\-\\> *${formattedAmount}* PLN  ${tx.description}\n`;
  }

  const escapedAvailable = escapeMarkdownV2(available.toFixed(2));
  message += `\n*Available\\: ${escapedAvailable}* PLN`;

  return message;
}

export function parseBotCommand(inputText: string): { amount: number; description: string } | null {
  if (!inputText) {
    return null;
  }

  const regex = /^(?<amount>-?\d+[\.,]?\d*)\s?(?<description>[a-zA-Z0-9_а-яА-ЯёЁ\s]+)?$/;

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

function escapeMarkdownV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}
