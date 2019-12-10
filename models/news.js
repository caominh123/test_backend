var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var NewsSchema = new Schema({
  name: { type: String, required: true },
  content: { type: String, required: true },
  image: { type: String, required: true }
});

module.exports = mongoose.model("News", NewsSchema);
