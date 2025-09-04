// backend/index.js

// ✅ Načítaj .env priamo z priečinka backend (nie z pracovného diru)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

/* --- Middleware --- */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // musí byť pred routami

/* --- Diagnostiky --- */
app.get('/__whoami', (_req, res) => {
  res.json({ file: __filename, dir: __dirname, ts: new Date().toISOString() });
});
app.get('/health/db', (_req, res) => res.send('Test OK'));
app.get('/debug/db', (_req, res) => {
  const c = mongoose.connection;
  res.json({ state: c.readyState, db: c.name || null, host: c.host || null });
});

/* --- Statické súbory (HTML/CSS/JS + UPLOADS) --- */
app.use(express.static(path.join(__dirname, 'public')));              // / -> backend/public
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // /uploads -> backend/uploads
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

/* --- Helper na mount rout --- */
function mountRoute(url, modPath) {
  try {
    const r = require(modPath);
    app.use(url, r);
    console.log(`✅ route ${url} -> ${modPath}`);
  } catch (e) {
    console.warn(`⚠️  preskakujem ${url}: ${modPath} – ${e.message}`);
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

/* --- Štart až po úspešnom Mongo pripojení --- */
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ Chýba MONGO_URI v .env');
  process.exit(1);
}

// (voliteľne) krátky log na kontrolu ADMIN_EMAIL
console.log('ADMIN_EMAIL =', process.env.ADMIN_EMAIL || '(empty)');

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('🟢 MongoDB connected to DB:', mongoose.connection.name);
    app.listen(PORT, () => console.log(`🚀 Server beží na porte ${PORT}`));
  })
  .catch(err => {
    console.error('🔴 MongoDB error:', err?.message || err);
    process.exit(1);
  });
