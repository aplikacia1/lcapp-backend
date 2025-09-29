// backend/index.js
require('dotenv').config();

/* ===== DOČASNÁ DIAGNOSTIKA SMTP ENV (po vyriešení pokojne zmaž) ===== */
(function () {
  try {
    const u = process.env.SMTP_USER || '';
    const p = process.env.SMTP_PASS || '';
    const host = process.env.SMTP_HOST || '';
    const port = process.env.SMTP_PORT || '';
    const secure = process.env.SMTP_SECURE || '';
    const authMethod = (process.env.SMTP_AUTH_METHOD || '(unset)').toString();

    const passLen = p.length;
    const tailHex = Buffer.from(p).toString('hex').slice(-8); // posledné 4 bajty v HEX

    console.log(
      '[BOOT SMTP ENV]',
      'user=', JSON.stringify(u),
      'passLen=', passLen,
      'tailHex=', tailHex,
      'host=', host,
      'port=', port,
      'secure=', secure,
      'authMethod=', authMethod
    );
  } catch (e) {
    console.warn('SMTP env debug failed:', e?.message || e);
  }
})();
/* ==================================================================== */

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');

const app = express();

/* --- Základ --- */
app.set('trust proxy', 1); // Render/reverse proxy

const IS_PROD = process.env.NODE_ENV === 'production';
const PROD_DOMAIN = 'listobook.sk';

// povolené originy pre CORS
const ALLOWED_ORIGINS = [
  process.env.APP_URL,
  'http://localhost:3000',
  'https://lcapp-backend.onrender.com',
  'https://listobook.sk',
  'https://www.listobook.sk'
].filter(Boolean);

// presmeruj www -> apex (iba v produkcii)
app.use((req, res, next) => {
  if (!IS_PROD) return next();
  const host = req.headers.host;
  if (host === `www.${PROD_DOMAIN}`) {
    return res.redirect(301, `https://${PROD_DOMAIN}${req.originalUrl}`);
  }
  next();
});

// vynúť HTTPS (iba v produkcii)
app.use((req, res, next) => {
  if (!IS_PROD) return next();
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') return next();
  return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
});

// HSTS (iba v produkcii)
app.use((req, res, next) => {
  if (IS_PROD) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  next();
});

// CORS
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* --- Diagnostiky --- */
app.get('/__whoami', (_req, res) => {
  res.json({ file: __filename, dir: __dirname, ts: new Date().toISOString() });
});
app.get('/health/db', (_req, res) => res.send('Test OK'));
app.get('/debug/db', (_req, res) => {
  const c = mongoose.connection;
  res.json({ state: c.readyState, db: c.name || null, host: c.host || null });
});

/* --- Statika / Uploads --- */
const uploadsDir =
  process.env.UPLOADS_DIR ||
  (IS_PROD ? '/var/data/listobook/uploads' : path.join(__dirname, 'uploads'));

fs.mkdirSync(uploadsDir, { recursive: true });

// sprístupni cestu uploadov aj do routerov
app.set('UPLOADS_DIR', uploadsDir);

// public (HTML/JS/CSS)
app.use(express.static(path.join(__dirname, 'public')));

// /uploads: primárne persistent disk, potom fallbacky pre staré umiestnenia
app.use('/uploads', express.static(uploadsDir, { fallthrough: true }));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'), { fallthrough: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// landing
app.get('/', (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

/* --- Helper na mount rout --- */
function mountRoute(url, modPath) {
  try {
    const r = require(modPath);
    app.use(url, r);
    console.log(`✅ route ${url} -> ${modPath}`);
  } catch (e) {
    console.warn(`⚠️ preskakujem ${url}: ${modPath} – ${e.message}`);
  }
}

/* --- API routes --- */
mountRoute('/api/auth',           './routes/authRoutes');
mountRoute('/api/password',       './routes/passwordRoutes');
mountRoute('/api/admin',          './routes/adminRoutes');
mountRoute('/api/users',          './routes/userRoutes');
mountRoute('/api/categories',     './routes/categoryRoutes');
mountRoute('/api/products',       './routes/productRoutes');
mountRoute('/api/orders',         './routes/orderRoutes');
mountRoute('/api/timeline',       './routes/timelineRoutes');
mountRoute('/api/ratings',        './routes/ratingRoutes');
mountRoute('/api/presence',       './routes/presenceRoutes');
mountRoute('/api/banners',        './routes/bannerRoutes');
mountRoute('/api/admin/timeline', './routes/timelineAdminRoutes');
mountRoute('/api/messages',       './routes/messageRoutes');
mountRoute('/api/push',           './routes/pushRoutes');
mountRoute('/api/uploads',        './routes/uploadRoutes'); // ping/debug

/* --- Štart po DB --- */
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ Chýba MONGO_URI v .env');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('🟢 MongoDB connected to DB:', mongoose.connection.name);
    app.listen(PORT, () => console.log(`🚀 Server beží na porte ${PORT}`));
  })
  .catch(err => {
    console.error('🔴 MongoDB error:', err?.message || err);
    process.exit(1);
  });
