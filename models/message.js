// models/message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    fromEmail: { type: String, required: true, index: true },
    fromName:  { type: String, default: '' },

    toEmail:   { type: String, required: true, index: true },
    toName:    { type: String, default: '' },

    text:      { type: String, required: true },

    // odlíšenie systémových (auto) odpovedí
    isAuto:    { type: Boolean, default: false },

    // === dôležité – stav prečítania, aby sedel s trasami ===
    isRead:    { type: Boolean, default: false, index: true },
    readAt:    { type: Date }
  },
  { timestamps: true, collection: 'messages' }
);

// rýchle rátanie neprečítaných pre adresáta
messageSchema.index({ toEmail: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
