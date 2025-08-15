// index.js (KOREŇ PROJEKTU) — rev: no-frontend-v1
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

console.log('BOOT FILE:', __filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/__whoami', (_req, res) => {
  res.json({ rev: 'no-frontend-v1', file: __filename, dir: __dirname, ts: new Date().toISOString() });
});

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('❌ Chýba MONGO_URI'); process.exit(1); }
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => { console.error('❌ MongoDB error:', err?.message || err); process.exit(1); });

app.get('/health/db', async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(500).json({ status:'fail', error:'DB not connected' });
    await mongoose.connection.db.admin().ping();
    res.json({ status:'ok', db: mongoose.connection.name, host: mongoose.connection.host });
  } catch(e){ res.status(500).json({ status:'fail', error: e.message }); }
});

app.use('/uploads', express.static(path.join(__dirname, 'backend', 'uploads')));

// bezpečné mountovanie rout
const mounted = {};
function mount(file, mountPath){
  try { app.use(mountPath, require(file)); mounted[mountPath]=true; console.log(`✅ mounted ${mountPath}`); }
  catch(e){ console.warn(`⚠️ skipping ${mountPath} → ${e.message}`); }
}
mount('./backend/routes/userRoutes', '/api/users');
mount('./backend/routes/documentRoutes', '/api/categories'); // tvoje pôvodné mapovanie
mount('./backend/routes/adminRoutes', '/api/admin');
mount('./backend/routes/productRoutes', '/api/products');
mount('./backend/routes/orderRoutes', '/api/orders');
mount('./backend/routes/timelineRoutes', '/api/timeline');
mount('./backend/routes/ratingRoutes', '/api/ratings');
mount('./backend/routes/presenceRoutes', '/api/presence');
mount('./backend/routes/bannerRoutes', '/api/banners');
mount('./backend/routes/timelineAdminRoutes', '/api/admin/timeline');
mount('./backend/routes/messageRoutes', '/api/messages');

// fallback pre /api/products, ak sa route nenamountovala
if (!mounted['/api/products']) {
  app.get('/api/products', async (_req, res) => {
    try {
      const items = await mongoose.connection.db.collection('products').find({}).limit(50).toArray();
      res.json(items);
    } catch(e){ res.status(500).json({ error: e.message }); }
  });
  console.log('ℹ️ using fallback /api/products');
}

// žiadny frontend z tohto servera
app.get('/', (_req, res) => res.status(200).send('<h1>API OK</h1><p>Frontend sa z tohto servera neservuje.</p>'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server beží na porte ${PORT}`));
