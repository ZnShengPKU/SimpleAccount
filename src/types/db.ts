export interface Transaction {
  id: number;
  type: 'expense' | 'income';
  category: string;
  subcategory?: string;
  date: string;
  amount: number;
  note: string;
  timestamp: number;
}

export interface Category {
  id: number;
  name: string;
  type: 'expense' | 'income';
  color: string;
}

export interface DailySummary {
  date: string;
  income: number;
  expense: number;
}

export interface CategorySummary {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}
