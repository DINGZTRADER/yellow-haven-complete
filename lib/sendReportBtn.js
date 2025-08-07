const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const REPORT_DIR = path.join(__dirname, '../daily_report');
const STOCK_FILE = path.join(__dirname, '../docs/stock_data.json');
const STOCK_BACKUP_DIR = path.join(__dirname, '../docs/stock_backups');

if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
if (!fs.existsSync(STOCK_BACKUP_DIR)) fs.mkdirSync(STOCK_BACKUP_DIR, { recursive: true });

async function sendReportBtn(data, callback) {
  const fileName = `Stock_Report_${data.date}.xlsx`;
  const filePath = path.join(REPORT_DIR, fileName);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Stock Report');

  const logoPath = path.join(__dirname, '../docs/logo.png');
  if (fs.existsSync(logoPath)) {
    const imageId = workbook.addImage({ filename: logoPath, extension: 'png' });
    worksheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: 160, height: 60 }
    });
  }

  worksheet.addRow([]); worksheet.addRow([]); worksheet.addRow([]);

  worksheet.columns = [
    { header: 'Item', key: 'item', width: 20 },
    { header: 'Opening', key: 'opening', width: 10 },
    { header: 'Received', key: 'received', width: 10 },
    { header: 'Damaged', key: 'damaged', width: 10 },
    { header: 'Closing', key: 'closing', width: 10 },
    { header: 'Sold', key: 'sold', width: 10 },
    { header: 'Price', key: 'price', width: 15 }
  ];

  data.items.forEach(item => worksheet.addRow(item));

  worksheet.addRow([]);
  worksheet.addRow(['Date', data.date]);
  worksheet.addRow(['Barstaff', data.barstaff]);
  worksheet.addRow(['Total Sales', data.totalSales]);

  if (data.managerDrinks?.length > 0) {
    worksheet.addRow([]);
    worksheet.addRow(['Drinks Taken by Manager/Director']);
    worksheet.addRow(['Item', 'No Taken', 'Type', 'Amount']);
    data.managerDrinks.forEach(drink => {
      worksheet.addRow([drink.item, drink.no, drink.type, drink.amount]);
    });
  }

  worksheet.addRow([]);
  worksheet.addRow(['Notes']);
  worksheet.addRow([data.notes || 'No notes provided.']);

  worksheet.getRow(4).eachCell(cell => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDDDDD' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  try {
    await workbook.xlsx.writeFile(filePath);
  } catch (err) {
    return callback('❌ Error writing Excel: ' + err.message);
  }

  // Backup current stock file
  if (fs.existsSync(STOCK_FILE)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(STOCK_BACKUP_DIR, `stock_${timestamp}.json`);
    try {
      fs.copyFileSync(STOCK_FILE, backupPath);
    } catch (err) {
      return callback('❌ Failed to backup stock file: ' + err.message);
    }
  }

  // Overwrite today's closing as tomorrow's opening
  const updatedItems = data.items.map(item => ({
    item: item.item,
    opening: item.closing || 0,
    price: item.price
  }));

  try {
    fs.writeFileSync(STOCK_FILE, JSON.stringify(updatedItems, null, 2));
  } catch (err) {
    return callback('❌ Failed to update stock file: ' + err.message);
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const mailOptions = {
    from: `"Yellow Haven" <${process.env.SMTP_USER}>`,
    to: process.env.SMTP_TO,
    subject: `📊 Stock Report – ${data.date}`,
    text: `Attached is the stock report from ${data.barstaff} with notes and manager's drinks included.\n\nTotal Sales: ${data.totalSales}`,
    attachments: [{ filename: fileName, path: filePath }]
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) return callback('❌ Email failed: ' + err.message);
    callback(null, '✅ Email sent: ' + info.response);
  });
}

module.exports = sendReportBtn;
