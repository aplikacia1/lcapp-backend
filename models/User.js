// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email:    { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },

    // verejné údaje profilu
    name:      { type: String, default: '' },        // prezývka (zobrazujeme)
    nameLower: { type: String, default: null },      // normalizované meno na jedinečnosť
    note:      { type: String, default: '' },
    role:      { type: String, default: 'user' },

    // ➕ bude vyplnené po prvom úspešnom odoslaní uvítacieho e-mailu
    profileWelcomeSentAt: { type: Date, default: null },

    // pre online stav (panel používateľov)
    lastSeen:  { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Jedinečnosť prezývky len vtedy, keď je vyplnená
userSchema.index(
  { nameLower: 1 },
  { unique: true, partialFilterExpression: { nameLower: { $type: 'string' } } }
);

// Použijeme existujúci model, ak už bol skompilovaný
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
