/**
 * Database Module - SQLite powered data layer
 * Stores: Settings, Inventory, Staff, and Daily Reports
 */
const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db = null;

/**
 * Initialize the database connection and create tables if needed
 */
function initDatabase() {
    let dbPath;
    if (app) {
        const userDataPath = app.getPath('userData');
        dbPath = path.join(userDataPath, 'safebar.db');
    } else {
        // Fallback for Node.js server (Web Mode)
        // Store db in the project root or a data folder to be consistent
        // For shared access with Electron, we might want to target the same AppData folder if possible,
        // but finding the user's AppData path reliably in pure Node requires 'os' module logic or just local.
        // For simplicity in this "Shareable Web App" ensuring portability: use local file.
        dbPath = path.join(__dirname, '..', 'safebar.db');
        console.log('Running in Server Mode. DB Path:', dbPath);
    }

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL'); // Better performance & crash recovery

    // Create tables
    db.exec(`
    -- Settings table for customization
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Inventory items
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT 'Uncategorized',
      price INTEGER NOT NULL DEFAULT 0,
      opening_stock INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Staff members
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'Barstaff',
      pin_code TEXT DEFAULT '0000',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Daily reports (historical records)
    CREATE TABLE IF NOT EXISTS daily_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_date TEXT NOT NULL,
      staff_name TEXT,
      total_sales INTEGER DEFAULT 0,
      report_data TEXT, -- JSON blob of full report
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Daily stock entries (per item per day)
    CREATE TABLE IF NOT EXISTS stock_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_date TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      opening INTEGER DEFAULT 0,
      received INTEGER DEFAULT 0,
      damaged INTEGER DEFAULT 0,
      closing INTEGER DEFAULT 0,
      sold INTEGER DEFAULT 0,
      FOREIGN KEY (item_id) REFERENCES inventory(id),
      UNIQUE(report_date, item_id)
    );
  `);

    // Seed default settings if empty
    const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get();
    if (settingsCount.count === 0) {
        seedDefaultSettings();
    }

    // Seed default inventory if empty
    const inventoryCount = db.prepare('SELECT COUNT(*) as count FROM inventory').get();
    if (inventoryCount.count === 0) {
        seedDefaultInventory();
    }

    // Seed default staff if empty
    const staffCount = db.prepare('SELECT COUNT(*) as count FROM staff').get();
    if (staffCount.count === 0) {
        seedDefaultStaff();
    }

    // Migration: Add pin_code if missing
    try {
        db.prepare('SELECT pin_code FROM staff LIMIT 1').get();
    } catch (e) {
        db.prepare("ALTER TABLE staff ADD COLUMN pin_code TEXT DEFAULT '0000'").run();
    }

    // Migration: Ensure Managers/Supervisors have valid PINs (fix legacy data)
    const managersWithBadPin = db.prepare("SELECT id FROM staff WHERE role = 'Manager' AND (pin_code IS NULL OR pin_code = '0000')").all();
    if (managersWithBadPin.length > 0) {
        db.prepare("UPDATE staff SET pin_code = '1234' WHERE role = 'Manager' AND (pin_code IS NULL OR pin_code = '0000')").run();
        console.log('🔑 Reset Manager PIN to 1234');
    }
    const supervisorsWithBadPin = db.prepare("SELECT id FROM staff WHERE role = 'Supervisor' AND (pin_code IS NULL OR pin_code = '0000')").all();
    if (supervisorsWithBadPin.length > 0) {
        db.prepare("UPDATE staff SET pin_code = '5678' WHERE role = 'Supervisor' AND (pin_code IS NULL OR pin_code = '0000')").run();
        console.log('🔑 Reset Supervisor PIN to 5678');
    }

    console.log('✅ Database initialized at:', dbPath);
    return db;
}

