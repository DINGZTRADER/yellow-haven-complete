const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./lib/database');
const { sendEmailWithAttachment } = require('./lib/sendEmailWithAttachment');

// Initialize DB
db.initDatabase();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for PDF buffers

// Session simulation (memory only for simplicity in this demo)
let currentUser = null;

// Middleware to check auth
const requireAuth = (req, res, next) => {
  // For demo/simplicity, we skip strict token checks, but real app should use JWT/Cookies
  if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

const requireRole = (roles) => (req, res, next) => {
  if (!currentUser || !roles.includes(currentUser.role)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  next();
};

// ================= API ROUTES =================

// Auth
app.post('/api/login', (req, res) => {
  const user = db.checkPin(req.body.pin);
  if (user) {
    currentUser = user;
    res.json({ success: true, user });
  } else {
    res.status(401).json({ success: false });
  }
});

app.post('/api/logout', (req, res) => {
  currentUser = null;
  res.json({ success: true });
});

app.get('/api/current-user', (req, res) => {
  res.json(currentUser ? { name: currentUser.name, role: currentUser.role } : null);
});

// Settings
app.get('/api/settings', (req, res) => res.json(db.getAllSettings()));
app.get('/api/settings/:key', (req, res) => res.json(db.getSetting(req.params.key)));
app.post('/api/settings', requireRole(['Manager']), (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    db.setSetting(key, value);
  }
  res.json({ success: true });
});

// Inventory
app.get('/api/inventory', (req, res) => res.json(db.getInventory()));
app.get('/api/inventory/by-category', (req, res) => res.json(db.getInventoryByCategory()));
app.put('/api/inventory', requireRole(['Manager']), (req, res) => {
  try {
    db.addInventoryItem(req.body.name, req.body.category, req.body.price);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});
app.post('/api/inventory/update', requireRole(['Manager']), (req, res) => {
  try {
    db.updateInventoryItem(req.body.id, req.body.name, req.body.category, req.body.price);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});
app.delete('/api/inventory/:id', requireRole(['Manager']), (req, res) => {
  db.deleteInventoryItem(req.params.id);
  res.json({ success: true });
});

// Staff
app.get('/api/staff', (req, res) => res.json(db.getStaff()));
app.put('/api/staff', requireRole(['Manager', 'Supervisor']), (req, res) => {
  try {
    db.addStaff(req.body.name, req.body.role, req.body.pin);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});
app.post('/api/staff/pin', requireRole(['Manager', 'Supervisor']), (req, res) => {
  try {
    db.updateStaffPin(req.body.id, req.body.pin);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});
app.delete('/api/staff/:id', requireRole(['Manager', 'Supervisor']), (req, res) => {
  db.deleteStaff(req.params.id);
  res.json({ success: true });
});

// Stock
app.get('/api/stock', (req, res) => {
  res.json(db.getStockEntriesForDate(req.query.date));
});
app.post('/api/stock', (req, res) => {
  const { dateStr, itemId, opening, received, damaged, closing, sold } = req.body;
  db.saveStockEntry(dateStr, itemId, opening, received, damaged, closing, sold);
  res.json({ success: true });
});
app.get('/api/stock/closing/:id', (req, res) => {
  res.json(db.getLastClosingStock(req.params.id));
});

// Reports
app.post('/api/reports', (req, res) => {
  const { dateStr, staffName, totalSales, reportData } = req.body;
  db.saveDailyReport(dateStr, staffName, totalSales, reportData);
  res.json({ success: true });
});

// Email
app.post('/api/email-pdf', (req, res) => {
  // In a web context, we can't easily reference a local path on the client's machine.
  // Ideally, the client uploads the PDF or the server generates it.
  // For this simple port, we'll log it.
  console.log('Web Email Request received. Requires server-side PDF generation or upload.');
  res.json({ success: true, message: 'Email queued (Simulated for Web)' });
});

// ================= STATIC FILES =================

// Serve JS adapter
app.use('/js', express.static(path.join(__dirname, 'js')));
// Serve CSS
app.use('/css', express.static(path.join(__dirname, 'css')));
// Serve Logo
app.get('/logo.png', (req, res) => res.sendFile(path.join(__dirname, 'logo.png')));

// Serve HTML pages
app.get('/', (req, res) => {
  if (!currentUser) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/index.html', (req, res) => res.redirect('/'));

app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/login.html', (req, res) => res.redirect('/login'));

app.get('/settings', (req, res) => {
  if (!currentUser) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'settings.html'));
});
app.get('/settings.html', (req, res) => res.redirect('/settings'));

// Catch all for other potential static needs (be careful not to expose backend)
// app.use(express.static(__dirname)); // DISABLED for security

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Web Server running at http://localhost:${PORT}`);
  console.log(`📲 To access from other devices, use your computer's IP address (e.g., http://192.168.1.X:${PORT})`);
});

