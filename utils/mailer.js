// utils/mailer.js
// Bezpečná verzia pre Websupport SMTP

const nodemailer = require('nodemailer');

const {
  SMTP_HOST = 'smtp.m1.websupport.sk',
  SMTP_PORT = '465',
  SMTP_SECURE = 'true',
  SMTP_USER = 'no-reply@listobook.sk',
  SMTP_PASS,
  ADMIN_EMAIL, // len cieľová adresa pre test, nie pre "from"
  APP_NAME = 'Lištobook',
  APP_URL = 'https://listobook.sk',
} = process.env;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: String(SMTP_SECURE).toLowerCase() === 'true',
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  requireTLS: true,
  pool: false, // jednoduchšie a spoľahlivejšie pre 1 mail
});

async function sendMail({ to, subject, html, text }) {
  if (!to) throw new Error('sendMail: chýba "to"');

  const fromPretty = `${APP_NAME} <${SMTP_USER}>`; // musí byť rovnaké ako mailbox!

  return transporter.sendMail({
    from: fromPretty,
    to,
    subject,
    text: text || (html ? stripHtml(html) : ''),
    html,
  });
}

function welcomeEmailTemplate(toEmail, nick = '') {
  const brand = APP_NAME;
  const url = APP_URL;

  const subject = `Vitajte v ${brand}! 🎉`;
  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0c1f4b">
    <h2>Ahoj ${nick || ''}, vitaj v ${brand}!</h2>
    <p>Ďakujeme za registráciu. Prajeme príjemné používanie.</p>
    <p><a href="${escapeAttr(url)}">Otvoriť aplikáciu</a></p>
    <p style="font-size:12px;color:#64748b">
      Tento e-mail bol odoslaný na adresu ${escapeHtml(toEmail)}. 
      Neodpovedajte prosím (no-reply).
    </p>
  </div>`;
  return { subject, html };
}

async function sendWelcomeEmail(toEmail, nick = '') {
  const { subject, html } = welcomeEmailTemplate(toEmail, nick);
  return sendMail({ to: toEmail, subject, html });
}

function stripHtml(s = '') {
  return String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

module.exports = {
  sendMail,
  sendWelcomeEmail,
};
