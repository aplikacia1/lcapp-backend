const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  image: { type: String }, // obrázok produktu (voliteľné)
});

const orderSchema = new mongoose.Schema({
  items: [orderItemSchema],
  status: {
    type: String,
    enum: ["new", "in_progress", "completed"],
    default: "new",
  },
  customerEmail: { type: String, required: true },
  note: { type: String },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Order", orderSchema);
