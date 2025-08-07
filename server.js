require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');
const sendReport = require('./lib/sendReportBtn');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'docs'))); // Serve frontend
app.post('/send-report', (req, res) => {
  // Pass the report data from the request body
  const reportData = req.body;
  
  sendReport(reportData, (err, msg) => {
    if (err) {
      return res.status(500).json({ success: false, message: err });
    }
    res.json({ success: true, message: msg });
  });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ Server bound to http://127.0.0.1:${PORT}`);
});
