// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email:    { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },

    // verejné údaje profilu
    name:      { type: String, default: '' },        // prezývka (zobrazujeme)
    nameLower: { type: String, default: null },      // normalizované meno na jedinečnosť
    note:      { type: String, default: '' },        // mesto

    // rozšírený profil (nové polia)
    avatarUrl:   { type: String, default: '' },
    fullName:    { type: String, default: '' },
    bio:         { type: String, default: '' },
    companyName: { type: String, default: '' },
    companyICO:  { type: String, default: '' },
    companyDIC:  { type: String, default: '' },
    companyICDPH:{ type: String, default: '' },
    web:         { type: String, default: '' },
    instagram:   { type: String, default: '' },

    role: { type: String, default: 'user' },

    // newsletter – voliteľný súhlas používateľa
    newsletter: { type: Boolean, default: false },

    // ➕ bude vyplnené po prvom úspešnom odoslaní uvítacieho e-mailu
    profileWelcomeSentAt: { type: Date, default: null },

    // pre online stav (panel používateľov)
    lastSeen:  { type: Date, default: Date.now },

    // --- Reset hesla ---
    resetPasswordToken:   { type: String, default: null },
    resetPasswordExpires: { type: Date,   default: null },
    passwordChangedAt:    { type: Date,   default: null },
  },
  { timestamps: true }
);

// Jedinečnosť prezývky len vtedy, keď je vyplnená
userSchema.index(
  { nameLower: 1 },
  { unique: true, partialFilterExpression: { nameLower: { $type: 'string' } } }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
