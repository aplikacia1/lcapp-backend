require('dotenv').config();
const { MongoClient } = require('mongodb');

const URI = process.env.MONGO_URI;
const DB  = 'lcapp';

(async () => {
  if (!URI) {
    console.error('❌ MONGO_URI chýba v .env');
    process.exit(1);
  }
  const client = new MongoClient(URI, { ignoreUndefined: true });
  try {
    await client.connect();
    const col = client.db(DB).collection('categories');

    const docs = await col.find({ $or: [
      { 'obrázok': { $exists: true } },
      { 'vytvorené v čase': { $exists: true } },
      { 'aktualizované v čase': { $exists: true } }
    ]}).toArray();

    let fixed = 0;
    for (const d of docs) {
      const set = {};
      const unset = {};

      if (d['obrázok'] && !d.image) { set.image = d['obrázok']; unset['obrázok'] = ''; }
      if (d['vytvorené v čase'] && !d.createdAt) { set.createdAt = new Date(d['vytvorené v čase']); unset['vytvorené v čase'] = ''; }
      if (d['aktualizované v čase'] && !d.updatedAt) { set.updatedAt = new Date(d['aktualizované v čase']); unset['aktualizované v čase'] = ''; }

      if (Object.keys(set).length || Object.keys(unset).length) {
        await col.updateOne({ _id: d._id }, {
          ...(Object.keys(set).length ? {$set:set} : {}),
          ...(Object.keys(unset).length ? {$unset:unset} : {})
        });
        fixed++;
      }
    }
    console.log(`✅ Upravené dokumenty: ${fixed}`);
  } catch (e) {
    console.error('❌ Chyba:', e);
  } finally {
    await client.close();
  }
})();
