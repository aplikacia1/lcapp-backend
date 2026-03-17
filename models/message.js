// models/message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    fromEmail: { type: String, required: true, index: true },
    fromName:  { type: String, default: '' },

    toEmail:   { type: String, required: true, index: true },
    toName:    { type: String, default: '' },

    text:      { type: String, required: true },

    isAuto:    { type: Boolean, default: false },

    isRead:    { type: Boolean, default: false, index: true },
    readAt:    { type: Date }
  },
  { timestamps: true, collection: 'messages' }
);

messageSchema.index({ toEmail: 1, isRead: 1, createdAt: -1 });

// 🔥 lifecycle index
messageSchema.index({ createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);