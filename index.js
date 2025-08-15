// backend/index.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const app = express();

/* --- Middleware --- */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* --- Diagnostiky --- */
app.get('/__whoami', (_req, res) => {
  res.json({ file: __filename, dir: __dirname, ts: new Date().toISOString() });
});
app.get('/health/db', (_req, res) => res.send('Test OK'));
app.get('/debug/db', (_req, res) => {
  const c = mongoose.connection;
  res.json({ state: c.readyState, db: c.name || null, host: c.host || null });
});

/* --- Statické súbory --- */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const publicDir = path.join(__dirname, 'public'); // servujeme backend/public
app.use(express.static(publicDir));
app.get('/', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));

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
mountRoute('/api/admin',           './routes/adminRoutes');
mountRoute('/api/users',           './routes/userRoutes');
mountRoute('/api/categories',      './routes/categoryRoutes');
mountRoute('/api/products',        './routes/productRoutes');
mountRoute('/api/orders',          './routes/orderRoutes');
mountRoute('/api/timeline',        './routes/timelineRoutes');
mountRoute('/api/ratings',         './routes/ratingRoutes');
mountRoute('/api/presence',        './routes/presenceRoutes');
mountRoute('/api/banners',         './routes/bannerRoutes');
mountRoute('/api/admin/timeline',  './routes/timelineAdminRoutes');
mountRoute('/api/messages',        './routes/messageRoutes');

/* --- Štart až po úspešnom Mongo pripojení --- */
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
