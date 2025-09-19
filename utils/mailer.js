// backend/utils/mailer.js
// SMTP pre Websupport, robustné trimovanie ENV, verify() a from=SMTP_USER

const nodemailer = require('nodemailer');

const {
  SMTP_HOST = 'smtp.websupport.sk',   // generický host funguje naprieč clustrami
  SMTP_PORT = process.env.SMTP_PORT || '465',
  SMTP_SECURE = process.env.SMTP_SECURE || 'true', // 465=true, 587=false
  SMTP_USER = 'no-reply@listobook.sk',
  SMTP_PASS,
  APP_NAME = 'Lištobook',
  APP_URL = 'https://listobook.sk',
  EMAIL_DEBUG = 'true',               // necháme logy zapnuté, kým ladíme
} = process.env;

// Očistenie hodnôt (odstráni skryté medzery/riadky)
const host = String(SMTP_HOST || '').trim();
const port = Number(String(SMTP_PORT || '').trim());
const secure = String(SMTP_SECURE || '').trim().toLowerCase() === 'true';
const user = String(SMTP_USER || '').trim();
const pass = String(SMTP_PASS || '').trim();
const debugLogs = String(EMAIL_DEBUG || '').trim().toLowerCase() === 'true';

if (!user || !pass) {
  console.error('❌ SMTP_USER alebo SMTP_PASS nie sú nastavené (po trim()).');
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
  // authMethod: 'LOGIN', // ak by bolo treba vynútiť LOGIN, odkomentuj
});

async function ensureConnection() {
  try {
    const ok = await transporter.verify();
    if (ok) console.log(`✅ SMTP verify OK (${user}@${host}:${port}, secure=${secure})`);
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
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }

async function sendMail({ to, subject, html, text }) {
  if (!to) throw new Error('sendMail: chýba "to"');
  await ensureConnection();

  const fromPretty = `${APP_NAME} <${user}>`; // MUSÍ byť ten istý mailbox, čo sa prihlasuje
  return transporter.sendMail({
    from: fromPretty,
    to,
    subject,
    text: text || (html ? stripHtml(html) : ''),
    html,
  });
}

/** 1) EMAIL PO REGISTRÁCII (bez oslovenia, vysvetlí prezývku) */
function signupEmailTemplate(toEmail) {
  const subject = `Vitajte v ${APP_NAME}! Dokončite profil`;
  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0c1f4b">
    <h2>Vitajte v ${escapeHtml(APP_NAME)} 👋</h2>
    <p>Účet bol vytvorený úspešne.</p>
    <p><strong>Posledný krok:</strong> po prihlásení si v aplikácii zvoľte prezývku. 
       Bez prezývky nie je možné pridávať príspevky a komentáre.</p>
    <p style="margin:20px 0">
      <a href="${escapeAttr(APP_URL)}" 
         style="display:inline-block;background:#ffe37a;color:#493a00;font-weight:700;text-decoration:none;
                padding:10px 16px;border-radius:10px;border:1px solid #ffd34d">
        Otvoriť aplikáciu
      </a>
    </p>
    <p style="font-size:12px;color:#64748b">
      Tento e-mail bol odoslaný z adresy ${escapeHtml(user)} (no-reply). Prosím, neodpovedajte.
    </p>
  </div>`;
  return { subject, html };
}

async function sendSignupEmail(toEmail) {
  const { subject, html } = signupEmailTemplate(toEmail);
  return sendMail({ to: toEmail, subject, html });
}

/** 2) PÔVODNÝ WELCOME (ak by si ho niekde používal) */
function welcomeEmailTemplate(toEmail, nick = '') {
  const subject = `Vitajte v ${APP_NAME}! 🎉`;
  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0c1f4b">
    <h2>Vitajte v ${escapeHtml(APP_NAME)}!</h2>
    <p>Ďakujeme za registráciu. Prajeme príjemné používanie.</p>
    <p style="font-size:12px;color:#64748b">
      Odoslané z ${escapeHtml(user)} (no-reply).
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
  ensureConnection,
  sendSignupEmail,
  sendWelcomeEmail,
};
