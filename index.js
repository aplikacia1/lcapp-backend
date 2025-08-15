// index.js (KOREŇ PROJEKTU)
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

console.log('BOOT FILE:', __filename);

const app = express();

/* --- Middleware --- */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* --- Diagnostika --- */
app.get('/__whoami', (_req, res) => {
  res.json({ file: __filename, dir: __dirname, ts: new Date().toISOString() });
});

/* --- MongoDB --- */
const MONGO_URI = process.env.MONGO_URI; // odporúčam aby končilo .../test?...
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

/* --- Health check (ping + počty) --- */
app.get('/health/db', async (_req, res) => {
  try {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      return res.status(500).json({ status: 'fail', error: 'DB not connected' });
    }
    const admin = mongoose.connection.db.admin();
    await admin.ping();

    const sampleCounts = {};
    const tryCount = async (name) => {
      try { sampleCounts[name] = await mongoose.connection.db.collection(name).countDocuments(); }
      catch {}
    };
    await Promise.all([
      tryCount('users'),
      tryCount('products'),
      tryCount('categories'),
      tryCount('timelineposts'),
      tryCount('ratings'),
      tryCount('orders'),
    ]);

    res.json({ status: 'ok', host: mongoose.connection.host, db: mongoose.connection.name, sampleCounts });
  } catch (e) {
    res.status(500).json({ status: 'fail', error: e.message });
  }
});

/* --- KTORÝ FRONTEND SLOŽKA EXISTUJE? --- */
const frontFromFrontend = path.join(__dirname, 'frontend', 'public');
const frontFromBackend  = path.join(__dirname, 'backend', 'public');
const publicDir = fs.existsSync(frontFromFrontend) ? frontFromFrontend : frontFromBackend;
console.log('Serving static from:', publicDir);
app.use(express.static(publicDir));

/* --- API routy: montujeme každú zvlášť (aby jedna chybná nezastavila ostatné) --- */
const mounted = {};
function tryMount(filePath, mountPath) {
  try {
    const router = require(filePath);
    app.use(mountPath, router);
    mounted[mountPath] = true;
    console.log(`✅ mounted ${mountPath} from ${filePath}`);
  } catch (e) {
    console.warn(`⚠️ skipping ${mountPath} (${filePath}) → ${e.message}`);
  }
}

// cesty pre súbory v backend/routes/...
tryMount('./backend/routes/userRoutes', '/api/users');
tryMount('./backend/routes/documentRoutes', '/api/categories'); // tvoj „documentRoutes“ bol na /api/categories
tryMount('./backend/routes/adminRoutes', '/api/admin');
tryMount('./backend/routes/productRoutes', '/api/products');
tryMount('./backend/routes/orderRoutes', '/api/orders');
tryMount('./backend/routes/timelineRoutes', '/api/timeline');
tryMount('./backend/routes/ratingRoutes', '/api/ratings');
tryMount('./backend/routes/presenceRoutes', '/api/presence');
tryMount('./backend/routes/bannerRoutes', '/api/banners');
tryMount('./backend/routes/timelineAdminRoutes', '/api/admin/timeline');
tryMount('./backend/routes/messageRoutes', '/api/messages');

/* --- Fallback pre /api/products, ak sa route nenamountovala --- */
if (!mounted['/api/products']) {
  app.get('/api/products', async (_req, res) => {
    try {
      const items = await mongoose.connection.db.collection('products').find({}).limit(50).toArray();
      res.json(items);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  console.log('ℹ️ using fallback /api/products (no productRoutes mounted)');
}

/* Root – ak index.html chýba, nepadne to */
app.get('/', (_req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  res.status(200).send('<h1>Backend OK</h1><p>Chýba <code>frontend/public/index.html</code> alebo <code>backend/public/index.html</code>.</p>');
});

/* --- Štart servera --- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server beží na porte ${PORT}`);
});
