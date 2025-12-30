import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database;

const S = 70;
const L = 50;
const MIN_HUE_DIFF = 60;

type TransactionInput = {
  type: 'expense' | 'income';
  category: string;
  subcategory?: string;
  date: string;
  amount: number;
  note: string;
};

type ImportPayload = {
  categories?: { name: string; type: 'expense' | 'income'; color: string }[];
  transactions?: {
    id?: number;
    type: 'expense' | 'income';
    category: string;
    subcategory?: string | null;
    date: string;
    amount: number;
    note: string;
    timestamp: number;
  }[];
};

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): { h: number, s: number, l: number } {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt("0x" + hex[1] + hex[1]);
    g = parseInt("0x" + hex[2] + hex[2]);
    b = parseInt("0x" + hex[3] + hex[3]);
  } else if (hex.length === 7) {
    r = parseInt("0x" + hex[1] + hex[2]);
    g = parseInt("0x" + hex[3] + hex[4]);
    b = parseInt("0x" + hex[5] + hex[6]);
  }
  r /= 255;
  g /= 255;
  b /= 255;
  const cmin = Math.min(r,g,b),
        cmax = Math.max(r,g,b),
        delta = cmax - cmin;
  let h = 0, s = 0, l = 0;

  if (delta === 0) h = 0;
  else if (cmax === r) h = ((g - b) / delta) % 6;
  else if (cmax === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  l = (cmax + cmin) / 2;
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return { h, s, l };
}

function generateColor(type: 'expense' | 'income', existingColors: string[]): string {
  const existingHues = existingColors.map(c => hexToHsl(c).h).sort((a, b) => a - b);
  
  let startHue = type === 'expense' ? 0 : 210; // Red for expense, Blue/Cyan for income
  // Adjust startHue to better separate: Expense (Red/Yellow/Purple) vs Income (Blue/Green/Cyan)
  // Expense: 0 (Red), 60 (Yellow), 300 (Magenta), 30 (Orange)...
  // Income: 240 (Blue), 180 (Cyan), 120 (Green), 210 (Azure)...
  // Let's stick to the user req: Expense start 0. Income start 180 or 240.
  if (type === 'income') startHue = 210; 

  let currentMinDiff = MIN_HUE_DIFF;
  
  while (currentMinDiff >= 10) {
      let currentHue = startHue;
      let attempts = 0;
      
      while (attempts < 360 / currentMinDiff + 5) { 
        let valid = true;
        for (const h of existingHues) {
          let diff = Math.abs(currentHue - h);
          if (diff > 180) diff = 360 - diff;
          if (diff < currentMinDiff) {
            valid = false;
            break;
          }
        }
        
        if (valid) {
          return hslToHex(currentHue, S, L);
        }
        
        currentHue = (currentHue + currentMinDiff) % 360;
        attempts++;
      }
      
      // If failed, reduce diff requirement
      currentMinDiff -= 10;
  }
  
  // Fallback
  return hslToHex((startHue + Math.random() * 360) % 360, S, L);
}

