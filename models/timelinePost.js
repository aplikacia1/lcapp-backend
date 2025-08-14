const mongoose = require('mongoose');

const timelinePostSchema = new mongoose.Schema({
  author: {
    type: String,
    required: true
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
  comments: [{
    author: String,
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
