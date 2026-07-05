// db.ts
import { InvocationContext } from "@azure/functions/types/InvocationContext";
import { BudgetRepository } from "./BudgetRepository";

const connectionString = process.env.COSMOS_CONNECTION_STRING;

if (!connectionString) {
  throw new Error("Missing COSMOS_CONNECTION_STRING environment variable.");
}

export const budgetRepository = new BudgetRepository(connectionString);

let isInitialized = false;

export async function getInitializedRepository(context: InvocationContext): Promise<BudgetRepository> {
  if (!isInitialized) {
    await budgetRepository.init(context);
    isInitialized = true;
  }
  return budgetRepository;
}