function seedDefaultSettings() {
    const defaults = [
        ['business_name', 'SAFE bar and lounge'],
        ['currency', 'UGX'],
        ['currency_symbol', 'UGX'],
        ['owner_email', ''],
        ['smtp_host', ''],
        ['smtp_port', '587'],
        ['smtp_user', ''],
        ['smtp_pass', ''],
        ['report_footer', 'Powered by SafeBar Manager'],
    ];

    const insert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    const insertMany = db.transaction((items) => {
        for (const item of items) insert.run(item[0], item[1]);
    });
    insertMany(defaults);
}

function seedDefaultInventory() {
    const items = [
        // Beers
        { name: 'Nile Special', category: 'Beers', price: 10000 },
        { name: 'Club', category: 'Beers', price: 10000 },
        { name: 'Castle Lite', category: 'Beers', price: 10000 },
        { name: 'Stella Artois', category: 'Beers', price: 10000 },
        { name: 'Heineken', category: 'Beers', price: 10000 },
        { name: 'Tusker Lager', category: 'Beers', price: 10000 },
        { name: 'Tusker Malt', category: 'Beers', price: 10000 },
        { name: 'Tusker Apple', category: 'Beers', price: 10000 },
        { name: 'Bell', category: 'Beers', price: 10000 },
        { name: 'Guinness', category: 'Beers', price: 10000 },
        // Sodas
        { name: 'Coca Cola', category: 'Sodas', price: 4000 },
        { name: 'Fanta', category: 'Sodas', price: 4000 },
        { name: 'Sprite', category: 'Sodas', price: 4000 },
        { name: 'Soda Water', category: 'Sodas', price: 4000 },
        { name: 'Tonic Water', category: 'Sodas', price: 4000 },
        { name: 'Stoney', category: 'Sodas', price: 4000 },
        { name: 'Novida', category: 'Sodas', price: 4000 },
        { name: 'Mineral Water Big', category: 'Sodas', price: 6000 },
        { name: 'Mineral Water Small', category: 'Sodas', price: 3000 },
        { name: 'Smirnoff Ice Black', category: 'Sodas', price: 10000 },
        // Spirits
        { name: 'Glenlivet Shots', category: 'Spirits', price: 15000 },
        { name: 'Uganda Waragi', category: 'Spirits', price: 8000 },
        { name: 'Black Label', category: 'Spirits', price: 10000 },
        { name: 'Red Label', category: 'Spirits', price: 8000 },
        { name: 'Smirnoff Vodka', category: 'Spirits', price: 8000 },
        { name: 'Baileys', category: 'Spirits', price: 10000 },
        { name: 'Amarula', category: 'Spirits', price: 8000 },
        { name: 'Tequila Shot', category: 'Spirits', price: 8000 },
    ];

    const insert = db.prepare(
        'INSERT INTO inventory (name, category, price) VALUES (@name, @category, @price)'
    );
    const insertMany = db.transaction((items) => {
        for (const item of items) insert.run(item);
    });
    insertMany(items);
}

function seedDefaultStaff() {
    const staff = [
        { name: 'Peter', role: 'Manager', pin: '1234' },
        { name: 'Sophie', role: 'Supervisor', pin: '5678' },
        { name: 'Solome', role: 'Barstaff', pin: '0000' },
        { name: 'Alice', role: 'Barstaff', pin: '0000' },
        { name: 'Janet', role: 'Barstaff', pin: '0000' },
        { name: 'Nancy', role: 'Barstaff', pin: '0000' }
    ];
    const insert = db.prepare('INSERT INTO staff (name, role, pin_code) VALUES (@name, @role, @pin)');
    const insertMany = db.transaction((items) => {
        for (const item of items) insert.run(item);
    });
    insertMany(staff);
}

function checkPin(pin) {
    return db.prepare('SELECT id, name, role FROM staff WHERE pin_code = ? AND is_active = 1').get(pin);
}

// ============== SETTINGS API ==============
function getSetting(key) {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : null;
}

function setSetting(key, value) {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

function getAllSettings() {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const row of rows) {
        settings[row.key] = row.value;
    }
    return settings;
}

