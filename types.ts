export interface PurchaseInput {
  userId: string;
  userName: string;
  description: string;
  amount: number;
}

export interface PurchaseDocument extends PurchaseInput {
  id: string;
  date: string;
}

export interface ConfigurationDocument {
  id: string;
  date: string;
  maxAmount: number;
}

export interface AddTransactionMessageInput {
  userId: string;
  userName: string;
  text: string;
}

export interface AddTransactionResult {
  success: boolean;
  message: string;
}

export interface DetailsSummaryResult {
  transactions: PurchaseDocument[];
  budgetAvailable: number;
  plannedSpends: number;
  monthLimit: number;
  actualSpends: number;
}
