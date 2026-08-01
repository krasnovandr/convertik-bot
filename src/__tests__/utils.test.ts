import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { DetailsSummaryResult, PurchaseDocument } from "../types";

import {
  formatTransactionsForTelegram,
  parseBotCommand,
  currentMonthDate,
  previousMonthDate,
} from "../utils";

const baseDetails: DetailsSummaryResult = {
  transactions: [],
  actualLimit: 3000,
  estimatedLimit: 3000,
  budgetAvailable: 2000,
  dailyBudget: 100,
  plannedSpends: 500,
  actualSpends: 1000,
};

function makeTransaction(overrides: Partial<PurchaseDocument> = {}): PurchaseDocument {
  return {
    id: "1",
    userId: "u1",
    userName: "Alice",
    description: "coffee",
    amount: 5,
    date: "2026-08-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("formatTransactionsForTelegram", () => {
  it("returns 'No transactions recorded' when transactions list is empty", () => {
    const result = formatTransactionsForTelegram(baseDetails) as any;
    expect(result.text).toContain("No transactions recorded");
  });

  it("includes key financial fields in output", () => {
    const result = formatTransactionsForTelegram({
      ...baseDetails,
      transactions: [makeTransaction()],
    }) as any;

    expect(result.text).toContain("3000.00"); // actualLimit / estimatedLimit
    expect(result.text).toContain("2000.00"); // budgetAvailable
    expect(result.text).toContain("1000.00"); // actualSpends
    expect(result.text).toContain("500.00");  // plannedSpends
  });

  it("shows 🟢 when under budget (planned > actual)", () => {
    const result = formatTransactionsForTelegram({
      ...baseDetails,
      transactions: [makeTransaction()],
      plannedSpends: 500,
      actualSpends: 300,
    }) as any;

    expect(result.text).toContain("🟢");
  });

  it("shows 🔴 when over budget (actual > planned)", () => {
    const result = formatTransactionsForTelegram({
      ...baseDetails,
      transactions: [makeTransaction()],
      plannedSpends: 200,
      actualSpends: 500,
    }) as any;

    expect(result.text).toContain("🔴");
  });

  it("sorts transactions by date ascending regardless of input order", () => {
    const transactions: PurchaseDocument[] = [
      makeTransaction({ id: "2", description: "dinner", date: "2026-08-01T18:00:00.000Z" }),
      makeTransaction({ id: "1", description: "coffee", date: "2026-08-01T08:00:00.000Z" }),
    ];
    const result = formatTransactionsForTelegram({ ...baseDetails, transactions }) as any;

    expect(result.text.indexOf("coffee")).toBeLessThan(result.text.indexOf("dinner"));
  });

  it("formats transaction date label as 'Mon DD'", () => {
    // 2026-08-01T10:00:00Z = 12:00 Warsaw time → date label "Aug 01"
    const result = formatTransactionsForTelegram({
      ...baseDetails,
      transactions: [makeTransaction({ date: "2026-08-01T10:00:00.000Z" })],
    }) as any;

    expect(result.text).toContain("Aug 01");
  });

  it("formats transaction time in HH:MM using Warsaw timezone", () => {
    // 2026-08-01T10:00:00Z = 12:00 Warsaw time (UTC+2 in summer)
    const result = formatTransactionsForTelegram({
      ...baseDetails,
      transactions: [makeTransaction({ date: "2026-08-01T10:00:00.000Z" })],
    }) as any;

    expect(result.text).toContain("12:00");
  });

  it("emits a separate date header for each distinct day", () => {
    const transactions: PurchaseDocument[] = [
      makeTransaction({ id: "1", description: "breakfast", date: "2026-08-01T08:00:00.000Z" }),
      makeTransaction({ id: "2", description: "lunch",     date: "2026-08-02T10:00:00.000Z" }),
    ];
    const result = formatTransactionsForTelegram({ ...baseDetails, transactions }) as any;

    expect(result.text).toContain("Aug 01");
    expect(result.text).toContain("Aug 02");
  });
});

describe("parseBotCommand", () => {
  it.each([
    { input: "50 coffee",   amount: 50,   description: "coffee" },
    { input: "50.5 coffee", amount: 50.5, description: "coffee" },
    { input: "50,5 coffee", amount: 50.5, description: "coffee" }, // comma decimal separator
    { input: "-20 refund",  amount: -20,  description: "refund" },
  ])("parses '$input' → amount $amount, description '$description'", ({ input, amount, description }) => {
    const result = parseBotCommand(input);

    expect(result).not.toBeNull();
    expect(result!.amount).toBe(amount);
    expect(result!.description.trim()).toBe(description);
  });

  it.each(["", "abc def", "abc"])("returns null for invalid input '%s'", (input) => {
    expect(parseBotCommand(input)).toBeNull();
  });
});

describe("currentMonthDate", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("returns ISO date for the first of the current month at midnight UTC", () => {
    vi.setSystemTime(new Date("2026-08-15T10:00:00.000Z"));
    expect(currentMonthDate()).toBe("2026-08-01T00:00:00.000Z");
  });
});

describe("previousMonthDate", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("returns ISO date for the first of the previous month at midnight UTC", () => {
    vi.setSystemTime(new Date("2026-08-15T10:00:00.000Z"));
    expect(previousMonthDate()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("rolls back to December of the previous year when current month is January", () => {
    vi.setSystemTime(new Date("2026-01-15T10:00:00.000Z"));
    expect(previousMonthDate()).toBe("2025-12-01T00:00:00.000Z");
  });
});
