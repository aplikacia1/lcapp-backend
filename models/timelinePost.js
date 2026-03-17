const mongoose = require('mongoose');

const timelinePostSchema = new mongoose.Schema({
  author: {
    type: String,
    required: true
  },

  authorCompany: {
    type: String,
    default: ''
  },

  text: {
    type: String,
    required: false
  },

  imageUrl: {
    type: String,
    required: false
  },

  reactions: {
    fire: { type: Number, default: 0 },
    devil: { type: Number, default: 0 },
    heart: { type: Number, default: 0 }
  },

  isQuestion: {
    type: Boolean,
    default: false
  },

  acceptedAnswer: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },

  watchers: [{
    type: String
  }],

  comments: [{
    author: String,

    authorCompany: {
      type: String,
      default: ''
    },

    text: String,

    createdAt: {
      type: Date,
      default: Date.now
    },

    lastActivityAt: {
      type: Date,
      default: Date.now
    }
  }],

  createdAt: {
    type: Date,
    default: Date.now
  },

  lastActivityAt: {
    type: Date,
    default: Date.now
  }
});

// 🔥 dôležitý index pre lifecycle mazanie
timelinePostSchema.index({ lastActivityAt: 1 });

module.exports = mongoose.model('TimelinePost', timelinePostSchema);