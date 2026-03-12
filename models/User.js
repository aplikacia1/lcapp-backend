const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },

    // verejné údaje profilu
    name: { type: String, default: '' },
    nameLower: { type: String, default: null },
    note: { type: String, default: '' },

    // rozšírený profil
    avatarUrl: { type: String, default: '' },
    fullName: { type: String, default: '' },
    bio: { type: String, default: '' },
    companyName: { type: String, default: '' },
    companyICO: { type: String, default: '' },
    companyDIC: { type: String, default: '' },
    companyICDPH: { type: String, default: '' },
    web: { type: String, default: '' },
    instagram: { type: String, default: '' },

    role: { type: String, default: 'user' },

    newsletter: { type: Boolean, default: false },

    profileWelcomeSentAt: { type: Date, default: null },

    lastSeen: { type: Date, default: Date.now },

    // Reset hesla
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },

    // =========================
    // PIN LOGIN
    // =========================
    pinHash: { type: String, default: null },
    pinEnabled: { type: Boolean, default: false },
    pinChangedAt: { type: Date, default: null },

    // =========================
    // MIKROKOMUNITY
    // =========================
    blockedUsers: { type: [String], default: [] },
    friends: { type: [String], default: [] }
  },
  { timestamps: true }
);

// Jedinečnosť prezývky len keď je vyplnená
userSchema.index(
  { nameLower: 1 },
  { unique: true, partialFilterExpression: { nameLower: { $type: 'string' } } }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);