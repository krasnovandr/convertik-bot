import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { BudgetRepository } from "../storage/BudgetRepository";
import type { PurchaseDocument, ConfigurationDocument } from "../types";

vi.mock("../constants", () => ({
  MONTH_LIMIT: 3000,
}));

vi.mock("../utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils")>();
  return {
    ...actual,
    formatTransactionsForTelegram: vi.fn().mockReturnValue("mocked-format-result"),
  };
});

import {
  getDetailsMessage,
  removeLastTransaction,
  handleTransactionMessage,
} from "../EventsHandler";
import { formatTransactionsForTelegram } from "../utils";

const mockFmt = vi.mocked(formatTransactionsForTelegram);

const MOCK_LIMIT = 3000;
const FIXED_DATE = new Date("2026-08-01T10:00:00.000Z"); // August 1, day 1 of 31

const mockTransaction: PurchaseDocument = {
  id: "tx-1",
  userId: "u1",
  userName: "Alice",
  description: "coffee",
  amount: 5.5,
  date: "2026-08-01T08:00:00.000Z",
};

const mockConfig: ConfigurationDocument = {
  id: "cfg-1",
  date: "2026-08-01T00:00:00.000Z",
  estimatedLimit: MOCK_LIMIT,
  actualLimit: MOCK_LIMIT,
};

const mockPrevConfig: ConfigurationDocument = {
  id: "cfg-prev",
  date: "2026-07-01T00:00:00.000Z",
  estimatedLimit: MOCK_LIMIT,
  actualLimit: MOCK_LIMIT,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_DATE);
});

afterEach(() => {
  vi.useRealTimers();
});

// returns prevMonth when called with a date arg, currentMonth when called without
function byMonth<T>(prevMonth: T, currentMonth: T) {
  return vi.fn().mockImplementation((date?: string) => Promise.resolve(date ? prevMonth : currentMonth));
}

