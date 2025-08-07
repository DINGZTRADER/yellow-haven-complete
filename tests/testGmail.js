// testGmail.js
require('dotenv').config();
const nodemailer = require('nodemailer');

(async () => {
  const required = ['SMTP_USER', 'SMTP_PASS', 'SMTP_TO', 'SMTP_NAME'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.error('❌ Missing .env keys:', missing.join(', '));
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_NAME}" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_TO,
      subject: '✅ Gmail SMTP Test Success',
      text: 'If you received this email, your app is successfully connected to Gmail SMTP.',
    });

    console.log('✅ Email sent successfully:', info.response);
  } catch (err) {
    console.error('❌ Failed to send email:', err.message);
  }
})();