export function initDb(userDataPath: string) {
  const dbPath = process.env.NODE_ENV === 'development'
    ? path.join(userDataPath, 'data-dev.db')
    : path.join(userDataPath, 'data.db');
    
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
      color TEXT NOT NULL,
      UNIQUE(name, type)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
      category TEXT NOT NULL,
      subcategory TEXT,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subcategory_blacklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      subcategory TEXT NOT NULL,
      UNIQUE(category, subcategory)
    );
  `);
  
  // Init defaults
  const count = db.prepare('SELECT count(*) as c FROM categories').get() as { c: number };
  if (count.c === 0) {
    const defaults = [
      { name: 'Food', type: 'expense' },
      { name: 'Transport', type: 'expense' },
      { name: 'Shopping', type: 'expense' },
      { name: 'Salary', type: 'income' },
      { name: 'Bonus', type: 'income' }
    ];
    
    const insert = db.prepare('INSERT INTO categories (name, type, color) VALUES (@name, @type, @color)');
    const insertMany = db.transaction((cats) => {
      const expenseColors: string[] = [];
      const incomeColors: string[] = [];
      
      for (const cat of cats) {
        const existing = cat.type === 'expense' ? expenseColors : incomeColors;
        const color = generateColor(cat.type, existing);
        existing.push(color);
        insert.run({ name: cat.name, type: cat.type, color });
      }
    });
    insertMany(defaults);
  }
}

export const dbOps = {
  // Categories
  getCategories: () => {
    try {
      return db.prepare('SELECT * FROM categories ORDER BY id').all();
    } catch (error) {
      console.error('Failed to get categories', error);
      return [];
    }
  },
  
  addCategory: (name: string, type: 'expense' | 'income') => {
    const existing = db.prepare('SELECT color FROM categories WHERE type = ?').all(type) as { color: string }[];
    const color = generateColor(type, existing.map(c => c.color));
    
    try {
      const info = db.prepare('INSERT INTO categories (name, type, color) VALUES (?, ?, ?)').run(name, type, color);
      return { id: Number(info.lastInsertRowid), name, type, color };
    } catch (err) {
      const error = err as { code?: string };
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Category already exists');
      }
      throw err;
    }
  },

  deleteCategory: (id: number) => {
    // Check if used? Maybe just allow and leave transactions orphaned or cascade?
    // Requirement says: "Main categories: User can add, modify, delete"
    // Does not specify constraint. I'll just delete.
    return db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  },

  // Transactions
  getTransactions: (year?: number, month?: number) => {
    let sql = 'SELECT * FROM transactions ORDER BY date DESC, timestamp DESC';
    const params: string[] = [];
    
    if (year) {
      if (month) {
        sql = 'SELECT * FROM transactions WHERE strftime(\'%Y\', date) = ? AND strftime(\'%m\', date) = ? ORDER BY date DESC, timestamp DESC';
        params.push(year.toString(), month.toString().padStart(2, '0'));
      } else {
        sql = 'SELECT * FROM transactions WHERE strftime(\'%Y\', date) = ? ORDER BY date DESC, timestamp DESC';
        params.push(year.toString());
      }
    }
    return db.prepare(sql).all(...params);
  },

  getAllTransactions: () => {
    try {
      return db.prepare('SELECT * FROM transactions ORDER BY date DESC, timestamp DESC').all();
    } catch (error) {
      console.error('Failed to get all transactions', error);
      return [];
    }
  },

  addTransaction: (tx: TransactionInput) => {
    const { type, category, subcategory, date, amount, note } = tx;
    const timestamp = Date.now();
    const info = db.prepare(`
      INSERT INTO transactions (type, category, subcategory, date, amount, note, timestamp)
      VALUES (@type, @category, @subcategory, @date, @amount, @note, @timestamp)
    `).run({ type, category, subcategory, date, amount, note, timestamp });
    
    return { id: Number(info.lastInsertRowid), ...tx, timestamp };
  },

  updateTransaction: (tx: TransactionInput & { id: number }) => {
     const { id, type, category, subcategory, date, amount, note } = tx;
     const timestamp = Date.now(); // Update timestamp on edit? Requirement says "create/modify time"
     db.prepare(`
       UPDATE transactions 
       SET type = @type, category = @category, subcategory = @subcategory, 
           date = @date, amount = @amount, note = @note, timestamp = @timestamp
       WHERE id = @id
     `).run({ id, type, category, subcategory, date, amount, note, timestamp });
     return { ...tx, timestamp };
  },

  deleteTransaction: (id: number) => {
    return db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  },
  
  // Stats
  getSubcategoryHints: (category: string) => {
    return db.prepare(`
      SELECT DISTINCT subcategory 
      FROM transactions 
      WHERE category = ? AND subcategory IS NOT NULL AND subcategory != ''
        AND subcategory NOT IN (
          SELECT subcategory FROM subcategory_blacklist WHERE category = ?
        )
      LIMIT 5
    `).all(category, category).map((r) => (r as { subcategory: string }).subcategory);
  },

  deleteSubcategoryHint: (category: string, subcategory: string) => {
    db.prepare(`
      INSERT OR IGNORE INTO subcategory_blacklist (category, subcategory)
      VALUES (?, ?)
    `).run(category, subcategory);
  },

  exportData: () => {
    const transactions = db.prepare('SELECT * FROM transactions').all();
    const categories = db.prepare('SELECT * FROM categories').all();
    return { transactions, categories };
  },

  importData: (data: ImportPayload) => {
    // data should have transactions and categories
    // Simple strategy: Clear and Insert or Merge?
    // "Implement cross-device migration" implies replace or merge.
    // Usually Replace is safer for "migration".
    // I'll implement Replace for simplicity, or maybe upsert.
    // Let's do a transaction:
    const importTx = db.transaction(() => {
      // Upsert Categories
      if (data.categories) {
        const insertCat = db.prepare('INSERT OR IGNORE INTO categories (name, type, color) VALUES (@name, @type, @color)');
        for (const cat of data.categories) {
          insertCat.run(cat);
        }
      }
      
      // Upsert Transactions (by id? or just insert new?)
      // If migrating, maybe IDs clash.
      // Better to clear or ignore IDs and re-insert?
      // "Data export/import to achieve cross-device migration"
      // If I export from A and import to B.
      // I'll iterate and insert.
      if (data.transactions) {
        const insertTx = db.prepare(`
          INSERT INTO transactions (type, category, subcategory, date, amount, note, timestamp)
          VALUES (@type, @category, @subcategory, @date, @amount, @note, @timestamp)
        `);
        for (const tx of data.transactions) {
          const { id, ...rest } = tx;
          void id;
          insertTx.run(rest);
        }
      }
    });
    importTx();
  }
};
