/**
 * Preload Script - Secure Bridge between Renderer and Main Process
 * Exposes only specific, safe APIs to the frontend via contextBridge
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // ============== PDF & EMAIL ==============
    send: (channel, data) => {
        const validChannels = ['save-pdf', 'send-pdf-email'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    receive: (channel, callback) => {
        const validChannels = ['report-saved', 'email-success', 'email-error'];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => callback(...args));
        }
    },

    // ============== AUTH ==============
    login: (pin) => ipcRenderer.invoke('login', pin),
    logout: () => ipcRenderer.invoke('logout'),
    getCurrentUser: () => ipcRenderer.invoke('get-current-user'),

    // ============== SETTINGS ==============
    getAllSettings: () => ipcRenderer.invoke('get-all-settings'),
    getSetting: (key) => ipcRenderer.invoke('get-setting', key),
    setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

    // ============== INVENTORY ==============
    getInventory: () => ipcRenderer.invoke('get-inventory'),
    getInventoryByCategory: () => ipcRenderer.invoke('get-inventory-by-category'),
    addInventoryItem: (data) => ipcRenderer.invoke('add-inventory-item', data),
    updateInventoryItem: (data) => ipcRenderer.invoke('update-inventory-item', data),
    deleteInventoryItem: (id) => ipcRenderer.invoke('delete-inventory-item', id),

    // ============== STAFF ==============
    getStaff: () => ipcRenderer.invoke('get-staff'),
    addStaff: (data) => ipcRenderer.invoke('add-staff', data),
    updateStaffPin: (data) => ipcRenderer.invoke('update-staff-pin', data),
    deleteStaff: (id) => ipcRenderer.invoke('delete-staff', id),

    // ============== STOCK ENTRIES ==============
    getStockEntries: (dateStr) => ipcRenderer.invoke('get-stock-entries', dateStr),
    saveStockEntry: (data) => ipcRenderer.invoke('save-stock-entry', data),
    getLastClosingStock: (itemId) => ipcRenderer.invoke('get-last-closing-stock', itemId),
    saveDailyReport: (data) => ipcRenderer.invoke('save-daily-report', data),
});

console.log('✅ preload.js loaded - API bridge established');
