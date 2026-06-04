const mongoose = require("mongoose");

const transferInSchema = new mongoose.Schema({

  warehouse: String,

  documentNumber: String,

  sourceWarehouse: String,

  externalDocument: String,

  createdAt: Date,

  items: [

    {
      productCode: String,
      productName: String,
      qty: Number
    }

  ]

});

module.exports = mongoose.model(
  "TransferIn",
  transferInSchema
);