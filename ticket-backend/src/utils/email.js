const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,     
  port: process.env.SMTP_PORT || 587,
  secure: false,                    
  auth: {
    user: process.env.SMTP_USER,    
    pass: process.env.SMTP_PASS     
  }
});

async function sendEmail(to, subject, text, html) {
  try {
    await transporter.sendMail({
      from: `"Smart Ticket System" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html
    });
    console.log(`✅ Email envoyé à ${to}`);
  } catch (err) {
    console.error(`❌ Erreur lors de l'envoi d'email à ${to}:`, err);
  }
}

module.exports = { sendEmail };
