
const fs = require('fs');
const path = require('path');
const sendReport = require('../lib/send_report');

const testData = {
  date: "2025-08-03",
  barstaff: "TestUser",
  totalSales: "UGX 123,000",
  items: [
    { item: "Test Beer", opening: 10, received: 5, damaged: 2, closing: 3, sold: 10, price: "UGX 10,000" },
    { item: "Test Soda", opening: 20, received: 10, damaged: 1, closing: 5, sold: 24, price: "UGX 4,000" }
  ]
};

test('should generate Excel file without error', done => {
  sendReport(testData, (err, msg) => {
    try {
      expect(err).toBeNull();
      expect(msg).toMatch(/success/i);
      const filePath = path.join(__dirname, '../lib/daily_report/stock.xlsx');
      expect(fs.existsSync(filePath)).toBe(true);
      done();
    } catch (e) {
      done(e);
    }
  });
}, 10000);
