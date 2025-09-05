// backend/index.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

/* --- Základ --- */
app.set('trust proxy', 1); // Render/reverse proxy
const ALLOWED_ORIGINS = [
  process.env.APP_URL,                 // napr. https://lcapp-backend.onrender.com
  'http://localhost:3000',
  'https://lcapp-backend.onrender.com'
].filter(Boolean);

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
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
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
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
