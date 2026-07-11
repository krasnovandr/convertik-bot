import { CosmosClient, Container, BulkOperationType } from "@azure/cosmos";
import { currentMonthDate } from "../utils";
import { ConfigurationDocument, PurchaseDocument, PurchaseInput } from "../types";

export class BudgetRepository {
  private client: CosmosClient;
  private databaseId: string;
  private purchases: Container | null = null;
  private configuration: Container | null = null;

  constructor(connectionString: string, databaseId = "home-budget") {
    this.client = new CosmosClient(connectionString);
    this.databaseId = databaseId;
  }

  async init(): Promise<void> {
    const { database } = await this.client.databases.createIfNotExists({
      id: this.databaseId,
    });

    const { container: purchases } = await database.containers.createIfNotExists({
      id: "purchases",
      partitionKey: "/id",
      throughput: 400,
    });

    const { container: configuration, statusCode: configurationStatusCode } =
      await database.containers.createIfNotExists({
        id: "configuration",
        partitionKey: "/id",
        throughput: 400,
      });

    this.purchases = purchases;
    this.configuration = configuration;
  }

  async addTransaction(transaction: PurchaseInput): Promise<PurchaseDocument> {
    if (!this.purchases) {
      throw new Error("Repository not initialized. Call init() first.");
    }

    const document: PurchaseDocument = {
      id: crypto.randomUUID(),
      userId: transaction.userId,
      userName: transaction.userName,
      description: transaction.description,
      amount: transaction.amount,
      date: new Date().toISOString(),
    };

    const { resource } = await this.purchases.items.create<PurchaseDocument>(document);

    if (!resource) {
      throw new Error("Failed to create transaction document.");
    }

    return resource;
  }

  async removeLastTransaction(): Promise<boolean> {
    if (!this.purchases) {
      throw new Error("Repository not initialized. Call init() first.");
    }

    const querySpec = {
      query: "SELECT TOP 1 c.id FROM c ORDER BY c.date DESC",
    };

    const { resources } = await this.purchases.items.query(querySpec).fetchAll();

    if (resources.length === 0) {
      return false;
    }
    const oldestItemId = resources[0].id;

    try {
      const { statusCode } = await this.purchases.item(oldestItemId, oldestItemId).delete();

      return statusCode === 204;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async getConfiguration(date: string = currentMonthDate()): Promise<ConfigurationDocument | null> {
    if (!this.configuration) {
      throw new Error("Repository not initialized. Call init() first.");
    }

    const querySpec = {
      query: "SELECT * FROM c WHERE c.date = @date",
      parameters: [{ name: "@date", value: date }],
    };

    const { resources } = await this.configuration.items
      .query<ConfigurationDocument>(querySpec)
      .fetchAll();

    return resources[0] ?? null;
  }

  async clearCurrentMonthHistory(): Promise<boolean> {
    if (!this.purchases) {
      throw new Error("Repository not initialized. Call init() first.");
    }

    const startOfMonth = currentMonthDate();

    const querySpec = {
      query: "SELECT c.id, c.userId FROM c WHERE c.date >= @startOfMonth",
      parameters: [{ name: "@startOfMonth", value: startOfMonth }],
    };

    const { resources: transactionsToDelete } = await this.purchases.items
      .query<PurchaseDocument>(querySpec)
      .fetchAll();

    if (transactionsToDelete.length === 0) {
      return false;
    }

    const deleteOperations = transactionsToDelete.map((doc) => ({
      operationType: BulkOperationType.Delete,
      id: doc.id,
      partitionKey: doc.id,
    }));

    const result = await this.purchases.items.executeBulkOperations(deleteOperations);

    return result.every((res) => res.response?.statusCode === 204);
  }

  async getTransactionsFromDate(
    fromDate: string = currentMonthDate(),
  ): Promise<PurchaseDocument[]> {
    if (!this.purchases) {
      throw new Error("Repository not initialized. Call init() first.");
    }
    const querySpec = {
      query: `
        SELECT * 
        FROM c 
        WHERE c.date >= @date
        ORDER BY c.date DESC
      `,
      parameters: [{ name: "@date", value: fromDate }],
    };

    const { resources } = await this.purchases.items.query<PurchaseDocument>(querySpec).fetchAll();

    return resources;
  }

  async getTotalCostForMonth(fromMonth: string = currentMonthDate()): Promise<number> {
    if (!this.purchases) {
      throw new Error("Repository not initialized. Call init() first.");
    }

    const querySpec = {
      query: `
        SELECT VALUE SUM(c.amount) 
        FROM c 
        WHERE c.date >= @date
      `,
      parameters: [{ name: "@date", value: fromMonth }],
    };

    const { resources } = await this.purchases.items.query<number>(querySpec).fetchAll();

    return resources[0] ?? 0;
  }

  async setMonthLimit(date: string, limit: number) {
    if (!this.configuration) {
      throw new Error("Repository not initialized. Call init() first.");
    }
    const defaultConfig: ConfigurationDocument = {
      id: crypto.randomUUID(),
      date: date,
      maxAmount: limit,
    };

    await this.configuration.items.create(defaultConfig);
  }
}
