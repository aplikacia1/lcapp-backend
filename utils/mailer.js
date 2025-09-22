// utils/mailer.js
const nodemailer = require('nodemailer');

const {
  SMTP_HOST = 'smtp.m1.websupport.sk',
  SMTP_PORT = '465',
  SMTP_SECURE = 'true',
  SMTP_USER,
  SMTP_PASS,
  APP_NAME = 'Lištobook',
  APP_URL = 'https://listobook.sk',
  EMAIL_DEBUG = 'false',
  SMTP_AUTH_METHOD = '', // voliteľné: LOGIN alebo PLAIN
} = process.env;

// --- očistenie a defaulty ---
const host = String(SMTP_HOST || '').trim();
const port = Number(String(SMTP_PORT || '').trim()) || 587;
// 465 => implicit TLS; inak sa riadime podľa SMTP_SECURE
const secure =
  port === 465 ? true : String(SMTP_SECURE || 'false').trim().toLowerCase() === 'true';
const user = String(SMTP_USER || '').trim();
const pass = String(SMTP_PASS || '').trim();
const debug = String(EMAIL_DEBUG || 'false').trim().toLowerCase() === 'true';
const authMethod = String(SMTP_AUTH_METHOD || '').trim().toUpperCase() || null;

if (!user || !pass) {
  console.error('❌ SMTP_USER alebo SMTP_PASS chýba.');
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
  ...(authMethod ? { authMethod } : {}), // vynútenie LOGIN/PLAIN ak treba
  tls: { minVersion: 'TLSv1.2' },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
  pool: false,
  logger: debug,
  debug,
});

let _verified = false;
async function verifyOnce() {
  if (_verified) return;
  try {
    await transporter.verify();
    _verified = true;
    console.log(
      `✅ SMTP ready as ${user} @ ${host}:${port} (secure=${secure}${authMethod ? `, auth=${authMethod}` : ''})`
    );
  } catch (err) {
    console.error('❌ SMTP verify failed:', err?.message || err);
    throw err;
  }
}

function stripHtml(s = '') {
  return String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapeAttr(s = '') { return escapeHtml(s).replace(/"/g, '&quot;'); }

async function sendMail({ to, subject, html, text }) {
  if (!to) throw new Error('sendMail: "to" je povinné');
  await verifyOnce();
  const fromPretty = `${APP_NAME} <${user}>`; // musí = SMTP_USER kvôli SPF/DMARC
  const info = await transporter.sendMail({
    from: fromPretty,
    to,
    subject,
    text: text || (html ? stripHtml(html) : ''),
    html,
  });
  console.log('✉️ Message sent:', info.messageId, 'to', to);
  return info;
}

// --------- TEMPLATES ---------
function signupTemplate() {
  const subject = `Vitajte v ${APP_NAME}! Dokončite profil`;
  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0c1f4b">
    <h2>Vitajte v ${escapeHtml(APP_NAME)} 👋</h2>
    <p>Účet bol vytvorený úspešne.</p>
    <p><strong>Posledný krok:</strong> po prihlásení si v aplikácii zvoľte prezývku.
       Bez prezývky nie je možné pridávať príspevky a komentáre.</p>
    <p style="margin:20px 0">
      <a href="${escapeAttr(APP_URL)}" style="display:inline-block;background:#ffe37a;color:#493a00;font-weight:700;text-decoration:none;padding:10px 16px;border-radius:10px;border:1px solid #ffd34d">
        Otvoriť aplikáciu
      </a>
    </p>
    <p style="font-size:12px;color:#64748b">Odoslané z ${escapeHtml(user)} (no-reply). Neodpovedajte.</p>
  </div>`;
  return { subject, html };
}

// verejné API
async function sendSignupEmail(toEmail) {
  const { subject, html } = signupTemplate();
  return sendMail({ to: toEmail, subject, html });
}

// alias kvôli kompatibilite so starými volaniami
async function sendWelcomeEmail(toEmail) {
  return sendSignupEmail(toEmail);
}

module.exports = {
  sendMail,
  sendSignupEmail,
  sendWelcomeEmail,
};
