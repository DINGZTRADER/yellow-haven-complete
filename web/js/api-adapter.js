/**
 * API Adapter for Web Interface
 * Mocks the Electron 'window.api' object by calling the HTTP API
 */

if (!window.api) {
    console.log('🌐 Running in Web Mode - Initializing API Adapter');

    // Helper for fetch calls
    const apiCall = async (endpoint, method = 'GET', body = null) => {
        try {
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' }
            };
            if (body) options.body = JSON.stringify(body);

            const res = await fetch(`/api/${endpoint}`, options);
            if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
            return await res.json();
        } catch (err) {
            console.error(`API Call Failed [${endpoint}]:`, err);
            throw err;
        }
    };

    window.api = {
        // Auth
        login: (pin) => apiCall('login', 'POST', { pin }),
        logout: () => {
            return apiCall('logout', 'POST').then(() => {
                window.location.href = '/login.html';
            });
        },
        getCurrentUser: () => apiCall('current-user'),

        // Settings
        getAllSettings: () => apiCall('settings'),
        getSetting: (key) => apiCall(`settings/${key}`),
        saveSettings: (settings) => apiCall('settings', 'POST', settings),

        // Inventory
        getInventory: () => apiCall('inventory'),
        getInventoryByCategory: () => apiCall('inventory/by-category'),
        addInventoryItem: (item) => apiCall('inventory', 'PUT', item),
        updateInventoryItem: (item) => apiCall('inventory/update', 'POST', item),
        deleteInventoryItem: (id) => apiCall(`inventory/${id}`, 'DELETE'),

        // Staff
        getStaff: () => apiCall('staff'),
        addStaff: (staff) => apiCall('staff', 'PUT', staff),
        updateStaffPin: (data) => apiCall('staff/pin', 'POST', data),
        deleteStaff: (id) => apiCall(`staff/${id}`, 'DELETE'),

        // Stock
        getStockEntriesForDate: (date) => apiCall(`stock?date=${date}`),
        saveStockEntry: (entry) => apiCall('stock', 'POST', entry),
        getLastClosingStock: (itemId) => apiCall(`stock/closing/${itemId}`),
        saveDailyReport: (data) => apiCall('reports', 'POST', data),

        // PDF & Email
        send: (channel, data) => {
            if (channel === 'save-pdf') {
                // For web, we might just download it directly
                // Convert buffer data back to Blob
                const byteArray = new Uint8Array(data.buffer);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = data.name;
                a.click();

                // Simulate event
                setTimeout(() => {
                    if (window.api.receiveParams && window.api.receiveParams['report-saved']) {
                        window.api.receiveParams['report-saved'](data.name);
                    }
                }, 500);
            }
            if (channel === 'send-pdf-email') {
                alert('Email sending from web requires backend configuration. Ensure SMTP is set.');
                apiCall('email-pdf', 'POST', { filePath: data });
            }
        },

        receive: (channel, func) => {
            // Mock event listener storage
            if (!window.api.receiveParams) window.api.receiveParams = {};
            window.api.receiveParams[channel] = func;
        }
    };
}
