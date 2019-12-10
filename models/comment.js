var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var CommentSchema = new Schema({
  productId: { type: String, required: true },
  email: { type: String, required: true },
  senderName: { type: String, required: true },
  senderTime: { type: Date, default: Date.now },
  content: { type: String, required: true },
  feedback: String
});

module.exports = mongoose.model("Comment", CommentSchema);
