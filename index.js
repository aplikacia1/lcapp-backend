// index.js (KOREŇ REPA)
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

console.log('BOOT FILE:', __filename);

const app = express();

/* --- Middleware --- */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* --- Diagnostika --- */
app.get('/__whoami', (_req, res) =>
  res.json({ file: __filename, dir: __dirname, ts: new Date().toISOString() })
);
app.get('/health/db', (_req, res) => res.send('Test OK'));

/* --- MongoDB --- */
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ Chýba MONGO_URI v environment variables');
  process.exit(1);
}
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB error:', err?.message || err);
    process.exit(1);
  });

/* --- Statické súbory --- */
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // ak priečinok nebude, nič sa nedeje
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

/* --- API routy: teraz z ./routes, nie z ./backend/routes --- */
try {
  app.use('/api/admin', require('./routes/adminRoutes'));
  app.use('/api/users', require('./routes/userRoutes'));
  app.use('/api/categories', require('./routes/categoryRoutes'));   // ak súbor nemáš, dočasne zakomentuj
  app.use('/api/products', require('./routes/productRoutes'));       // ak sa súbor volá inak (napr. products.js), uprav import
  app.use('/api/orders', require('./routes/orderRoutes'));
  app.use('/api/timeline', require('./routes/timelineRoutes'));
  app.use('/api/ratings', require('./routes/ratingRoutes'));
  app.use('/api/presence', require('./routes/presenceRoutes'));
  app.use('/api/banners', require('./routes/bannerRoutes'));
  app.use('/api/admin/timeline', require('./routes/timelineAdminRoutes'));
  app.use('/api/messages', require('./routes/messageRoutes'));
} catch (e) {
  console.warn('⚠️ Skontroluj názvy súborov v ./routes. Ak niektorý neexistuje, premenuj import alebo ho dočasne vypni.');
}

/* --- Root -> index.html z public --- */
app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

/* --- Štart servera --- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server beží na porte ${PORT}`);
});
