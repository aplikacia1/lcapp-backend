const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String }, // cesta k obrázku v /uploads
});

module.exports = mongoose.model("Category", categorySchema);
