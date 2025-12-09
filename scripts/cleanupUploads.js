// scripts/cleanupUploads.js
// Bezpečný "dry-run" cleanup súborov v ./uploads/ podľa toho, čo je REFERENCOVANÉ v DB.
// Použitie:
//   node scripts/cleanupUploads.js            -> dry-run (iba vypíše)
//   node scripts/cleanupUploads.js --apply    -> reálne zmaže neodkazované súbory

/* --- Konfigurácia kolekcií a polí: uprav ak máš iné názvy --- */
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads';

// Kolekcie a polia, kde sa v DB môžu nachádzať názvy súborov z uploads/
const COLLECTIONS = [
  // Timeline – obrázky v príspevkoch/komentoch
  { name: 'timelineposts', fieldPaths: ['images'] }, // images: [ "175...-obr.jpg", ... ]

  // Produkty – hlavný obrázok produktu alebo galéria
  { name: 'products', fieldPaths: ['image', 'images'] },
];

// Ak používaš iné kolekcie (avatars, messages attachments...), pridaj sem:
// { name: 'users', fieldPaths: ['avatar'] },
// { name: 'messages', fieldPaths: ['attachments'] },
///////////////////////////////////////////////////////////////

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const isApply = process.argv.includes('--apply');

function collectFromDoc(doc, pathExpr) {
  // pathExpr môže byť "image" alebo "images"
  const val = pathExpr.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), doc);
  if (!val) return [];

  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === 'string') return [val];
  return [];
}

async function main() {
  if (!MONGO_URI) {
    console.error('❌ Chýba MONGO_URI/MONGODB_URI v env.');
    process.exit(1);
  }

  if (!fs.existsSync(UPLOADS_DIR)) {
    console.error(`❌ Neexistuje priečinok ${UPLOADS_DIR}`);
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI, {});

  // dynamické načítanie všetkých kolekcií podľa názvov (bez Mongoose modelov)
  const db = mongoose.connection.db;

  const referenced = new Set();

  for (const cfg of COLLECTIONS) {
    const exists = (await db.listCollections({ name: cfg.name }).toArray()).length > 0;
    if (!exists) {
      console.warn(`(i) Kolekcia "${cfg.name}" neexistuje – preskakujem.`);
      continue;
    }

    const docs = await db.collection(cfg.name).find({}, { projection: cfg.fieldPaths.reduce((p, f) => (p[f] = 1, p), {}) }).toArray();

    for (const doc of docs) {
      for (const fp of cfg.fieldPaths) {
        for (const item of collectFromDoc(doc, fp)) {
          // Ukladáme len samotný názov súboru (bez cesty)
          const base = path.basename(item);
          referenced.add(base);
        }
      }
    }
  }

  // Obsah priečinka uploads
  const allUploads = fs.readdirSync(UPLOADS_DIR).filter(f => {
    const full = path.join(UPLOADS_DIR, f);
    return fs.statSync(full).isFile();
  });

  // Kandidáti na zmazanie – nie sú v DB referenciách
  const toDelete = allUploads.filter(f => !referenced.has(f));

  console.log('📦 Nájdené súbory v uploads:', allUploads.length);
  console.log('🔗 Referencované v DB:', referenced.size);
  console.log('🗑️  Kandidáti na zmazanie:', toDelete.length);

  if (toDelete.length) {
    console.log('\nZoznam kandidátov:');
    toDelete.forEach(f => console.log(' -', f));
  }

  if (!isApply) {
    console.log('\nDry-run režim. Nič sa nemaže. Spusť s --apply pre reálne zmazanie.');
  } else {
    console.log('\nMazanie...');
    for (const f of toDelete) {
      const full = path.join(UPLOADS_DIR, f);
      try {
        fs.unlinkSync(full);
        console.log(' ✅ zmazané:', f);
      } catch (e) {
        console.error(' ❌ nepodarilo sa zmazať:', f, e.message);
      }
    }
    console.log('\nHotovo.');
  }

  await mongoose.disconnect();
}

main().catch(e => {
  console.error('Chyba:', e);
  process.exit(1);
});
