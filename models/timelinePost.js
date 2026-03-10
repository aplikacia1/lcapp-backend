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

  // 🆕 nový typ príspevku
  isQuestion: {
    type: Boolean,
    default: false
  },

  // 🆕 prijatá odpoveď (comment ID)
  acceptedAnswer: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },

  // 🆕 sledovatelia diskusie
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
    }
  }],

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model('TimelinePost', timelinePostSchema);