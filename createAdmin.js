// backend/createAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const Admin = require('./models/adminModel'); // správna cesta

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existing = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
    if (existing) {
      console.log('✅ Admin už existuje.');
      return process.exit();
    }

    const password = 'admin123'; // predvolené heslo
    const passwordHash = await bcrypt.hash(password, 10);

    const admin = new Admin({
      email: process.env.ADMIN_EMAIL,
      passwordHash
    });

    await admin.save();
    console.log('✅ Admin úspešne vytvorený.');
    process.exit();
  } catch (err) {
    console.error('❌ Chyba pri vytváraní admina:', err);
    process.exit(1);
  }
}

createAdmin();
