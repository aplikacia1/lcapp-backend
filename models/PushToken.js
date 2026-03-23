const mongoose = require("mongoose");

const pushTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  email: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("PushToken", pushTokenSchema);