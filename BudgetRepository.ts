import { CosmosClient, Container, Database, BulkOperationType } from "@azure/cosmos";
import { InvocationContext } from "@azure/functions";

export interface TransactionInput {
  userId: string;
  description: string;
  amount: number;
}

export interface TransactionDocument extends TransactionInput {
  id: string;
  date: string;
}
export class BudgetRepository {
  private client: CosmosClient;
  private databaseId: string;
  private containerId: string;
  private container: Container | null = null;
  private context: InvocationContext | null = null;

  constructor(connectionString: string, databaseId = "home-budget", containerId = "purchases") {
    this.client = new CosmosClient(connectionString);
    this.databaseId = databaseId;
    this.containerId = containerId;
    this.context = null;
  }

  async init(context: InvocationContext): Promise<void> {
    const { database } = await this.client.databases.createIfNotExists({
      id: this.databaseId,
    });

    const { container } = await database.containers.createIfNotExists({
      id: this.containerId,
      partitionKey: "/userId",
    });

    this.context = context;
    this.container = container;
  }

  async addTransaction(transaction: TransactionInput): Promise<TransactionDocument> {
    if (!this.container) {
      throw new Error("Repository not initialized. Call init() first.");
    }

    const document: TransactionDocument = {
      id: crypto.randomUUID(),
      userId: transaction.userId,
      description: transaction.description,
      amount: Number(transaction.amount),
      date: new Date().toISOString(),
    };

    const { resource } = await this.container.items.create<TransactionDocument>(document);

    if (!resource) {
      throw new Error("Failed to create transaction document.");
    }

    return resource;
  }

  async getTransactionsForToday(userId: string): Promise<TransactionDocument[]> {
    if (!this.container) {
      throw new Error("Repository not initialized. Call init() first.");
    }
    const now = new Date();

    const startOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    ).toISOString();

    const querySpec = {
      query: `
        SELECT * 
        FROM c 
        WHERE c.date >= @startOfToday
        ORDER BY c.date DESC
      `,
      parameters: [{ name: "@startOfToday", value: startOfToday }],
    };

    const { resources } = await this.container.items
      .query<TransactionDocument>(querySpec, { partitionKey: userId })
      .fetchAll();

    return resources;
  }

  async clearHistory(): Promise<void> {
    if (!this.container) {
      throw new Error("Repository not initialized. Call init() first.");
    }

    const startOfMonth = this.getStartOfCurrentMonth();

    const querySpec = {
      query: "SELECT c.id, c.userId FROM c WHERE c.date >= @startOfMonth",
      parameters: [{ name: "@startOfMonth", value: startOfMonth }],
    };

    const { resources: transactionsToDelete } = await this.container.items
      .query<Pick<TransactionDocument, "id" | "userId">>(querySpec)
      .fetchAll();

    if (transactionsToDelete.length === 0) {
      return;
    }

    const deleteOperations = transactionsToDelete.map((doc) => ({
      operationType: BulkOperationType.Delete,
      id: doc.id,
      partitionKey: doc.userId,
    }));

    const result = await this.container.items.executeBulkOperations(deleteOperations);
  }

  async getTotalCostForCurrentMonth(): Promise<number> {
    if (!this.container) {
      throw new Error("Repository not initialized. Call init() first.");
    }

    const startOfMonth = this.getStartOfCurrentMonth();

    const querySpec = {
      query: `
        SELECT VALUE SUM(c.amount) 
        FROM c 
        WHERE c.date >= @startOfMonth
      `,
      parameters: [{ name: "@startOfMonth", value: startOfMonth }],
    };

    const { resources } = await this.container.items.query<number>(querySpec).fetchAll();

    const totalPerMonth = resources[0] || 0;
    return totalPerMonth;
  }

  getStartOfCurrentMonth(): string {
    const now = new Date();
    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    ).toISOString();

    return startOfMonth;
  }
}
