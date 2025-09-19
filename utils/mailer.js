// utils/mailer.js
// Dočasná fixná FROM adresa + spätná kompatibilita: sendWelcomeEmail -> alias na sendSignupEmail

const nodemailer = require('nodemailer');

const {
  SMTP_HOST = 'smtp.websupport.sk',
  SMTP_PORT = process.env.SMTP_PORT || '465',
  SMTP_SECURE = process.env.SMTP_SECURE || 'true',
  // ENV SMTP_USER teraz zámerne NEpoužijeme (mával chybnú hodnotu). Dočasne fixne:
  SMTP_PASS,
  APP_NAME = 'Lištobook',
  APP_URL = 'https://listobook.sk',
  EMAIL_DEBUG = 'true',
} = process.env;

// DOČASNE pevne:
const user = 'no-reply@listobook.sk';

const host = String(SMTP_HOST || '').trim();
const port = Number(String(SMTP_PORT || '').trim());
const secure = String(SMTP_SECURE || '').trim().toLowerCase() === 'true';
const pass = String(SMTP_PASS || '').trim();
const debugLogs = String(EMAIL_DEBUG || '').trim().toLowerCase() === 'true';

if (!pass) {
  console.error('❌ SMTP_PASS nie je nastavené (po trim()).');
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,                 // 465 => true, 587 => false (STARTTLS)
  auth: { user, pass },
  requireTLS: true,
  pool: false,
  logger: debugLogs,
  debug: debugLogs,
});

async function ensureConnection() {
  try {
    const ok = await transporter.verify();
    if (ok) console.log(`✅ SMTP verify OK (${user}@${host}:${port}, secure=${secure})`);
  } catch (e) {
    console.error('❌ SMTP verify failed:', e?.message || e);
    throw e;
  }
}

function stripHtml(s = '') { return String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }

async function sendMail({ to, subject, html, text }) {
  if (!to) throw new Error('sendMail: chýba "to"');
  await ensureConnection();
  const fromPretty = `${APP_NAME} <${user}>`;
  return transporter.sendMail({
    from: fromPretty,
    to,
    subject,
    text: text || (html ? stripHtml(html) : ''),
    html,
  });
}

// --- Templáty ---
function signupEmailTemplate() {
  const subject = `Vitajte v ${APP_NAME}! Dokončite profil`;
  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0c1f4b">
    <h2>Vitajte v ${escapeHtml(APP_NAME)} 👋</h2>
    <p>Účet bol vytvorený úspešne.</p>
    <p><strong>Posledný krok:</strong> po prihlásení si v aplikácii zvoľte prezývku.
       Bez prezývky nie je možné pridávať príspevky a komentáre.</p>
    <p style="margin:20px 0">
      <a href="${escapeAttr(APP_URL)}" style="display:inline-block;background:#ffe37a;color:#493a00;font-weight:700;text-decoration:none;padding:10px 16px;border-radius:10px;border:1px solid #ffd34d">Otvoriť aplikáciu</a>
    </p>
    <p style="font-size:12px;color:#64748b">Odoslané z ${escapeHtml(user)} (no-reply). Neodpovedajte.</p>
  </div>`;
  return { subject, html };
}

// --- API funkcie ---
async function sendSignupEmail(toEmail) {
  const { subject, html } = signupEmailTemplate();
  return sendMail({ to: toEmail, subject, html });
}

// Spätná kompatibilita: ak starý kód volá sendWelcomeEmail, pošli rovnaký info e-mail
async function sendWelcomeEmail(toEmail /*, nick = '' */) {
  return sendSignupEmail(toEmail);
}

module.exports = {
  ensureConnection,
  sendMail,
  sendSignupEmail,
  sendWelcomeEmail, // <- dôležité pre staré volania
};