function createMockDb(overrides: Partial<Record<string, any>> = {}): BudgetRepository {
  return {
    getTotalCostForMonth: vi.fn().mockResolvedValue(0),
    getTransactionsFromDate: vi.fn().mockResolvedValue([]),
    getConfiguration: vi.fn().mockResolvedValue(null),
    setMonthLimit: vi.fn().mockResolvedValue(undefined),
    addTransaction: vi.fn().mockResolvedValue(mockTransaction),
    removeLastTransaction: vi.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as BudgetRepository;
}

describe("getDetailsMessage", () => {
  it("uses actualLimit from existing config", async () => {
    const db = createMockDb({
      getConfiguration: vi.fn().mockResolvedValue({ ...mockConfig, actualLimit: 4000 }),
      getTotalCostForMonth: vi.fn().mockResolvedValue(1000),
    });

    await getDetailsMessage(db);

    expect(mockFmt).toHaveBeenCalledWith(
      expect.objectContaining({
        actualLimit: 4000,
        estimatedLimit: MOCK_LIMIT,
        actualSpends: 1000,
        budgetAvailable: 3000,
      }),
    );
  });

  it("uses DEFAULT_MONTH_LIMIT when no config and no previous month spend", async () => {
    const db = createMockDb();

    await getDetailsMessage(db);

    expect(mockFmt).toHaveBeenCalledWith(expect.objectContaining({ actualLimit: MOCK_LIMIT }));
  });

  it("carries over savings when previous month was under limit", async () => {
    // prev estimatedLimit 3000, spent 2500 → saved 500 → new limit = 3000 + 500 = 3500
    const db = createMockDb({
      getConfiguration: byMonth(mockPrevConfig, null),
      getTotalCostForMonth: byMonth(2500, 1200),
    });

    await getDetailsMessage(db);

    expect(mockFmt).toHaveBeenCalledWith(expect.objectContaining({ actualLimit: 3500 }));
  });

  it("reduces limit when previous month went over budget", async () => {
    // prev estimatedLimit 3000, spent 3500 → over by 500 → new limit = 3000 - 500 = 2500
    const db = createMockDb({
      getConfiguration: byMonth(mockPrevConfig, null),
      getTotalCostForMonth: byMonth(3500, 500),
    });

    await getDetailsMessage(db);

    expect(mockFmt).toHaveBeenCalledWith(expect.objectContaining({ actualLimit: 2500 }));
  });

  it("month estimated limit was changed since last month new limit correctly calculated", async () => {
    // prev estimatedLimit 2800, spent 2887.59 →  minus 87.59  → new limit = 3000 - 87.59 = 2912.41
    const prevConfigWithCustomLimit = { ...mockPrevConfig, estimatedLimit: 2800 };

    const db = createMockDb({
      getConfiguration: byMonth(prevConfigWithCustomLimit, null),
      getTotalCostForMonth: byMonth(2887.59, 500),
    });

    await getDetailsMessage(db);

    expect(mockFmt).toHaveBeenCalledWith(expect.objectContaining({ actualLimit: 2912.41 }));
  });

  it("uses DEFAULT_MONTH_LIMIT when previous month has spend but no config", async () => {
    // getConfiguration returns null for both months (default), so falls back to DEFAULT_MONTH_LIMIT
    const db = createMockDb({
      getTotalCostForMonth: byMonth(1500, 0),
    });

    await getDetailsMessage(db);

    expect(mockFmt).toHaveBeenCalledWith(expect.objectContaining({ actualLimit: MOCK_LIMIT }));
  });

  it("calculates plannedSpends proportionally to current day", async () => {
    // Day 1 of 31, limit 3000 → planned = 3000 / 31 * 1
    const db = createMockDb({ getConfiguration: vi.fn().mockResolvedValue(mockConfig) });

    await getDetailsMessage(db);

    const expectedDaily = MOCK_LIMIT / 31;
    expect(mockFmt).toHaveBeenCalledWith(
      expect.objectContaining({ dailyBudget: expectedDaily, plannedSpends: expectedDaily }),
    );
  });

  it("passes current month transactions to formatter", async () => {
    const transactions = [mockTransaction];
    const db = createMockDb({
      getConfiguration: vi.fn().mockResolvedValue(mockConfig),
      getTransactionsFromDate: vi.fn().mockResolvedValue(transactions),
    });

    await getDetailsMessage(db);

    expect(mockFmt).toHaveBeenCalledWith(expect.objectContaining({ transactions }));
  });

  it("creates a new month limit config when none exists", async () => {
    const db = createMockDb();

    await getDetailsMessage(db);

    expect(db.setMonthLimit).toHaveBeenCalled();
  });

  it("returns the result of formatTransactionsForTelegram", async () => {
    const db = createMockDb({ getConfiguration: vi.fn().mockResolvedValue(mockConfig) });

    const result = await getDetailsMessage(db);

    expect(result).toBe("mocked-format-result");
  });
});

describe("removeLastTransaction", () => {
  it("delegates to db.removeLastTransaction", async () => {
    const db = createMockDb();

    await removeLastTransaction(db);

    expect(db.removeLastTransaction).toHaveBeenCalledOnce();
  });
});

describe("handleTransactionMessage", () => {
  it.each([
    { text: "",        expectedMessage: "Invalid command format" },
    { text: "abc def", expectedMessage: null },
  ])("returns error for invalid input '$text'", async ({ text, expectedMessage }) => {
    const db = createMockDb();

    const result = await handleTransactionMessage(db, { userId: "u1", userName: "Alice", text });

    expect(result.success).toBe(false);
    if (expectedMessage) expect(result.message).toContain(expectedMessage);
  });

  it.each([
    { text: "50.5 coffee",  amount: 50.5, description: "coffee"    },
    { text: "50 groceries", amount: 50,   description: "groceries" },
    { text: "-20 refund",   amount: -20,  description: "refund"    },
  ])(
    "handles valid input '$text': parses amount and returns success",
    async ({ text, amount, description }) => {
      const db = createMockDb({ getConfiguration: vi.fn().mockResolvedValue(mockConfig) });

      const result = await handleTransactionMessage(db, { userId: "u1", userName: "Alice", text });

      expect(db.addTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "u1", userName: "Alice", amount, description }),
      );
      expect(result.success).toBe(true);
    },
  );

  it("creates new month limit config when none exists and uses DEFAULT_MONTH_LIMIT", async () => {
    const db = createMockDb({
      getConfiguration: vi.fn().mockResolvedValue(null),
      getTotalCostForMonth: vi.fn().mockResolvedValue(0),
    });

    await handleTransactionMessage(db, { userId: "u1", userName: "Alice", text: "100 food" });

    expect(db.setMonthLimit).toHaveBeenCalledWith(expect.any(String), MOCK_LIMIT, MOCK_LIMIT);
  });

  it("uses config actualLimit for available budget calculation", async () => {
    const db = createMockDb({
      getConfiguration: vi.fn().mockResolvedValue({ ...mockConfig, actualLimit: 4000 }),
      getTotalCostForMonth: vi.fn().mockResolvedValue(1000),
    });

    const result = await handleTransactionMessage(db, {
      userId: "u1",
      userName: "Alice",
      text: "100 food",
    });

    expect(result.message).toContain("3000.00"); // available = 4000 - 1000
  });
});
