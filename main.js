require('dotenv').config();
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const generateReport = require('./lib/generateReport');
const { sendEmailWithAttachment } = require('./lib/sendEmailWithAttachment');

// Validate environment variables
const requiredKeys = ['SMTP_USER', 'SMTP_PASS', 'SMTP_TO', 'SMTP_NAME'];
const missing = requiredKeys.filter(key => !process.env[key]);

let mainWindow;

function openMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // ✅ Required for require() in index.html
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
  });

  mainWindow.loadFile(path.join(__dirname, 'docs/index.html'));
}

function openPdfPreview(pdfPath) {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: { nodeIntegration: false },
  });

  const previewUrl = `file://${path.join(__dirname, 'docs', 'pdfPreview.html')}?file=${encodeURIComponent(pdfPath)}`;
  win.loadURL(previewUrl);
}

// 🔄 Triggered from renderer (when user clicks 'Generate')
ipcMain.on('generate-report', () => {
  const staffName = 'Peter'; // Later: replace with dynamic input
  const reportDate = new Date().toISOString().split('T')[0];

  generateReport(staffName, reportDate, (pdfPath) => {
    console.log('📎 Report generated at:', pdfPath);
    openPdfPreview(pdfPath);

    // ✅ Notify renderer
    if (mainWindow) {
      mainWindow.webContents.send('report-ready', pdfPath);
    }
  });
});

// 📧 Handle actual sending of the PDF file
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

// 🚀 Launch app
if (missing.length) {
  app.on('ready', () => {
    dialog.showErrorBox('Environment Error', `Missing .env keys:\n${missing.join('\n')}`);
    app.quit();
  });
} else {
  app.whenReady().then(openMainWindow);
}
