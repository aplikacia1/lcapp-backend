// copy-test-to-lcapp.js
// npm i mongodb dotenv
require('dotenv').config();
const { MongoClient } = require('mongodb');

// vezme MONGO_ATLAS_URI alebo (ak chýba) MONGO_URI
// POZOR: tu má byť URI bez /db (len ...mongodb.net/?...)
const URI = process.env.MONGO_ATLAS_URI || process.env.MONGO_URI;

const SRC_DB  = 'test';
const DEST_DB = 'lcapp';

// kolekcie, ktoré chceme preniesť
const collections = [
  'admins',
  'banners',
  'categories',
  'documentcategories',
  'documentitems',
  'messages',
  'orders',
  'products',
  'ratings',
  'timelineposts',
  'users',
];

(async () => {
  if (!URI) {
    console.error('❌ Chýba MONGO_ATLAS_URI alebo MONGO_URI (bez /db) v .env!');
    process.exit(1);
  }

  const client = new MongoClient(URI, { ignoreUndefined: true });

  try {
    await client.connect();
    const src  = client.db(SRC_DB);
    const dest = client.db(DEST_DB);

    for (const name of collections) {
      const sCol = src.collection(name);
      const dCol = dest.collection(name);

      const docs = await sCol.find({}).toArray();
      console.log(`→ ${name}: ${docs.length} dokumentov`);

      // vyprázdni cieľ (ak existuje)
      try { await dCol.drop(); } catch (_) {}

      if (docs.length) {
        // zachová pôvodné _id
        await dCol.insertMany(docs, { ordered: false });
      }
    }

    console.log('✅ Hotovo: skopírované do DB', DEST_DB);
  } catch (e) {
    console.error('❌ Chyba pri kopírovaní:', e?.message || e);
  } finally {
    await client.close();
  }
})();
