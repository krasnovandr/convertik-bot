import { BudgetRepository } from "./BudgetRepository";

const connectionString = process.env.COSMOS_CONNECTION_STRING;

if (!connectionString) {
  throw new Error("Missing COSMOS_CONNECTION_STRING environment variable.");
}

export const budgetRepository = new BudgetRepository(connectionString);

let isInitialized = false;

export async function getInitializedRepository(): Promise<BudgetRepository> {
  if (!isInitialized) {
    await budgetRepository.init();
    isInitialized = true;
  }
  return budgetRepository;
}
