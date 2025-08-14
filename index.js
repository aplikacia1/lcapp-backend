// backend/index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const app = express();

// ---- Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- MongoDB
const MONGO_URI = process.env.MONGO_URI; // v .env to už máš pod týmto názvom
if (!MONGO_URI) {
  console.error('❌ Chýba MONGO_URI v environment variables');
  process.exit(1);
}
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB error:', err?.message || err);
    process.exit(1);
  });

// ---- Uploads (ponechávame ako máš)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---- API routy (ponechaj, ako to máš v routes/)
try {
  // Príklady – uprav podľa tvojich existujúcich súborov v backend/routes
  app.use('/api/admin', require('./routes/adminRoutes'));           // ak to takto máš
  app.use('/api/users', require('./routes/userRoutes'));            // ak to takto máš
  app.use('/api/categories', require('./routes/categoryRoutes'));   // ...
  app.use('/api/products', require('./routes/productRoutes'));
  app.use('/api/orders', require('./routes/orderRoutes'));
  app.use('/api/timeline', require('./routes/timelineRoutes'));
  app.use('/api/ratings', require('./routes/ratingRoutes'));
  app.use('/api/presence', require('./routes/presenceRoutes'));
  app.use('/api/banners', require('./routes/bannerRoutes'));
  app.use('/api/admin/timeline', require('./routes/timelineAdminRoutes'));
  app.use('/api/messages', require('./routes/messageRoutes'));
} catch (e) {
  console.warn('⚠️ Skontroluj názvy/umiestnenie súborov v backend/routes. Ak niektorý neexistuje, vyhoď alebo oprav import.');
}

// ---- Frontend (servovanie statických stránok)
// Toto je kľúčové: servujeme tvoje hotové HTML/CSS/JS z frontend/public
const publicDir = path.join(__dirname, '..', 'frontend', 'public');
app.use(express.static(publicDir));

// Voliteľne: root presmerujeme na index.html (alebo welcome.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// (Nechávame priestor na ďalšie explicitné stránky ak chceš:
//  Napr. app.get('/dashboard', (req,res)=>res.sendFile(path.join(publicDir,'dashboard.html')));
//  Ale nie je to nutné – súbory idú priamo podľa názvu: /dashboard.html, /timeline.html, ... )

// ---- Štart servera
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server beží na porte ${PORT}`);
});