// ============== INVENTORY API ==============
function getInventory() {
    return db.prepare(
        'SELECT * FROM inventory WHERE is_active = 1 ORDER BY category, name'
    ).all();
}

function getInventoryByCategory() {
    const items = getInventory();
    const grouped = {};
    for (const item of items) {
        if (!grouped[item.category]) grouped[item.category] = [];
        grouped[item.category].push(item);
    }
    return grouped;
}

function addInventoryItem(name, category, price) {
    // Check if item exists (active or inactive)
    const existing = db.prepare('SELECT id, is_active FROM inventory WHERE name = ?').get(name);

    if (existing) {
        if (existing.is_active) {
            throw new Error('UNIQUE constraint failed: Item already exists');
        } else {
            // Reactivate and update
            return db.prepare(
                'UPDATE inventory SET is_active = 1, category = ?, price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
            ).run(category, price, existing.id);
        }
    }

    return db.prepare(
        'INSERT INTO inventory (name, category, price) VALUES (?, ?, ?)'
    ).run(name, category, price);
}

function updateInventoryItem(id, name, category, price) {
    return db.prepare(
        'UPDATE inventory SET name = ?, category = ?, price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(name, category, price, id);
}

function deleteInventoryItem(id) {
    // Soft delete
    return db.prepare('UPDATE inventory SET is_active = 0 WHERE id = ?').run(id);
}

// ============== STAFF API ==============
function getStaff() {
    return db.prepare('SELECT * FROM staff WHERE is_active = 1 ORDER BY name').all();
}

function addStaff(name, role = 'Barstaff', pin = '0000') {
    return db.prepare('INSERT INTO staff (name, role, pin_code) VALUES (?, ?, ?)').run(name, role, pin);
}

function updateStaffPin(id, pin) {
    return db.prepare('UPDATE staff SET pin_code = ? WHERE id = ?').run(pin, id);
}

function deleteStaff(id) {
    return db.prepare('UPDATE staff SET is_active = 0 WHERE id = ?').run(id);
}

// ============== STOCK ENTRIES API ==============
function getStockEntriesForDate(dateStr) {
    return db.prepare(`
    SELECT se.*, i.name, i.category, i.price 
    FROM stock_entries se
    JOIN inventory i ON se.item_id = i.id
    WHERE se.report_date = ?
    ORDER BY i.category, i.name
  `).all(dateStr);
}

function saveStockEntry(dateStr, itemId, opening, received, damaged, closing, sold) {
    return db.prepare(`
    INSERT INTO stock_entries (report_date, item_id, opening, received, damaged, closing, sold)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(report_date, item_id) DO UPDATE SET
      opening = excluded.opening,
      received = excluded.received,
      damaged = excluded.damaged,
      closing = excluded.closing,
      sold = excluded.sold
  `).run(dateStr, itemId, opening, received, damaged, closing, sold);
}

function getLastClosingStock(itemId) {
    // Get the most recent closing stock for an item
    const row = db.prepare(`
    SELECT closing FROM stock_entries
    WHERE item_id = ?
    ORDER BY report_date DESC
    LIMIT 1
  `).get(itemId);
    return row ? row.closing : 0;
}

function saveDailyReport(dateStr, staffName, totalSales, reportData) {
    return db.prepare(`
    INSERT INTO daily_reports (report_date, staff_name, total_sales, report_data)
    VALUES (?, ?, ?, ?)
  `).run(dateStr, staffName, totalSales, JSON.stringify(reportData));
}

// ============== CLOSE DATABASE ==============
function closeDatabase() {
    if (db) {
        db.close();
        db = null;
    }
}

module.exports = {
    initDatabase,
    closeDatabase,
    // Settings
    getSetting,
    setSetting,
    getAllSettings,
    // Inventory
    getInventory,
    getInventoryByCategory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    // Staff
    getStaff,
    addStaff,
    deleteStaff,
    // Stock
    getStockEntriesForDate,
    saveStockEntry,
    getLastClosingStock,
    saveDailyReport,
    checkPin,
    updateStaffPin,
};
