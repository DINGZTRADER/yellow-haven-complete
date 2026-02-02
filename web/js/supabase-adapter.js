/**
 * Supabase API Adapter for SafeBar Manager
 * Replaces local SQLite with Supabase cloud database
 */

const SUPABASE_URL = 'https://xiaeslxcvgbrhjmwvwql.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpYWVzbHhjdmdicmhqbXd2d3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMjE5MzQsImV4cCI6MjA4NTU5NzkzNH0.AOsc-DxMmlEGkZye-29O3bTTBe6v-WwDMchmKS4Qs5s';

// In-memory session
let currentUser = null;

// Supabase REST helper
async function supabaseQuery(table, method = 'GET', body = null, queryParams = '') {
    const url = `${SUPABASE_URL}/rest/v1/${table}${queryParams}`;
    const options = {
        method,
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
        }
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    if (!res.ok) {
        const err = await res.text();
        console.error('Supabase Error:', err);
        throw new Error(err);
    }

    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

// Initialize window.api if not in Electron
if (!window.api) {
    console.log('🌐 Running in Web Mode with Supabase Backend');

    window.api = {
        // ========== AUTH ==========
        login: async (pin) => {
            const users = await supabaseQuery('staff', 'GET', null, `?pin_code=eq.${pin}&is_active=eq.true&select=id,name,role`);
            if (users && users.length > 0) {
                currentUser = users[0];
                localStorage.setItem('safebar_user', JSON.stringify(currentUser));
                window.location.href = '/index.html';
                return { success: true, user: currentUser };
            }
            return { success: false };
        },

        logout: async () => {
            currentUser = null;
            localStorage.removeItem('safebar_user');
            window.location.href = '/login.html';
            return true;
        },

        getCurrentUser: async () => {
            if (!currentUser) {
                const stored = localStorage.getItem('safebar_user');
                if (stored) currentUser = JSON.parse(stored);
            }
            return currentUser;
        },

        // ========== SETTINGS ==========
        getAllSettings: async () => {
            const rows = await supabaseQuery('settings', 'GET', null, '?select=key,value');
            const settings = {};
            for (const row of rows || []) {
                settings[row.key] = row.value;
            }
            return settings;
        },

        getSetting: async (key) => {
            const rows = await supabaseQuery('settings', 'GET', null, `?key=eq.${key}&select=value`);
            return rows && rows[0] ? rows[0].value : null;
        },

        saveSettings: async (settings) => {
            for (const [key, value] of Object.entries(settings)) {
                // Upsert
                await supabaseQuery('settings', 'POST', { key, value }, '?on_conflict=key');
            }
            return { success: true };
        },

        // ========== INVENTORY ==========
        getInventory: async () => {
            return await supabaseQuery('inventory', 'GET', null, '?is_active=eq.true&order=category,name');
        },

        getInventoryByCategory: async () => {
            const items = await supabaseQuery('inventory', 'GET', null, '?is_active=eq.true&order=category,name');
            const grouped = {};
            for (const item of items || []) {
                if (!grouped[item.category]) grouped[item.category] = [];
                grouped[item.category].push(item);
            }
            return grouped;
        },

        addInventoryItem: async ({ name, category, price }) => {
            try {
                await supabaseQuery('inventory', 'POST', { name, category, price });
                return { success: true };
            } catch (err) {
                return { success: false, error: err.message };
            }
        },

        updateInventoryItem: async ({ id, name, category, price }) => {
            try {
                await supabaseQuery('inventory', 'PATCH', { name, category, price }, `?id=eq.${id}`);
                return { success: true };
            } catch (err) {
                return { success: false, error: err.message };
            }
        },

        deleteInventoryItem: async (id) => {
            await supabaseQuery('inventory', 'PATCH', { is_active: false }, `?id=eq.${id}`);
            return { success: true };
        },

        // ========== STAFF ==========
        getStaff: async () => {
            return await supabaseQuery('staff', 'GET', null, '?is_active=eq.true&order=name');
        },

        addStaff: async ({ name, role, pin }) => {
            try {
                await supabaseQuery('staff', 'POST', { name, role, pin_code: pin });
                return { success: true };
            } catch (err) {
                return { success: false, error: err.message };
            }
        },

        updateStaffPin: async ({ id, pin }) => {
            try {
                await supabaseQuery('staff', 'PATCH', { pin_code: pin }, `?id=eq.${id}`);
                return { success: true };
            } catch (err) {
                return { success: false, error: err.message };
            }
        },

        deleteStaff: async (id) => {
            await supabaseQuery('staff', 'PATCH', { is_active: false }, `?id=eq.${id}`);
            return { success: true };
        },

        // ========== STOCK ==========
        getStockEntriesForDate: async (dateStr) => {
            return await supabaseQuery('stock_entries', 'GET', null,
                `?report_date=eq.${dateStr}&select=*,inventory(name,category,price)&order=inventory(category),inventory(name)`);
        },

        saveStockEntry: async ({ dateStr, itemId, opening, received, damaged, closing, sold }) => {
            // Upsert
            await supabaseQuery('stock_entries', 'POST',
                { report_date: dateStr, item_id: itemId, opening, received, damaged, closing, sold },
                '?on_conflict=report_date,item_id');
            return { success: true };
        },

        getLastClosingStock: async (itemId) => {
            const rows = await supabaseQuery('stock_entries', 'GET', null,
                `?item_id=eq.${itemId}&order=report_date.desc&limit=1&select=closing`);
            return rows && rows[0] ? rows[0].closing : 0;
        },

        saveDailyReport: async ({ dateStr, staffName, totalSales, reportData }) => {
            await supabaseQuery('daily_reports', 'POST',
                { report_date: dateStr, staff_name: staffName, total_sales: totalSales, report_data: reportData });
            return { success: true };
        },

        // ========== PDF/EMAIL (Client-side for web) ==========
        send: (channel, data) => {
            if (channel === 'save-pdf') {
                const byteArray = new Uint8Array(data.buffer);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = data.name;
                a.click();

                setTimeout(() => {
                    if (window.api.receiveHandlers && window.api.receiveHandlers['report-saved']) {
                        window.api.receiveHandlers['report-saved'](data.name);
                    }
                }, 500);
            }
            if (channel === 'send-pdf-email') {
                alert('📧 Email sending requires server-side SMTP configuration. Please set up email settings.');
            }
        },

        receive: (channel, func) => {
            if (!window.api.receiveHandlers) window.api.receiveHandlers = {};
            window.api.receiveHandlers[channel] = func;
        }
    };
}
