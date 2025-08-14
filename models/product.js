const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  name: { type: String, required: true },
  image: { type: String },
  code: { type: String },
  price: { type: Number, required: true },
  unit: { type: String }, // napr. ks, m, m2
  description: { type: String }
});

module.exports = mongoose.model("Product", productSchema);
