import { create } from 'zustand';
import { api } from '../api/db';
import { Transaction, Category } from '../types/db';

interface AppState {
  transactions: Transaction[];
  categories: Category[];
  currentYear: number;
  currentMonth: number; // 1-12
  isLoading: boolean;
  language: 'en' | 'zh';
  
  // Actions
  fetchData: () => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'>) => Promise<void>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;
  
  addCategory: (name: string, type: 'expense' | 'income') => Promise<Category>;
  deleteCategory: (id: number) => Promise<void>;
  
  setCurrentDate: (year: number, month: number) => void;
  setLanguage: (lang: 'en' | 'zh') => void;
  exportData: () => Promise<void>;
  importData: (file: File) => Promise<void>;
}

const getInitialLanguage = (): 'en' | 'zh' => {
  if (typeof window === 'undefined') return 'zh';
  const stored = window.localStorage.getItem('language');
  return stored === 'en' || stored === 'zh' ? stored : 'zh';
};

export const useStore = create<AppState>((set, get) => ({
  transactions: [],
  categories: [],
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth() + 1,
  isLoading: false,
  language: getInitialLanguage(),
  
  fetchData: async () => {
    set({ isLoading: true });
    try {
      const [transactions, categories] = await Promise.all([
        api.getAllTransactions(),
        api.getCategories()
      ]);
      set({ transactions, categories, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch data', error);
      set({ isLoading: false });
    }
  },
  
  addTransaction: async (tx) => {
    const newTx = await api.addTransaction(tx);
    set(state => ({ transactions: [newTx, ...state.transactions] }));
  },
  
  updateTransaction: async (tx) => {
    const updated = await api.updateTransaction(tx);
    set(state => ({
      transactions: state.transactions.map(t => t.id === tx.id ? updated : t)
    }));
  },
  
  deleteTransaction: async (id) => {
    await api.deleteTransaction(id);
    set(state => ({
      transactions: state.transactions.filter(t => t.id !== id)
    }));
  },
  
  addCategory: async (name, type) => {
    const newCat = await api.addCategory(name, type);
    set(state => ({ categories: [...state.categories, newCat] }));
    return newCat;
  },
  
  deleteCategory: async (id) => {
    await api.deleteCategory(id);
    set(state => ({ categories: state.categories.filter(c => c.id !== id) }));
  },
  
  setCurrentDate: (year, month) => set({ currentYear: year, currentMonth: month }),
  setLanguage: (lang) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('language', lang);
    }
    set({ language: lang });
  },
  
  exportData: async () => {
    const data = await api.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const datePart = new Date().toISOString().split('T')[0].replace(/-/g, '_');
    a.download = `account_backup_${datePart}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
  
  importData: async (file) => {
    const text = await file.text();
    const data = JSON.parse(text);
    await api.importData(data);
    await get().fetchData();
  }
}));
