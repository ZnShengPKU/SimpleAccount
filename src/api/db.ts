import { Transaction, Category } from '../types/db';

type ExportPayload = { transactions: Transaction[]; categories: Category[] };

type IpcRendererLike = {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
};

const electronGlobal = (window as unknown as { electron?: { ipcRenderer: IpcRendererLike } }).electron;

const ipcRenderer: IpcRendererLike = electronGlobal
  ? electronGlobal.ipcRenderer
  : {
      invoke: (channel: string, ..._args: unknown[]) => {
        void _args;
        console.warn(`IPC invoke ${channel} called in browser environment`);
        return Promise.resolve([]);
      }
    };

export const api = {
  getCategories: (): Promise<Category[]> =>
    ipcRenderer.invoke('db-get-categories') as Promise<Category[]>,
  addCategory: (name: string, type: 'expense' | 'income'): Promise<Category> =>
    ipcRenderer.invoke('db-add-category', name, type) as Promise<Category>,
  deleteCategory: (id: number): Promise<void> =>
    ipcRenderer.invoke('db-delete-category', id) as Promise<void>,
  
  getTransactions: (year?: number, month?: number): Promise<Transaction[]> =>
    ipcRenderer.invoke('db-get-transactions', year, month) as Promise<Transaction[]>,
  getAllTransactions: (): Promise<Transaction[]> =>
    ipcRenderer.invoke('db-get-all-transactions') as Promise<Transaction[]>,
  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'>): Promise<Transaction> =>
    ipcRenderer.invoke('db-add-transaction', tx) as Promise<Transaction>,
  updateTransaction: (tx: Transaction): Promise<Transaction> =>
    ipcRenderer.invoke('db-update-transaction', tx) as Promise<Transaction>,
  deleteTransaction: (id: number): Promise<void> =>
    ipcRenderer.invoke('db-delete-transaction', id) as Promise<void>,
  
  getSubcategoryHints: (category: string): Promise<string[]> =>
    ipcRenderer.invoke('db-get-subcategory-hints', category) as Promise<string[]>,
  deleteSubcategoryHint: (category: string, subcategory: string): Promise<void> =>
    ipcRenderer.invoke('db-delete-subcategory-hint', category, subcategory) as Promise<void>,
  
  exportData: (): Promise<ExportPayload> =>
    ipcRenderer.invoke('db-export') as Promise<ExportPayload>,
  importData: (data: ExportPayload): Promise<void> =>
    ipcRenderer.invoke('db-import', data) as Promise<void>,
};
