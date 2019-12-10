var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var ProductSchema = new Schema({
  name: { type: String, required: true },
  cost: { type: Number, required: true },
  description: String,
  image1: String,
  image2: String,
  image3: String
});

module.exports = mongoose.model("Product", ProductSchema);
