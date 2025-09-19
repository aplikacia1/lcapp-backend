// utils/mailer.js
// Bezpečná verzia pre Websupport: trimne ENV, robí verify() a posiela z mailboxu (from=SMTP_USER)

const nodemailer = require('nodemailer');

const {
  SMTP_HOST = 'smtp.websupport.sk',           // funguje naprieč clustrami
  SMTP_PORT = '465',
  SMTP_SECURE = 'true',
  SMTP_USER = 'no-reply@listobook.sk',
  SMTP_PASS,
  APP_NAME = 'Lištobook',
  APP_URL = 'https://listobook.sk',
  EMAIL_DEBUG = 'true',                        // necháme zapnuté logy, kým to neladíme
} = process.env;

// Robustné očistenie hodnôt (eliminuje skryté medzery/riadky z Render ENV)
const host = String(SMTP_HOST || '').trim();
const port = Number(String(SMTP_PORT || '').trim() || 465);
const secure = String(SMTP_SECURE || 'true').trim().toLowerCase() === 'true';
const user = String(SMTP_USER || '').trim();
const pass = String(SMTP_PASS || '').trim();
const debugLogs = String(EMAIL_DEBUG || '').trim().toLowerCase() === 'true';

if (!user || !pass) {
  console.error('❌ SMTP_USER alebo SMTP_PASS nie je nastavené (alebo je prázdne po trim()).');
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
  requireTLS: true,
  pool: false,
  logger: debugLogs,
  debug: debugLogs,
  // Voliteľne: Websupport býva OK aj bez tohto, ale neuškodí:
  // authMethod: 'LOGIN',
});

async function ensureConnection() {
  try {
    const ok = await transporter.verify();
    if (ok) {
      console.log(`✅ SMTP verify OK (${user}@${host}:${port}, secure=${secure})`);
    }
  } catch (e) {
    console.error('❌ SMTP verify failed:', e && e.message ? e.message : e);
    throw e;
  }
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

async function sendMail({ to, subject, html, text }) {
  if (!to) throw new Error('sendMail: chýba "to"');

  await ensureConnection(); // ak padne, uvidíme jasnú hlášku v logu

  const fromPretty = `${APP_NAME} <${user}>`; // MUSÍ byť ten istý mailbox, čo sa prihlasuje
  return transporter.sendMail({
    from: fromPretty,
    to,
    subject,
    text: text || (html ? stripHtml(html) : ''),
    html,
  });
}

function welcomeEmailTemplate(toEmail, nick = '') {
  const subject = `Vitajte v ${APP_NAME}! 🎉`;
  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0c1f4b">
    <h2>Ahoj ${escapeHtml(nick || '')}, vitaj v ${escapeHtml(APP_NAME)}!</h2>
    <p>Ďakujeme za registráciu. Prajeme príjemné používanie.</p>
    <p><a href="${escapeAttr(APP_URL)}">Otvoriť aplikáciu</a></p>
    <p style="font-size:12px;color:#64748b">
      Tento e-mail bol odoslaný z adresy ${escapeHtml(user)}. Neodpovedajte prosím (no-reply).
    </p>
  </div>`;
  return { subject, html };
}

async function sendWelcomeEmail(toEmail, nick = '') {
  const { subject, html } = welcomeEmailTemplate(toEmail, nick);
  return sendMail({ to: toEmail, subject, html });
}

module.exports = {
  sendMail,
  sendWelcomeEmail,
  ensureConnection, // ak by si chcel dočasne volať v route
};
