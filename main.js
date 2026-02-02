const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { sendEmailWithAttachment } = require('./lib/sendEmailWithAttachment');
const db = require('./lib/database');

// DEBUG: Catch silent startup crashes
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED PROMISE:', reason);
});

let mainWindow;
let currentUser = null;

function openMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
  });

  mainWindow.loadFile(path.join(__dirname, 'login.html'));

  // Only open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// ============== PDF HANDLING ==============
ipcMain.on('save-pdf', (event, { buffer, name }) => {
  try {
    const userDataPath = app.getPath('userData');
    const reportsDir = path.join(userDataPath, 'reports');

    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filePath = path.join(reportsDir, name);
    fs.writeFileSync(filePath, Buffer.from(buffer));

    console.log('📎 Report saved to:', filePath);
    event.sender.send('report-saved', filePath);
  } catch (err) {
    console.error('Failed to save PDF:', err);
    dialog.showErrorBox('Save Error', 'Could not save the report PDF.\n' + err.message);
  }
});

ipcMain.on('send-pdf-email', (event, pdfPath) => {
  console.log('📨 Sending email with:', pdfPath);

  sendEmailWithAttachment(pdfPath)
    .then(() => {
      dialog.showMessageBox({ message: '✅ Email sent successfully!', type: 'info' });
    })
    .catch(err => {
      dialog.showErrorBox('Email Failed', err.message);
    });
});

// ============== AUTHENTICATION ==============
ipcMain.handle('login', (event, pin) => {
  const user = db.checkPin(pin);
  if (user) {
    currentUser = user;
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
    return { success: true, user: { name: user.name, role: user.role } };
  }
  return { success: false };
});

ipcMain.handle('logout', () => {
  currentUser = null;
  mainWindow.loadFile(path.join(__dirname, 'login.html'));
  return true;
});

ipcMain.handle('get-current-user', () => {
  return currentUser ? { name: currentUser.name, role: currentUser.role } : null;
});

// ============== SETTINGS API ==============
ipcMain.handle('get-all-settings', () => {
  return db.getAllSettings();
});

ipcMain.handle('get-setting', (event, key) => {
  return db.getSetting(key);
});

ipcMain.handle('set-setting', (event, key, value) => {
  db.setSetting(key, value);
  return true;
});

ipcMain.handle('save-settings', (event, settings) => {
  if (!currentUser || currentUser.role !== 'Manager') {
    return { success: false, error: 'Unauthorized: Managers only.' };
  }
  for (const [key, value] of Object.entries(settings)) {
    db.setSetting(key, value);
  }
  return true;
});

// ============== INVENTORY API ==============
ipcMain.handle('get-inventory', () => {
  return db.getInventory();
});

ipcMain.handle('get-inventory-by-category', () => {
  return db.getInventoryByCategory();
});

ipcMain.handle('add-inventory-item', (event, { name, category, price }) => {
  if (!currentUser || currentUser.role !== 'Manager') {
    return { success: false, error: 'Unauthorized: Managers only.' };
  }
  try {
    db.addInventoryItem(name, category, price);
    return { success: true };
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return { success: false, error: 'An item with this name already exists.' };
    }
    return { success: false, error: err.message };
  }
});

ipcMain.handle('update-inventory-item', (event, { id, name, category, price }) => {
  if (!currentUser || currentUser.role !== 'Manager') {
    return { success: false, error: 'Unauthorized: Managers only.' };
  }
  try {
    db.updateInventoryItem(id, name, category, price);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-inventory-item', (event, id) => {
  if (!currentUser || currentUser.role !== 'Manager') {
    return { success: false, error: 'Unauthorized: Managers only.' };
  }
  try {
    db.deleteInventoryItem(id);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ============== STAFF API ==============
ipcMain.handle('get-staff', () => {
  return db.getStaff();
});

ipcMain.handle('add-staff', (event, { name, role, pin }) => {
  if (!currentUser || (currentUser.role !== 'Manager' && currentUser.role !== 'Supervisor')) {
    return { success: false, error: 'Unauthorized.' };
  }
  try {
    db.addStaff(name, role, pin);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('update-staff-pin', (event, { id, pin }) => {
  if (!currentUser || (currentUser.role !== 'Manager' && currentUser.role !== 'Supervisor')) {
    return { success: false, error: 'Unauthorized.' };
  }
  try {
    db.updateStaffPin(id, pin);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-staff', (event, id) => {
  if (!currentUser || (currentUser.role !== 'Manager' && currentUser.role !== 'Supervisor')) {
    return { success: false, error: 'Unauthorized.' };
  }
  try {
    db.deleteStaff(id);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ============== STOCK ENTRIES API ==============
ipcMain.handle('get-stock-entries', (event, dateStr) => {
  return db.getStockEntriesForDate(dateStr);
});

ipcMain.handle('save-stock-entry', (event, { dateStr, itemId, opening, received, damaged, closing, sold }) => {
  try {
    db.saveStockEntry(dateStr, itemId, opening, received, damaged, closing, sold);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-last-closing-stock', (event, itemId) => {
  return db.getLastClosingStock(itemId);
});

ipcMain.handle('save-daily-report', (event, { dateStr, staffName, totalSales, reportData }) => {
  try {
    db.saveDailyReport(dateStr, staffName, totalSales, reportData);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ============== APP LIFECYCLE ==============
app.whenReady().then(() => {
  db.initDatabase();
  openMainWindow();
});

app.on('window-all-closed', () => {
  db.closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    openMainWindow();
  }
});
