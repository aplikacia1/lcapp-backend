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

/* ===================== ŠABLÓNY ===================== */

function signupTemplate(/* toEmail */) {
  const app = String(APP_URL || '').replace(/\/+$/, '');
  const logoUrl = `${app}/icons/icon-512.png`;

  const subject   = `Vitaj v ${APP_NAME}!`;
  const preheader = 'Po prihlásení si zvoľ prezývku a máš hotovo.';

  const html = `
  <div style="background:#0c1f4b;padding:24px 0;">
    <div style="max-width:560px;margin:0 auto;background:#0b1a3a;border-radius:16px;overflow:hidden;border:1px solid #16336b;font-family:Arial,sans-serif;">
      <!-- preheader (skryté) -->
      <span style="display:none;max-height:0;max-width:0;opacity:0;overflow:hidden">${preheader}</span>

      <!-- hlavička s logom -->
      <div style="text-align:center;padding:24px 24px 8px;background:#0c1f4b;">
        <img src="${escapeAttr(logoUrl)}" alt="Lištové centrum" width="96" height="96" style="display:block;margin:0 auto 12px;border-radius:12px" />
        <h1 style="margin:0;color:#ffffff;font-size:22px;line-height:1.35">${escapeHtml(APP_NAME)}</h1>
      </div>

      <!-- obsah -->
      <div style="padding:16px 24px;background:#0c1f4b;color:#cfe2ff;line-height:1.55">
        <p style="margin:0 0 12px">Vitaj v <strong>Lištobooku</strong> 👋</p>
        <p style="margin:0 0 12px">
          Lištobook je <strong>komunitná mini-sieť</strong> pre majstrov a kutilov z Lištového centra.
          Zdieľaj fotky práce, pýtaj sa na rady, <strong>hodnoť materiály a výrobky</strong> a píš krátke recenzie.
        </p>

        <p style="margin:16px 0 8px;"><strong>Čo treba urobiť po prihlásení:</strong></p>
        <ol style="margin:0 0 16px;padding-left:18px">
          <li>Zvoľ si <strong>prezývku</strong> (bez nej nejde pridávať príspevky a komentáre).</li>
          <li>(Voliteľné) vyplň <strong>mesto</strong> a nastav <strong>newsletter</strong>.</li>
          <li>Hotovo — môžeš hodnotiť a písať príspevky.</li>
        </ol>

        <p style="margin:16px 0 0;font-size:13px;color:#9ab6e8">
          <strong>Kontakt na Lištové centrum:</strong>
          <a href="mailto:bratislava@listovecentrum.sk" style="color:#9ab6e8;text-decoration:underline">bratislava@listovecentrum.sk</a>
          • <a href="tel:+421947922181" style="color:#9ab6e8;text-decoration:underline">0947&nbsp;922&nbsp;181</a><br>
          <strong>Info:</strong>
          <a href="mailto:info@listovecentrum.sk" style="color:#9ab6e8;text-decoration:underline">info@listovecentrum.sk</a>
          • <a href="tel:+421915810350" style="color:#9ab6e8;text-decoration:underline">0915&nbsp;810&nbsp;350</a>
        </p>
      </div>

      <!-- pätička -->
      <div style="padding:12px 16px;background:#081433;color:#8aa4d6;font-size:12px;text-align:center;border-top:1px solid #16336b">
        Odoslané z ${escapeHtml(user)} (no-reply). Neodpovedajte.<br/>
        Lištobook.sk by LIŠTOVÉ CENTRUM EU, s.r.o., © Sasinkova 13, 010&nbsp;01 Žilina
      </div>
    </div>
  </div>`;
  return { subject, html };
}

/* ===================== VEREJNÉ API ===================== */

async function sendSignupEmail(toEmail) {
  const { subject, html } = signupTemplate(toEmail);
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
