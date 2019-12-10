var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var Product = require("./product");

var OrderSchema = new Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  time: { type: Date, default: Date.now },
  phoneNumber: { type: String, required: true },
  listProduct: { type: Array, required: false },
  total: { type: String, required: true }
});

module.exports = mongoose.model("Order", OrderSchema);
// note : review get product
// use join ...map(id --> join table)
