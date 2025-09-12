// backend/index.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');

const app = express();

/* --- Základ --- */
app.set('trust proxy', 1); // Render/reverse proxy

// NEW: produkčná doména (na presmerovanie www -> apex)
const PROD_DOMAIN = 'listobook.sk';

// NEW: povolené originy pre CORS
const ALLOWED_ORIGINS = [
  process.env.APP_URL,                  // napr. https://lcapp-backend.onrender.com z .env (ak máš)
  'http://localhost:3000',
  'https://lcapp-backend.onrender.com',
  'https://listobook.sk',
  'https://www.listobook.sk'
].filter(Boolean);

// NEW: presmeruj www -> apex (napr. www.listobook.sk -> listobook.sk)
app.use((req, res, next) => {
  const host = req.headers.host;
  if (host === `www.${PROD_DOMAIN}`) {
    return res.redirect(301, `https://${PROD_DOMAIN}${req.originalUrl}`);
  }
  next();
});

// NEW: vynúť HTTPS (za proxy na Renderi)
app.use((req, res, next) => {
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') return next();
  return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
});

// NEW: HSTS pre lepšie zabezpečenie
app.use((req, res, next) => {
  res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  next();
});

// CORS (používaš ho už teraz – len doplnené originy vyššie)
app.use(cors({
  origin: (origin, cb) => {
    // povol aj nástroje bez Origin hlavičky (curl, healthchecky)
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

/* --- Statika --- */
const uploadsDir = process.env.UPLOADS_DIR || '/var/data/listobook/uploads';
fs.mkdirSync(uploadsDir, { recursive: true });

app.use(express.static(path.join(__dirname, 'public')));

// publikujeme PERSISTENT disk na URL /uploads
app.use('/uploads', express.static(uploadsDir));

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
mountRoute('/api/uploads',       './routes/uploadRoutes');

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
