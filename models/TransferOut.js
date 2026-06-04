const mongoose = require("mongoose");

const transferOutSchema = new mongoose.Schema({

  warehouse: String,

  documentNumber: String,

  targetWarehouse: String,

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
  "TransferOut",
  transferOutSchema
);