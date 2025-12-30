import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import squirrelStartup from 'electron-squirrel-startup';
import { initDb, dbOps } from './database';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (squirrelStartup) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 800,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // Security best practice: disable nodeIntegration
      contextIsolation: true, // Security best practice: enable contextIsolation
      webSecurity: false 
    },
  });

  // and load the index.html of the app.
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // Open the DevTools.
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
  // Init DB
  initDb(app.getPath('userData'));

  // IPC Handlers
  ipcMain.handle('db-get-categories', () => dbOps.getCategories());
  ipcMain.handle('db-add-category', (_, name, type) => dbOps.addCategory(name, type));
  ipcMain.handle('db-delete-category', (_, id) => dbOps.deleteCategory(id));
  
  ipcMain.handle('db-get-transactions', (_, year, month) => dbOps.getTransactions(year, month));
  ipcMain.handle('db-get-all-transactions', () => dbOps.getAllTransactions());
  ipcMain.handle('db-add-transaction', (_, tx) => dbOps.addTransaction(tx));
  ipcMain.handle('db-update-transaction', (_, tx) => dbOps.updateTransaction(tx));
  ipcMain.handle('db-delete-transaction', (_, id) => dbOps.deleteTransaction(id));
  
  ipcMain.handle('db-get-subcategory-hints', (_, category) => dbOps.getSubcategoryHints(category));
  ipcMain.handle('db-delete-subcategory-hint', (_, category, subcategory) => dbOps.deleteSubcategoryHint(category, subcategory));
  
  ipcMain.handle('db-export', () => dbOps.exportData());
  ipcMain.handle('db-import', (_, data) => dbOps.importData(data));

  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
